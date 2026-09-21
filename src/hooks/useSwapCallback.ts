import { Contract } from '@ethersproject/contracts';
import { JSBI, Percent, Router, SwapParameters, Trade, TradeType } from '@intercroneswap/v2-sdk';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BIPS_BASE, INITIAL_ALLOWED_SLIPPAGE } from '../constants';
import { AppState } from '../state';
import { useTransactionAdder } from '../state/transactions/hooks';
import { getActiveSwapVersion } from '../swapVersion';
import { DEFAULT_FEE_LIMIT } from '../tron-config';
import { getRouterContract } from '../utils';
import isZero from '../utils/isZero';
import { useActiveWeb3React } from './index';

export enum SwapCallbackState {
  INVALID,
  LOADING,
  VALID,
}

interface SwapCall {
  contract: Contract;
  parameters: SwapParameters;
}

function callOptions(value: string | undefined, account: string): { value?: string; from: string } {
  return value && !isZero(value) ? { value, from: account } : { from: account };
}

function errorDetails(error: any): Record<string, unknown> {
  return {
    code: error?.code,
    reason: error?.reason,
    message: error?.message,
    data: error?.data,
    nestedCode: error?.error?.code,
    nestedReason: error?.error?.reason,
    nestedMessage: error?.error?.message,
    nestedData: error?.error?.data,
  };
}

function diagnosticValue(value: any): any {
  if (Array.isArray(value)) return value.map(diagnosticValue);
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && typeof value.toString === 'function') return value.toString();
  return value;
}

function swapErrorMessage(error: any): string {
  const reason =
    error?.reason ||
    error?.error?.reason ||
    error?.error?.message ||
    error?.data?.message ||
    error?.message ||
    'Unknown contract error';

  if (
    reason.includes('INSUFFICIENT_OUTPUT_AMOUNT') ||
    reason.includes('EXCESSIVE_INPUT_AMOUNT')
  ) {
    return 'The current pool price no longer satisfies the selected slippage. Refresh the quote or increase the slippage tolerance.';
  }

  return `The swap simulation failed: ${reason}`;
}

/**
 * Returns the swap calls that can be simulated and, after a successful
 * simulation, submitted to TronLink.
 */
function useSwapCallArguments(
  trade: Trade | undefined,
  allowedSlippage: number = INITIAL_ALLOWED_SLIPPAGE,
): SwapCall[] {
  const { account, chainId, library } = useActiveWeb3React();
  const ttl = useSelector<AppState, number>((state) => state.user.userDeadline);
  const recipient = account;

  return useMemo(() => {
    if (!trade || !recipient || !library || !account || !chainId || !ttl) return [];

    const contract: Contract | null = getRouterContract(chainId, library, account);
    if (!contract) return [];

    // Router.swapCallParameters expects a relative TTL and adds the current
    // timestamp itself. Passing an absolute deadline here produced deadlines
    // decades in the future.
    const standard = Router.swapCallParameters(trade, {
      feeOnTransfer: false,
      allowedSlippage: new Percent(JSBI.BigInt(allowedSlippage), BIPS_BASE),
      recipient,
      ttl,
    });

    const parameters: SwapParameters[] = [standard];

    // Only try the fee-on-transfer variant as a fallback. It is more expensive
    // and may fail late, after the pair swap has already consumed most energy.
    if (trade.tradeType === TradeType.EXACT_INPUT) {
      parameters.push(
        Router.swapCallParameters(trade, {
          feeOnTransfer: true,
          allowedSlippage: new Percent(JSBI.BigInt(allowedSlippage), BIPS_BASE),
          recipient,
          ttl,
        }),
      );
    }

    return parameters.map((swapParameters) => ({
      parameters: swapParameters,
      contract,
    }));
  }, [account, allowedSlippage, chainId, library, recipient, trade, ttl]);
}

export function useSwapCallback(
  trade: Trade | undefined,
  allowedSlippage: number = INITIAL_ALLOWED_SLIPPAGE,
): { state: SwapCallbackState; callback: null | (() => Promise<string>); error: string | null } {
  const { account, chainId, library } = useActiveWeb3React();
  const swapCalls = useSwapCallArguments(trade, allowedSlippage);
  const addTransaction = useTransactionAdder();
  const recipient = account;

  return useMemo(() => {
    if (!trade || !library || !account || !chainId) {
      return { state: SwapCallbackState.INVALID, callback: null, error: 'Missing dependencies' };
    }
    if (!recipient || swapCalls.length === 0) {
      return { state: SwapCallbackState.LOADING, callback: null, error: null };
    }

    if (getActiveSwapVersion() === 'v1' && trade.route.path.length !== 2) {
      return {
        state: SwapCallbackState.INVALID,
        callback: null,
        error: 'V1 only supports direct swaps. No direct V1 pool is available for this pair.',
      };
    }

    return {
      state: SwapCallbackState.VALID,
      callback: async function onSwap(): Promise<string> {
        let selectedCall: SwapCall | undefined;
        let simulationError: any;
        const simulationResults: Array<Record<string, unknown>> = [];
        const routerContract = swapCalls[0].contract;
        const route = trade.route.path.map((token) => token.address);
        const diagnostics = {
          version: getActiveSwapVersion(),
          account,
          router: routerContract.address,
          tradeType: trade.tradeType,
          inputSymbol: trade.inputAmount.currency.symbol,
          outputSymbol: trade.outputAmount.currency.symbol,
          inputRaw: trade.inputAmount.raw.toString(),
          expectedOutputRaw: trade.outputAmount.raw.toString(),
          route,
          pairs: trade.route.pairs.map((pair) => pair.liquidityToken.address),
          calls: swapCalls.map(({ parameters }) => ({
            methodName: parameters.methodName,
            args: diagnosticValue(parameters.args),
            value: parameters.value,
          })),
        };

        console.info('[ISwap swap diagnostics] Prepared trade', diagnostics);

        try {
          const routerQuote = await routerContract.callStatic.getAmountsOut(
            trade.inputAmount.raw.toString(),
            route,
            { from: account },
          );
          console.info(
            '[ISwap swap diagnostics] Router quote',
            diagnosticValue(routerQuote),
          );
        } catch (quoteError) {
          console.error(
            '[ISwap swap diagnostics] Router quote failed',
            errorDetails(quoteError),
          );
        }

        // Never open TronLink before the exact contract call has succeeded as a
        // read-only simulation. This prevents known reverts from burning TRX.
        for (const call of swapCalls) {
          const {
            contract,
            parameters: { methodName, args, value },
          } = call;

          try {
            await contract.callStatic[methodName](
              ...args,
              callOptions(value, account),
            );
            selectedCall = call;
            simulationResults.push({ methodName, success: true });
            console.info('[ISwap swap diagnostics] Simulation succeeded', {
              methodName,
            });
            break;
          } catch (error) {
            simulationError = error;
            const result = {
              methodName,
              success: false,
              error: errorDetails(error),
            };
            simulationResults.push(result);
            console.error('[ISwap swap diagnostics] Simulation failed', result);
          }
        }

        if (!selectedCall) {
          console.error('[ISwap swap diagnostics] All simulations failed', {
            diagnostics,
            simulationResults,
          });
          const methods = simulationResults
            .map((result) => `${result.methodName}: ${(result.error as any)?.reason || (result.error as any)?.nestedReason || (result.error as any)?.message || (result.error as any)?.nestedMessage || 'unknown error'}`)
            .join(' | ');
          throw new Error(`${swapErrorMessage(simulationError)} [${methods}]`);
        }

        const {
          contract,
          parameters: { methodName, args, value },
        } = selectedCall;

        try {
          const response: any = await contract[methodName](...args, {
            gasLimit: DEFAULT_FEE_LIMIT,
            ...callOptions(value, account),
          });

          const inputSymbol = trade.inputAmount.currency.symbol;
          const outputSymbol = trade.outputAmount.currency.symbol;
          const inputAmount = trade.inputAmount.toSignificant(3);
          const outputAmount = trade.outputAmount.toSignificant(3);
          addTransaction(response, {
            summary: `Swap ${inputAmount} ${inputSymbol} for ${outputAmount} ${outputSymbol}`,
          });
          return response.hash;
        } catch (error: any) {
          if (error?.code === 4001) {
            throw new Error('Transaction rejected.');
          }
          console.error('Swap failed', error, methodName, args, value);
          throw new Error(`Swap failed: ${error?.message || 'Unknown error'}`);
        }
      },
      error: null,
    };
  }, [trade, library, account, chainId, recipient, swapCalls, addTransaction]);
}

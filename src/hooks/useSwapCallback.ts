import { Contract } from '@ethersproject/contracts';
import { JSBI, Percent, Router, SwapParameters, Token, Trade, TradeType } from '@intercroneswap/v2-sdk';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BIPS_BASE, INITIAL_ALLOWED_SLIPPAGE } from '../constants';
import { ERC20_ABI } from '../constants/abis/erc20';
import ISWAP_PAIR_ABI from '../constants/abis/iswap-pair.json';
import { AppState } from '../state';
import { useTransactionAdder } from '../state/transactions/hooks';
import { getActiveSwapVersion } from '../swapVersion';
import { DEFAULT_FEE_LIMIT } from '../tron-config';
import { getContract, getRouterContract } from '../utils';
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

        if (trade.inputAmount.currency instanceof Token) {
          try {
            const inputToken = getContract(
              trade.inputAmount.currency.address,
              ERC20_ABI,
              library,
              account,
            );
            const [walletBalance, routerAllowance] = await Promise.all([
              inputToken.balanceOf(account),
              inputToken.allowance(account, routerContract.address),
            ]);
            console.info('[ISwap swap diagnostics] Input token state', {
              token: trade.inputAmount.currency.address,
              requiredRaw: trade.inputAmount.raw.toString(),
              walletBalanceRaw: walletBalance.toString(),
              routerAllowanceRaw: routerAllowance.toString(),
              balanceSufficient: walletBalance.gte(trade.inputAmount.raw.toString()),
              allowanceSufficient: routerAllowance.gte(trade.inputAmount.raw.toString()),
            });
          } catch (tokenStateError) {
            console.error(
              '[ISwap swap diagnostics] Input token state failed',
              errorDetails(tokenStateError),
            );
          }
        }

        for (const pair of trade.route.pairs) {
          const pairAddress = pair.liquidityToken.address;
          try {
            const pairContract = getContract(
              pairAddress,
              ISWAP_PAIR_ABI,
              library,
              account,
            );
            const [reserves, token0Address, token1Address] = await Promise.all([
              pairContract.getReserves(),
              pairContract.token0(),
              pairContract.token1(),
            ]);
            const token0Contract = getContract(token0Address, ERC20_ABI, library, account);
            const token1Contract = getContract(token1Address, ERC20_ABI, library, account);
            const [token0Balance, token1Balance] = await Promise.all([
              token0Contract.balanceOf(pairAddress),
              token1Contract.balanceOf(pairAddress),
            ]);
            const reserve0 = reserves.reserve0 ?? reserves[0];
            const reserve1 = reserves.reserve1 ?? reserves[1];
            console.info('[ISwap swap diagnostics] Pair state', {
              pair: pairAddress,
              token0: token0Address,
              token1: token1Address,
              reserve0Raw: reserve0.toString(),
              reserve1Raw: reserve1.toString(),
              token0BalanceRaw: token0Balance.toString(),
              token1BalanceRaw: token1Balance.toString(),
              token0BalanceCoversReserve: token0Balance.gte(reserve0),
              token1BalanceCoversReserve: token1Balance.gte(reserve1),
            });
          } catch (pairStateError) {
            console.error(
              '[ISwap swap diagnostics] Pair state failed',
              {
                pair: pairAddress,
                error: errorDetails(pairStateError),
              },
            );
          }
        }

        if (
          trade.inputAmount.currency instanceof Token &&
          trade.outputAmount.currency instanceof Token &&
          trade.route.pairs.length === 1
        ) {
          const pairAddress = trade.route.pairs[0].liquidityToken.address;
          const inputToken = getContract(
            trade.inputAmount.currency.address,
            ERC20_ABI,
            library,
            account,
          );
          const outputToken = getContract(
            trade.outputAmount.currency.address,
            ERC20_ABI,
            library,
            account,
          );

          try {
            const transferFromData = inputToken.interface.encodeFunctionData(
              'transferFrom',
              [account, pairAddress, trade.inputAmount.raw.toString()],
            );
            const transferFromResult = await library.call({
              to: inputToken.address,
              from: routerContract.address,
              data: transferFromData,
            });
            console.info(
              '[ISwap swap diagnostics] Isolated input transferFrom succeeded',
              {
                token: inputToken.address,
                from: account,
                spender: routerContract.address,
                to: pairAddress,
                amountRaw: trade.inputAmount.raw.toString(),
                result: diagnosticValue(
                  inputToken.interface.decodeFunctionResult(
                    'transferFrom',
                    transferFromResult,
                  ),
                ),
              },
            );
          } catch (inputTransferError) {
            console.error(
              '[ISwap swap diagnostics] Isolated input transferFrom failed',
              {
                token: inputToken.address,
                from: account,
                spender: routerContract.address,
                to: pairAddress,
                amountRaw: trade.inputAmount.raw.toString(),
                error: errorDetails(inputTransferError),
              },
            );
          }

          try {
            const outputTransferData = outputToken.interface.encodeFunctionData(
              'transfer',
              [account, trade.outputAmount.raw.toString()],
            );
            const outputTransferResult = await library.call({
              to: outputToken.address,
              from: pairAddress,
              data: outputTransferData,
            });
            console.info(
              '[ISwap swap diagnostics] Isolated output transfer succeeded',
              {
                token: outputToken.address,
                from: pairAddress,
                to: account,
                amountRaw: trade.outputAmount.raw.toString(),
                result: diagnosticValue(
                  outputToken.interface.decodeFunctionResult(
                    'transfer',
                    outputTransferResult,
                  ),
                ),
              },
            );
          } catch (outputTransferError) {
            console.error(
              '[ISwap swap diagnostics] Isolated output transfer failed',
              {
                token: outputToken.address,
                from: pairAddress,
                to: account,
                amountRaw: trade.outputAmount.raw.toString(),
                error: errorDetails(outputTransferError),
              },
            );
          }
        }

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

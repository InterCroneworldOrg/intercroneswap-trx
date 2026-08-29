import { MaxUint256 } from '@ethersproject/constants';
import { TransactionResponse } from '@ethersproject/providers';
import { Trade, TokenAmount, CurrencyAmount, ETHER } from '@intercroneswap/v2-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROUTER_ADDRESS } from '../constants';
import { useTokenAllowance } from '../data/Allowances';
import { Field } from '../state/swap/actions';
import { useTransactionAdder, useHasConfirmedApproval, useHasPendingApproval } from '../state/transactions/hooks';
import { computeSlippageAdjustedAmounts } from '../utils/prices';
// import { calculateGasMargin } from '../utils'
import { useTokenContract } from './useContract';
import { useActiveWeb3React } from './index';
import { DEFAULT_FEE_LIMIT } from '../tron-config';

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED,
}

// returns a variable indicating the state of the approval and a function which approves if necessary or early returns
export function useApproveCallback(
  amountToApprove?: CurrencyAmount,
  spender?: string,
): [ApprovalState, () => Promise<void>] {
  const { account } = useActiveWeb3React();
  const token = amountToApprove instanceof TokenAmount ? amountToApprove.token : undefined;
  // console.log(token, 'token');
  const currentAllowance = useTokenAllowance(token, account ?? undefined, spender);
  const pendingApproval = useHasPendingApproval(token?.address, spender);
  const confirmedApproval = useHasConfirmedApproval(token?.address, spender);
  const [interactiveAllowanceRaw, setInteractiveAllowanceRaw] = useState<string>();
  const [interactiveCheckFailed, setInteractiveCheckFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setInteractiveAllowanceRaw(undefined);
    setInteractiveCheckFailed(false);
    if (!confirmedApproval || !token || !account || !spender || !amountToApprove) return () => controller.abort();

    const apiBase = (process.env.REACT_APP_MARKETS_API_URL || '/markets-api').replace(/\/$/, '');
    const params = new URLSearchParams({
      token: token.address,
      owner: account,
      spender,
    });

    async function verifyAllowance(): Promise<void> {
      try {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const response = await fetch(`${apiBase}/api/interactive/allowance?${params.toString()}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) throw new Error(`Allowance check failed (${response.status})`);
          const body = await response.json();
          const raw = String(body.allowance_raw ?? '0');
          setInteractiveAllowanceRaw(raw);
          if (!new TokenAmount(token, raw).lessThan(amountToApprove)) return;
          if (attempt < 4) await new Promise((resolve) => window.setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') setInteractiveCheckFailed(true);
      }
    }

    verifyAllowance();
    return () => controller.abort();
  }, [account, amountToApprove, confirmedApproval, spender, token]);

  // check the current approval status
  const approvalState: ApprovalState = useMemo(() => {
    if (!amountToApprove || !spender) return ApprovalState.UNKNOWN;
    if (amountToApprove.currency === ETHER) return ApprovalState.APPROVED;
    if (confirmedApproval && token) {
      if (interactiveAllowanceRaw !== undefined) {
        return new TokenAmount(token, interactiveAllowanceRaw).lessThan(amountToApprove)
          ? ApprovalState.NOT_APPROVED
          : ApprovalState.APPROVED;
      }
      if (!interactiveCheckFailed) return ApprovalState.PENDING;
      return ApprovalState.APPROVED;
    }
    // we might not have enough data to know whether or not we need to approve
    if (!currentAllowance) return ApprovalState.UNKNOWN;

    // amountToApprove will be defined if currentAllowance is
    return currentAllowance.lessThan(amountToApprove)
      ? pendingApproval
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED;
  }, [amountToApprove, confirmedApproval, currentAllowance, interactiveAllowanceRaw, interactiveCheckFailed, pendingApproval, spender, token]);

  const tokenContract = useTokenContract(token?.address);
  const addTransaction = useTransactionAdder();

  const approve = useCallback(async (): Promise<void> => {
    if (approvalState !== ApprovalState.NOT_APPROVED) {
      console.error('approve was called unnecessarily');
      return;
    }
    if (!token) {
      console.error('no token');
      return;
    }

    if (!tokenContract) {
      console.error('tokenContract is null');
      return;
    }

    if (!amountToApprove) {
      console.error('missing amount to approve');
      return;
    }

    if (!spender) {
      console.error('no spender');
      return;
    }

    const useExact = false;
    // const estimatedGas = await tokenContract.estimateGas.approve(spender, MaxUint256).catch(() => {
    //   // general fallback for tokens who restrict approval amounts
    //   useExact = true
    //   return tokenContract.estimateGas.approve(spender, amountToApprove.raw.toString())
    // })

    return tokenContract
      .approve(spender, useExact ? amountToApprove.raw.toString() : MaxUint256, {
        // gasLimit: calculateGasMargin(estimatedGas)
        gasLimit: DEFAULT_FEE_LIMIT,
      })
      .then((response: TransactionResponse) => {
        addTransaction(response, {
          summary: 'Approve ' + amountToApprove.currency.symbol,
          approval: { tokenAddress: token.address, spender: spender },
        });
      })
      .catch((error: Error) => {
        console.debug('Failed to approve token', error);
        throw error;
      });
  }, [approvalState, token, tokenContract, amountToApprove, spender, addTransaction]);

  return [approvalState, approve];
}

// wraps useApproveCallback in the context of a swap
export function useApproveCallbackFromTrade(trade?: Trade, allowedSlippage = 0) {
  const amountToApprove = useMemo(
    () => (trade ? computeSlippageAdjustedAmounts(trade, allowedSlippage)[Field.INPUT] : undefined),
    [trade, allowedSlippage],
  );
  return useApproveCallback(amountToApprove, ROUTER_ADDRESS);
}

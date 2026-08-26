import { Currency, CurrencyAmount, currencyEquals, Percent, Trade, TradeType } from '@intercroneswap/v2-sdk';
import { useMemo } from 'react';
import { BETTER_TRADE_LESS_HOPS_THRESHOLD } from '../constants';
import { useAllCommonPairs } from './Trades';

const MAX_HOPS = 3;
const ZERO_PERCENT = new Percent('0');
const ONE_HUNDRED_PERCENT = new Percent('1');

function isTradeBetter(tradeA: Trade | undefined, tradeB: Trade | undefined, minimumDelta: Percent): boolean {
  if (tradeA && !tradeB) return false;
  if (tradeB && !tradeA) return true;
  if (!tradeA || !tradeB) return false;

  if (
    tradeA.tradeType !== tradeB.tradeType ||
    !currencyEquals(tradeA.inputAmount.currency, tradeB.inputAmount.currency) ||
    !currencyEquals(tradeA.outputAmount.currency, tradeB.outputAmount.currency)
  ) {
    throw new Error('Trades are not comparable');
  }

  if (minimumDelta.equalTo(ZERO_PERCENT)) {
    return tradeA.executionPrice.lessThan(tradeB.executionPrice);
  }

  return tradeA.executionPrice.raw.multiply(minimumDelta.add(ONE_HUNDRED_PERCENT)).lessThan(tradeB.executionPrice);
}

/**
 * Returns the best v2 trade for a desired swap
 * @param tradeType whether the swap is an exact in/out
 * @param amountSpecified the exact amount to swap in/out
 * @param otherCurrency the desired output/payment currency
 */
export function useBestV2Trade(
  tradeType: TradeType.EXACT_INPUT | TradeType.EXACT_OUTPUT,
  amountSpecified?: CurrencyAmount,
  otherCurrency?: Currency,
  { maxHops = MAX_HOPS } = {},
): Trade | undefined {
  const [currencyIn, currencyOut] = useMemo(
    () =>
      tradeType === TradeType.EXACT_INPUT
        ? [amountSpecified?.currency, otherCurrency]
        : [otherCurrency, amountSpecified?.currency],
    [tradeType, amountSpecified, otherCurrency],
  );
  const allowedPairs = useAllCommonPairs(currencyIn, currencyOut);

  return useMemo(() => {
    if (amountSpecified && currencyIn && currencyOut && allowedPairs.length > 0) {
      if (maxHops === 1) {
        const options = { maxHops: 1, maxNumResults: 1 };
        if (tradeType === TradeType.EXACT_INPUT) {
          const amountIn = amountSpecified;
          return Trade.bestTradeExactIn(allowedPairs, amountIn, currencyOut, options)[0] ?? null;
        } else {
          const amountOut = amountSpecified;
          return Trade.bestTradeExactOut(allowedPairs, currencyIn, amountOut, options)[0] ?? null;
        }
      }

      // search through trades with varying hops, find best trade out of them
      let bestTradeSoFar: Trade | undefined = undefined;
      for (let i = 1; i <= maxHops; i++) {
        const options = { maxHops: i, maxNumResults: 1 };
        let currentTrade: Trade | undefined;

        if (tradeType === TradeType.EXACT_INPUT) {
          const amountIn = amountSpecified;
          currentTrade = Trade.bestTradeExactIn(allowedPairs, amountIn, currencyOut, options)[0] ?? null;
        } else {
          const amountOut = amountSpecified;
          currentTrade = Trade.bestTradeExactOut(allowedPairs, currencyIn, amountOut, options)[0] ?? null;
        }

        // if current trade is best yet, save it
        if (isTradeBetter(bestTradeSoFar, currentTrade, BETTER_TRADE_LESS_HOPS_THRESHOLD)) {
          bestTradeSoFar = currentTrade;
        }
      }
      return bestTradeSoFar;
    }

    return undefined;
  }, [tradeType, amountSpecified, currencyIn, currencyOut, allowedPairs, maxHops]);
}

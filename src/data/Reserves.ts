import { TokenAmount, Pair, Currency, Token } from '@intercroneswap/v2-sdk';
import { useMemo } from 'react';
import ISwapV1PairABI from '../constants/abis/iswap-pair.json';
import { Interface } from '@ethersproject/abi';
import { useActiveWeb3React } from '../hooks';
import { useFactoryContract } from '../hooks/useContract';

import { NEVER_RELOAD, useMultipleContractSingleData, useSingleContractMultipleData } from '../state/multicall/hooks';
import { wrappedCurrency } from '../utils/wrappedCurrency';
const PAIR_INTERFACE = new Interface(ISwapV1PairABI);

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}

export function usePairs(currencies: [Currency | undefined, Currency | undefined][]): [PairState, Pair | null][] {
  const { chainId } = useActiveWeb3React();
  const factory = useFactoryContract();
  const tokens = useMemo(
    () =>
      currencies.map(([currencyA, currencyB]) => [
        wrappedCurrency(currencyA, chainId),
        wrappedCurrency(currencyB, chainId),
      ]),
    [chainId, currencies],
  );

  const pairAddressResults = useSingleContractMultipleData(
    factory,
    'getPair',
    tokens.map(([tokenA, tokenB]) => (tokenA && tokenB ? [tokenA.address, tokenB.address] : undefined)),
    NEVER_RELOAD,
  );
  const pairAddresses = useMemo(
    () => pairAddressResults.map(({ result }) => result?.[0] as string | undefined),
    [pairAddressResults],
  );

  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves');

  return useMemo(() => {
    return tokens.map(([tokenA, tokenB], i) => {
      const { result: reserves, loading } = results[i] || {};
      const pairAddressResult = pairAddressResults[i];

      if (pairAddressResult?.loading || loading) return [PairState.LOADING, null];
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null];
      if (!reserves) return [PairState.NOT_EXISTS, null];
      const { reserve0, reserve1 } = reserves;
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
      return [
        PairState.EXISTS,
        new Pair(
          new TokenAmount(token0, reserve0.toString()),
          new TokenAmount(token1, reserve1.toString()),
          pairAddresses[i],
        ),
      ];
    });
  }, [results, pairAddresses, pairAddressResults, JSON.stringify(tokens)]);
}

export function usePair(tokenA?: Currency, tokenB?: Currency): [PairState, Pair | null] {
  return usePairs([[tokenA, tokenB]])[0];
}


export function usePairsByAddresses(
  positions: { pairAddress: string; tokens: [Token, Token] }[],
): [PairState, Pair | null][] {
  const pairAddresses = useMemo(() => positions.map(({ pairAddress }) => pairAddress), [positions]);
  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves');

  return useMemo(
    () =>
      positions.map(({ pairAddress, tokens }, index) => {
        const { result: reserves, loading, error } = results[index] || {};
        if (loading) return [PairState.LOADING, null];
        if (error || !reserves) return [PairState.NOT_EXISTS, null];

        const [token0, token1] = tokens[0].sortsBefore(tokens[1]) ? tokens : [tokens[1], tokens[0]];
        return [
          PairState.EXISTS,
          new Pair(
            new TokenAmount(token0, reserves.reserve0.toString()),
            new TokenAmount(token1, reserves.reserve1.toString()),
            pairAddress,
          ),
        ];
      }),
    [positions, results],
  );
}

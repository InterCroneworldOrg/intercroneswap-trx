import { TokenAmount, Pair, Currency, Token } from '@intercroneswap/v2-sdk';
import { useEffect, useMemo } from 'react';
import ISwapV1PairABI from '../constants/abis/iswap-pair.json';
import { Interface } from '@ethersproject/abi';
import { useActiveWeb3React } from '../hooks';
import { useFactoryContract } from '../hooks/useContract';

import { NEVER_RELOAD, useMultipleContractSingleData, useSingleContractMultipleData } from '../state/multicall/hooks';
import { wrappedCurrency } from '../utils/wrappedCurrency';
const PAIR_INTERFACE = new Interface(ISwapV1PairABI);

const RESERVE_CACHE_PREFIX = 'intercrone:pair-reserves:';
const RESERVE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CachedPairReserves {
  reserve0: string;
  reserve1: string;
  updatedAt: number;
}

function readCachedPairReserves(pairAddress: string): CachedPairReserves | undefined {
  try {
    const value = window.localStorage.getItem(`${RESERVE_CACHE_PREFIX}${pairAddress.toLowerCase()}`);
    if (!value) return undefined;
    const cached = JSON.parse(value) as CachedPairReserves;
    if (
      !cached.reserve0 ||
      !cached.reserve1 ||
      !cached.updatedAt ||
      Date.now() - cached.updatedAt > RESERVE_CACHE_MAX_AGE_MS
    ) {
      return undefined;
    }
    return cached;
  } catch {
    return undefined;
  }
}

function writeCachedPairReserves(pairAddress: string, reserve0: string, reserve1: string): void {
  try {
    window.localStorage.setItem(
      `${RESERVE_CACHE_PREFIX}${pairAddress.toLowerCase()}`,
      JSON.stringify({ reserve0, reserve1, updatedAt: Date.now() }),
    );
  } catch {
    // Storage may be unavailable (private mode or quota); live RPC data still works.
  }
}

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

  useEffect(() => {
    results.forEach(({ result }, index) => {
      const pairAddress = pairAddresses[index];
      if (pairAddress && result?.reserve0 !== undefined && result?.reserve1 !== undefined) {
        writeCachedPairReserves(pairAddress, result.reserve0.toString(), result.reserve1.toString());
      }
    });
  }, [pairAddresses, results]);

  return useMemo(() => {
    return tokens.map(([tokenA, tokenB], i) => {
      const { result: liveReserves, loading, error } = results[i] || {};
      const pairAddressResult = pairAddressResults[i];
      const pairAddress = pairAddresses[i];

      if (pairAddressResult?.loading) return [PairState.LOADING, null];
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null];
      if (!pairAddress) return [PairState.NOT_EXISTS, null];

      const cachedReserves = readCachedPairReserves(pairAddress);
      const pairReserves = liveReserves || cachedReserves;
      if (!pairReserves && loading) return [PairState.LOADING, null];
      if (!pairReserves && error) return [PairState.NOT_EXISTS, null];
      if (!pairReserves) return [PairState.NOT_EXISTS, null];

      const { reserve0, reserve1 } = pairReserves;
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
      return [
        PairState.EXISTS,
        new Pair(
          new TokenAmount(token0, reserve0.toString()),
          new TokenAmount(token1, reserve1.toString()),
          pairAddress,
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

  useEffect(() => {
    results.forEach(({ result }, index) => {
      const pairAddress = pairAddresses[index];
      if (pairAddress && result?.reserve0 !== undefined && result?.reserve1 !== undefined) {
        writeCachedPairReserves(pairAddress, result.reserve0.toString(), result.reserve1.toString());
      }
    });
  }, [pairAddresses, results]);

  return useMemo(
    () =>
      positions.map(({ pairAddress, tokens }, index) => {
        const { result: liveReserves, loading, error } = results[index] || {};
        const cachedReserves = readCachedPairReserves(pairAddress);
        const reserves = liveReserves || cachedReserves;

        // Show the last known reserves immediately after a browser refresh while
        // the rate-limited TronGrid request refreshes them in the background.
        if (!reserves && loading) return [PairState.LOADING, null];
        if (!reserves && error) return [PairState.NOT_EXISTS, null];
        if (!reserves) return [PairState.LOADING, null];

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

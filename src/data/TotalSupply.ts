import { BigNumber } from '@ethersproject/bignumber';
import { Token, TokenAmount } from '@intercroneswap/v2-sdk';
import { useEffect, useState } from 'react';
import { useTokenContract } from '../hooks/useContract';
import { useSingleCallResult } from '../state/multicall/hooks';
import { readLiquidityValue, writeLiquidityValue } from '../utils/liquidityValueCache';

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Token): TokenAmount | undefined {
  const contract = useTokenContract(token?.address, false);

  const totalSupply: BigNumber = useSingleCallResult(contract, 'totalSupply')?.result?.[0];

  return token && totalSupply ? new TokenAmount(token, totalSupply.toString()) : undefined;
}

export function useCachedLiquidityTotalSupply(token?: Token): TokenAmount | undefined {
  const liveTotalSupply = useTotalSupply(token);
  const [cachedRaw, setCachedRaw] = useState<string | undefined>(() =>
    token ? readLiquidityValue('totalSupply', token.chainId, token.address) : undefined,
  );

  useEffect(() => {
    setCachedRaw(token ? readLiquidityValue('totalSupply', token.chainId, token.address) : undefined);
  }, [token]);

  useEffect(() => {
    if (!token || !liveTotalSupply) return;
    const raw = liveTotalSupply.raw.toString();
    writeLiquidityValue('totalSupply', token.chainId, token.address, raw);
    setCachedRaw(raw);
  }, [liveTotalSupply, token]);

  if (!token) return undefined;
  return liveTotalSupply || (cachedRaw !== undefined ? new TokenAmount(token, cachedRaw) : undefined);
}

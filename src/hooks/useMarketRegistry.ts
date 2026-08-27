import { useCallback, useEffect, useState } from 'react';

export interface RegistryLiquidityPosition {
  pair_address: string;
  token0_address: string;
  token0_symbol: string;
  token0_name: string;
  token0_decimals: number;
  token1_address: string;
  token1_symbol: string;
  token1_name: string;
  token1_decimals: number;
  lp_balance_raw: string;
}

interface WalletLiquidityResponse {
  positions: RegistryLiquidityPosition[];
  count: number;
}

const API_BASE_URL = (process.env.REACT_APP_MARKETS_API_URL || '/markets-api').replace(/\/$/, '');
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; positions: RegistryLiquidityPosition[] }>();

export function useWalletLiquidityRegistry(walletAddress?: string | null): {
  positions: RegistryLiquidityPosition[];
  loading: boolean;
  error?: string;
  refresh: () => void;
} {
  const [positions, setPositions] = useState<RegistryLiquidityPosition[]>([]);
  const [loading, setLoading] = useState(Boolean(walletAddress));
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => {
    if (walletAddress) cache.delete(walletAddress);
    setRevision((current) => current + 1);
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setPositions([]);
      setLoading(false);
      setError(undefined);
      return;
    }

    const cached = cache.get(walletAddress);
    if (cached && cached.expiresAt > Date.now()) {
      setPositions(cached.positions);
      setLoading(false);
      setError(undefined);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    setLoading(true);
    setError(undefined);

    fetch(`${API_BASE_URL}/api/wallets/${encodeURIComponent(walletAddress)}/liquidity`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const responseText = await response.text();
        let body: WalletLiquidityResponse | { error?: string } | undefined;
        try {
          body = responseText ? (JSON.parse(responseText) as WalletLiquidityResponse | { error?: string }) : undefined;
        } catch {
          body = undefined;
        }
        if (!response.ok) {
          throw new Error(
            body && 'error' in body && body.error ? body.error : `Registry request failed (${response.status})`,
          );
        }
        if (!body || !('positions' in body) || !Array.isArray(body.positions)) {
          throw new Error('Market registry returned an invalid response');
        }
        return body;
      })
      .then((body) => {
        cache.set(walletAddress, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          positions: body.positions,
        });
        setPositions(body.positions);
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message);
        } else {
          setError('Market registry request timed out');
        }
        setPositions([]);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [revision, walletAddress]);

  return { positions, loading, error, refresh };
}

import { useCallback, useEffect, useState } from 'react';

export interface V1LpHolder {
  holder_address: string;
  balance_raw: string;
  holder_type: 'wallet' | 'smart_contract';
  contract_role?: 'staking' | 'other' | null;
  percentage?: number;
  staker_count?: number;
  farm?: { farm_address: string; legacy_label?: string };
}

interface HolderResponse {
  holders: V1LpHolder[];
  total: number;
}

const API_BASE_URL = (process.env.REACT_APP_MARKETS_API_URL || '/markets-api').replace(/\/$/, '');

export function useV1MarketHolders(pairAddress?: string) {
  const [holders, setHolders] = useState<V1LpHolder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(pairAddress));
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!pairAddress) {
      setHolders([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetch(`${API_BASE_URL}/api/v1/markets/${encodeURIComponent(pairAddress)}/holders?limit=200`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const body = (await response.json()) as HolderResponse & { error?: string };
        if (!response.ok) throw new Error(body.error || `Holder request failed (${response.status})`);
        return body;
      })
      .then((body) => {
        setHolders(Array.isArray(body.holders) ? body.holders : []);
        setTotal(Number(body.total) || 0);
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [pairAddress, revision]);

  return { holders, total, loading, error, refresh };
}

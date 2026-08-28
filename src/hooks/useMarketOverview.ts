import { useCallback, useEffect, useState } from 'react';

export interface MarketOverview {
  pair_address: string;
  token0_address: string;
  token1_address: string;
  token0_symbol?: string;
  token1_symbol?: string;
  reserve0?: string;
  reserve1?: string;
  token0_price_usd?: string | null;
  token1_price_usd?: string | null;
  tvl_usd?: string | null;
  price_status?: string;
  price_hops?: number | null;
  updated_at?: string;
}

interface MarketOverviewResponse {
  markets: MarketOverview[];
  count: number;
  state?: {
    last_success_at?: string;
    last_checked?: number;
    last_verified?: number;
    last_failed?: number;
    priced_markets?: number;
  };
}

const API_BASE_URL = (process.env.REACT_APP_MARKETS_API_URL || '/markets-api').replace(/\/$/, '');

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body as T;
}

export function useMarketOverview(): {
  markets: MarketOverview[];
  state?: MarketOverviewResponse['state'];
  loading: boolean;
  error?: string;
  refresh: () => void;
} {
  const [markets, setMarkets] = useState<MarketOverview[]>([]);
  const [state, setState] = useState<MarketOverviewResponse['state']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetch(`${API_BASE_URL}/api/market-overview`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then((response) => readJson<MarketOverviewResponse>(response))
      .then((body) => {
        setMarkets(Array.isArray(body.markets) ? body.markets : []);
        setState(body.state);
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [revision]);

  return { markets, state, loading, error, refresh };
}

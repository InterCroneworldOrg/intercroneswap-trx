import { useCallback, useEffect, useState } from 'react';
import { useActiveWeb3React } from './index';
import { getActiveSwapVersion } from '../swapVersion';

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
  const { account } = useActiveWeb3React();
  const version = getActiveSwapVersion();
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
    if (version === 'v1' && !account) {
      setMarkets([]);
      setLoading(false);
      setError('Connect the approved wallet to view V1 markets.');
      return () => controller.abort();
    }
    const endpoint = version === 'v1'
      ? `${API_BASE_URL}/api/v1/market-overview?wallet=${encodeURIComponent(account || '')}`
      : `${API_BASE_URL}/api/market-overview`;
    fetch(endpoint, {
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
  }, [account, revision, version]);

  return { markets, state, loading, error, refresh };
}

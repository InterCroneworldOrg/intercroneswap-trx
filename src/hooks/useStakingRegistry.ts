import { useCallback, useEffect, useMemo, useState } from 'react';

export interface EndedFarm {
  farm_address: string;
  phase: number;
  legacy_label: string;
  status: string;
  period_finish?: number;
  period_finish_at?: string;
  staking_token_address?: string;
  rewards_token_address?: string;
}

export interface FarmWalletPosition {
  farm_address: string;
  wallet_address: string;
  staked_raw?: string;
  earned_raw?: string;
  has_stake?: boolean;
  has_rewards?: boolean;
  exit_required?: boolean;
  claim_only?: boolean;
  status?: string;
  last_checked_at?: string;
}

interface FarmsResponse {
  farms: EndedFarm[];
}

interface WalletFarmsResponse {
  positions: FarmWalletPosition[];
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
  if (!response.ok) {
    throw new Error(body?.error || `Request failed (${response.status})`);
  }
  return body as T;
}

export function useEndedFarms(account?: string | null): {
  farms: EndedFarm[];
  positionsByFarm: Record<string, FarmWalletPosition>;
  loading: boolean;
  error?: string;
  refresh: () => void;
} {
  const [farms, setFarms] = useState<EndedFarm[]>([]);
  const [positions, setPositions] = useState<FarmWalletPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);

    const farmsRequest = fetch(`${API_BASE_URL}/api/farms?status=ended`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).then((response) => readJson<FarmsResponse>(response));

    const positionsRequest = account
      ? fetch(`${API_BASE_URL}/api/wallets/${encodeURIComponent(account)}/farms`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }).then((response) => readJson<WalletFarmsResponse>(response))
      : Promise.resolve({ positions: [] } as WalletFarmsResponse);

    Promise.all([farmsRequest, positionsRequest])
      .then(([farmBody, positionBody]) => {
        setFarms(Array.isArray(farmBody.farms) ? farmBody.farms : []);
        setPositions(Array.isArray(positionBody.positions) ? positionBody.positions : []);
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [account, revision]);

  const positionsByFarm = useMemo(
    () =>
      positions.reduce<Record<string, FarmWalletPosition>>((result, position) => {
        result[position.farm_address] = position;
        return result;
      }, {}),
    [positions],
  );

  return { farms, positionsByFarm, loading, error, refresh };
}

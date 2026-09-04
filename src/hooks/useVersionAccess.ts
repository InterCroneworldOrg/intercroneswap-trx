import { useEffect, useState } from 'react';

const API_BASE_URL = (process.env.REACT_APP_MARKETS_API_URL || '/markets-api').replace(/\/$/, '');

export function useV1Access(walletAddress?: string | null): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE_URL}/api/access/${encodeURIComponent(walletAddress)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Access check failed'))))
      .then((body) => setEnabled(body.v1_enabled === true))
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [walletAddress]);

  return { enabled, loading };
}

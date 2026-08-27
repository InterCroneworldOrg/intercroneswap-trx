const CACHE_PREFIX = 'intercrone:lp-value';
const CACHE_MAX_AGE_MS = 15 * 60 * 1000;

type LiquidityValueKind = 'balance' | 'totalSupply';

interface CachedLiquidityValue {
  raw: string;
  updatedAt: number;
}

function cacheKey(kind: LiquidityValueKind, chainId: number, tokenAddress: string, account?: string): string {
  return [CACHE_PREFIX, chainId, kind, tokenAddress.toLowerCase(), account?.toLowerCase() || 'global'].join(':');
}

export function readLiquidityValue(
  kind: LiquidityValueKind,
  chainId: number,
  tokenAddress: string,
  account?: string,
): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = window.localStorage.getItem(cacheKey(kind, chainId, tokenAddress, account));
    if (!stored) return undefined;
    const cached = JSON.parse(stored) as CachedLiquidityValue;
    if (typeof cached.raw !== 'string' || !cached.updatedAt || Date.now() - cached.updatedAt > CACHE_MAX_AGE_MS) {
      return undefined;
    }
    return cached.raw;
  } catch {
    return undefined;
  }
}

export function writeLiquidityValue(
  kind: LiquidityValueKind,
  chainId: number,
  tokenAddress: string,
  raw: string,
  account?: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      cacheKey(kind, chainId, tokenAddress, account),
      JSON.stringify({ raw, updatedAt: Date.now() }),
    );
  } catch {
    // Live RPC values still work if browser storage is unavailable.
  }
}

export function clearLiquidityValueCache(chainId: number, account: string, tokenAddress?: string): void {
  if (typeof window === 'undefined') return;
  const chainPrefix = `${CACHE_PREFIX}:${chainId}:`;
  const normalizedAccount = account.toLowerCase();
  const normalizedToken = tokenAddress?.toLowerCase();

  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (!key.startsWith(chainPrefix)) return;
      if (normalizedToken && !key.includes(`:${normalizedToken}:`)) return;
      if (key.endsWith(`:${normalizedAccount}`) || key.endsWith(':global')) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    // Cache invalidation is best-effort; live RPC refresh remains authoritative.
  }
}

// Keep the legacy value in the type so old links can be normalized, but this
// build always resolves and writes V2.
export type SwapVersion = 'v1' | 'v2';

const STORAGE_KEY = 'intercrone:swap-version';

export function getActiveSwapVersion(): SwapVersion {
  return 'v2';
}

export function setActiveSwapVersion(version: SwapVersion): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, version);
}

export function resetToV2(): void {
  setActiveSwapVersion('v2');
}

export function getSwapVersionFromPath(pathname: string): SwapVersion | undefined {
  return /^\/v2(?:\/|$)/.test(pathname) ? 'v2' : undefined;
}

export function getUnversionedPath(pathname: string): string {
  const path = pathname.replace(/^\/(?:v1|v2)(?=\/|$)/, '');
  return path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : '/swap';
}

export function versionedPath(pathname: string, version: SwapVersion = getActiveSwapVersion()): string {
  return `/v2${getUnversionedPath(pathname)}`;
}

export function initializeSwapVersionFromHash(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, 'v2');
}

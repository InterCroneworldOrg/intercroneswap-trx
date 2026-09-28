export type SwapVersion = 'v1' | 'v2';

const STORAGE_KEY = 'intercrone:swap-version';

export function getActiveSwapVersion(): SwapVersion {
  if (typeof window === 'undefined') return 'v2';
  return window.localStorage.getItem(STORAGE_KEY) === 'v1' ? 'v1' : 'v2';
}

export function setActiveSwapVersion(version: SwapVersion): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, version);
}

export function resetToV2(): void {
  setActiveSwapVersion('v2');
}

export function getSwapVersionFromPath(pathname: string): SwapVersion | undefined {
  const match = pathname.match(/^\/(v1|v2)(?:\/|$)/);
  return match?.[1] as SwapVersion | undefined;
}

export function getUnversionedPath(pathname: string): string {
  const path = pathname.replace(/^\/(?:v1|v2)(?=\/|$)/, '');
  return path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : '/swap';
}

export function versionedPath(pathname: string, version: SwapVersion = getActiveSwapVersion()): string {
  return `/${version}${getUnversionedPath(pathname)}`;
}

export function initializeSwapVersionFromHash(): void {
  if (typeof window === 'undefined') return;
  const hashPath = window.location.hash.replace(/^#/, '').split('?')[0] || '/';
  const version = getSwapVersionFromPath(hashPath);
  if (version) setActiveSwapVersion(version);
}

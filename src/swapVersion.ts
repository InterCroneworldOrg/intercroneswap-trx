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

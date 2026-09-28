import TronWeb from 'tronweb';
import { getActiveSwapVersion } from './swapVersion';

export const TRON_CHAIN_IDS = {
  mainnet: 11111,
  shasta: 1,
  nile: 201910292,
} as const;

export const TRON_CONTRACTS: Record<number, { router: string; multicall: string; factory?: string }> = {
  [TRON_CHAIN_IDS.mainnet]: {
    router: 'TNvdqHkoToRLfKqeK78nzSpcAF5dd93tPZ',
    factory: 'TPvaMEL5oY2gWsJv7MDjNQh2dohwvwwVwx',
    multicall: 'TFpS8x2JrHyqozgxswdta2MJgkDbZKm2Fv',
  },
  [TRON_CHAIN_IDS.shasta]: {
    router: 'TJgLhW8xQ81R92a2tSmQdS4LwzqDEBbYi2',
    multicall: 'TP7m1TrsUkZap39yTyGvLepuiYZkMeAogp',
  },
  [TRON_CHAIN_IDS.nile]: {
    router: '',
    multicall: 'TAPo6wKzZPd5ej3iyF4X8G2A6Fxmg8c9rF',
  },
};

export function tronAddressToEvmAddress(address: string): string {
  if (!address) return '';
  const hex = TronWeb.address.toHex(address);
  return `0x${hex.slice(2)}`;
}

export function evmAddressToTronAddress(address: string): string {
  return TronWeb.address.fromHex(`41${address.replace(/^0x/, '')}`);
}

const TRON_V1_MAINNET_CONTRACTS = {
  router: 'TXjGFNPUrHDcN8Gp5aGMN6Cr3PUtBHwzrW',
  factory: 'TJL9Tj2rf5WPUkaYMzbvWErn6M8wYRiHG7',
  multicall: TRON_CONTRACTS[TRON_CHAIN_IDS.mainnet].multicall,
};

export function getTronContracts(chainId: number): { router: string; multicall: string; factory?: string } {
  if (chainId === TRON_CHAIN_IDS.mainnet && getActiveSwapVersion() === 'v1') {
    return TRON_V1_MAINNET_CONTRACTS;
  }
  return TRON_CONTRACTS[chainId] ?? TRON_CONTRACTS[TRON_CHAIN_IDS.mainnet];
}

export const DEFAULT_FEE_LIMIT = 1_000_000_000;

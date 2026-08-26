import { ChainId, JSBI, Percent, Token, WETH } from '@intercroneswap/v2-sdk';
import { AbstractConnector } from '@web3-react/abstract-connector';

import { injected } from '../connectors';
import { BTC, BTT, ETH, ICR, ECO, MEOX, USDC, USDD, USDJ, USDT, WIN, COME } from './tokens';
import { getTronContracts, tronAddressToEvmAddress } from '../tron-config';

const chainId: number = parseInt(process.env.REACT_APP_CHAIN_ID ?? '11111');
export const ROUTER_ADDRESS = tronAddressToEvmAddress(getTronContracts(chainId).router);
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// a list of tokens by chain
type ChainTokenList = {
  readonly [chainId in ChainId]: Token[];
};

const WETH_ONLY: ChainTokenList = {
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]],
  [ChainId.NILE]: [WETH[ChainId.NILE]],
  [ChainId.SHASTA]: [WETH[ChainId.SHASTA]],
};

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], ICR, USDT, USDC, USDJ, USDD, BTC, ETH, BTT, MEOX, ECO, WIN, COME],
};

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId in ChainId]?: { [tokenAddress: string]: Token[] } } = {
  [ChainId.MAINNET]: {},
};

// used for display in the default list when adding liquidity
export const SUGGESTED_BASES: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET]],
};

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET]],
};

export const PINNED_PAIRS: { readonly [chainId in ChainId]?: [Token, Token][] } = {
  [ChainId.MAINNET]: [],
};

export interface WalletInfo {
  connector?: AbstractConnector;
  name: string;
  iconName: string;
  description: string;
  href: string | null;
  color: string;
  primary?: true;
  mobile?: true;
  mobileOnly?: true;
}

export const SUPPORTED_WALLETS: { [key: string]: WalletInfo } = {
  TRONLINK: {
    connector: injected,
    name: 'TronLink',
    iconName: 'tronlink.svg',
    description: 'Easy-to-use browser extension.',
    href: null,
    color: '#48489b',
    primary: true,
  },
};

export const NetworkContextName = 'NETWORK';

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 50;
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20;

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000));
export const BIPS_BASE = JSBI.BigInt(10000);
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE); // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE); // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE); // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(1000), BIPS_BASE); // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE); // 15%

// TRX is the native gas token. The UI currently permits spending the full displayed balance.
export const MIN_ETH: JSBI = JSBI.BigInt(0); // 0 TRX

export const BETTER_TRADE_LESS_HOPS_THRESHOLD = new Percent(JSBI.BigInt(50), BIPS_BASE);

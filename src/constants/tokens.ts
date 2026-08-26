import { ChainId, Token, WETH } from '@intercroneswap/v2-sdk';
import { evmAddressToTronAddress, tronAddressToEvmAddress } from '../tron-config';

export function getTokensFromDefaults(symbols: string): [Token, Token] | undefined {
  const symbolsSplit = symbols.split('-');
  if (symbolsSplit.length !== 2) {
    return undefined;
  }
  const token0 = getTokenFromDefaults(symbolsSplit[0].toUpperCase());
  const token1 = getTokenFromDefaults(symbolsSplit[1].toUpperCase());
  return token0 && token1 ? [token0, token1] : undefined;
}

export let tokensFromApi: Token[] = [];

function createTronToken(address: string, decimals: number, symbol: string, name: string): Token {
  return new Token(ChainId.MAINNET, tronAddressToEvmAddress(address), decimals, symbol.trim(), name);
}

export function getTronTokenAddress(token: Token): string {
  return evmAddressToTronAddress(token.address);
}

const TOKENLIST_URL =
  'https://raw.githubusercontent.com/InterCroneworldOrg/token-lists/e91b53da5b8d08e0b2b6fdccf93ece3b5abda6f1/intercroneswap_default.json';

export const fetchTokens = async () => {
  const response = await fetch(TOKENLIST_URL, { method: 'GET' });
  if (!response.ok) return;

  const json = await response.json();

  const list = Array.isArray(json.tokens) ? json.tokens : [];

  tokensFromApi = list
    .filter((t: any) => Number(t.chainId) === 11111)
    .map((t: any) => {
      const address = String(t.address).startsWith('T') ? tronAddressToEvmAddress(t.address) : t.address;
      return new Token(Number(t.chainId), address, Number(t.decimals), String(t.symbol).trim(), t.name);
    });
};

export function getTokenFromDefaults(symbol: string): Token | undefined {
  let token: Token | undefined = symbol === 'TRX' ? WETH[ChainId.MAINNET] : DefaultTokensMap[symbol];
  if (!token && tokensFromApi.length > 0) {
    token = tokensFromApi.find((token) => token.symbol === symbol);
  }
  return token;
}

export const PLZ = createTronToken('TYK71t3eD1pTxpkDp7gbqXM5DYfaVdfKjV', 8, 'PLZ', 'Plaentz');
export const ICR = createTronToken('TKqvrVG7a2zJvQ3VysLoiz9ijuMNDehwy7', 8, 'ICR', 'Intercrone');
export const USDT = createTronToken('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 6, 'USDT', 'Tether');
export const BTT = createTronToken('TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4', 18, 'BTT', 'BitTorrent');
export const MEOX = createTronToken('TQy3PRQda43yb3Ku35AktG549KMQLCJVDb', 18, 'MEOX', 'Metronix');
export const BTC = createTronToken('TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', 8, 'BTC', 'Bitcoin');
export const ETHOLD = createTronToken('THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF', 18, 'ETHOLD', 'Ethereum');
export const ETH = createTronToken('TRFe3hT5oYhjSZ6f3ji5FJ7YCfrkWnHRvh', 18, 'ETH', 'Ethereum');
export const USDJ = createTronToken('TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT', 18, 'USDJ ', 'JUST Stablecoin');
export const TUSD = createTronToken('TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4', 18, 'TUSD ', 'TrueUSD');
export const USDC = createTronToken('TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', 6, 'USDC ', 'USD Coin');
export const USDD = createTronToken('TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn', 18, 'USDD ', 'USDD Coin');
export const WIN = createTronToken('TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', 6, 'WIN ', 'WINK');
export const SST = createTronToken('TBLQs7LqUYAgzYirNtaiX3ixnCKnhrVVCe', 8, 'SST ', 'SocialSwapToken');
export const JM = createTronToken('TVHH59uHVpHzLDMFFpUgCx2dNAQqCzPhcR', 8, 'JM ', 'J U S T M O N E Y');
export const JST = createTronToken('TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9', 18, 'JST ', 'JUST GOV');
export const NFT = createTronToken('TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq', 6, 'NFT ', 'APENFT');
export const SUN = createTronToken('TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S', 18, 'SUN ', 'SUN');
export const WBTT = createTronToken('TKfjV9RNKJJCqPvBtK8L7Knykh7DNWvnYt', 6, 'WBTT ', 'Wrapped BTT');
export const LTC = createTronToken('TR3DLthpnDdCGabhVDbD3VMsiJoCXY3bZd', 8, 'LTC ', 'Litecoin');
export const HT = createTronToken('TDyvndWuvX5xTBwHPYJi7J3Yq8pq8yh62h', 18, 'HT ', 'HuobiToken');
export const KLV = createTronToken('TVj7RNVHy6thbM7BWdSe9G6gXwKhjhdNZS', 6, 'KLV ', 'Klever');
export const Doge = createTronToken('THbVQp8kMjStKNnf2iCY6NEzThKMK5aBHg', 8, 'Doge ', 'Dogecoin');
export const TURU = createTronToken('TK8K7HFDLkhYS6XnFC8MKQkVK6Xq8D13qJ', 8, 'turu ', 'turu');
export const BBT = createTronToken('TGyZUWrL97mmmYJwrC7ZCLVrhbzvHmmWPL', 8, 'BBT', 'BabyTuru');
export const CCC = createTronToken('TRv9ipj4kKAZqQggQ7ceJpe5ERD1ZShpgs', 18, 'CCC', 'Coconut Chicken');

export const BCC = createTronToken('TXZUmRx4T1RW2Uj1GeTmJWyx98R9XAS2sn', 18, 'BCC', 'Baby Coconut Chicken');
export const BBC = createTronToken('TCt1tj8v6wwQ7pacS547XU1Wq5Eoed5MyD', 18, 'BBC', 'Big Black Cockerel');
export const ECO = createTronToken('TRQBfhgrRXuALbCmS172znZ5XeA4H98Pao', 18, 'ECO', 'Eggcellent Chicken One');
export const COME = createTronToken('TXMdyszg7XyiVW98QyvwcBh71y7i4pytoH', 18, 'COME', 'CommunityEarth');

export const DefaultTokensMap: { [tokenSymbol: string]: Token } = {
  ['ICR']: ICR,
  ['USDT']: USDT,
  ['USDD']: USDD,
  ['ETH']: ETH,
  ['ETHOLD']: ETHOLD,
  ['BTT']: BTT,
  ['MEOX']: MEOX,
  ['BTC']: BTC,
  ['USDJ']: USDJ,
  ['TUSD']: TUSD,
  ['USDC']: USDC,
  ['WIN']: WIN,
  ['JM']: JM,
  ['JST']: JST,
  ['NFT']: NFT,
  ['SUN']: SUN,
  ['WBTT']: WBTT,
  ['LTC']: LTC,
  ['HT']: HT,
  ['KLV']: KLV,
  ['DOGE']: Doge,
  ['TURU']: TURU,
  ['turu']: TURU,
  ['BBT']: BBT,
  ['CCC']: CCC,
  ['BCC']: BCC,
  ['BBC']: BBC,
  ['ECO']: ECO,
  ['COME']: COME,
  ['SST']: SST,
  ['PLZ']: PLZ,
};

const tokens: Token[] = [
  ICR,
  USDT,
  USDD,
  ETHOLD,
  ETH,
  BTT,
  MEOX,
  USDJ,
  TUSD,
  USDC,
  WIN,
  JM,
  JST,
  NFT,
  SUN,
  WBTT,
  LTC,
  KLV,
  Doge,
  TURU,
  SST,
  BBT,
  COME,
  PLZ,
];

export function getTokenByAddress(address: string): Token {
  return tokens.find((token) => token.address.toLowerCase() === address.toLowerCase()) ?? ICR;
}

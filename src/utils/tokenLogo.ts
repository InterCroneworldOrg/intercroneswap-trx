import { TokenList } from '@intercroneswap/token-lists';
import { PLZ } from '../constants/tokens';

/**
 * Return only explicitly curated logo URLs. Guessing filenames on third-party
 * hosts creates several failed requests per unknown token and is blocked by
 * modern browsers' ORB protection.
 */
export const getTokenLogoURL = (address: string, allTokens: TokenList[]): string[] => {
  if (address.toLowerCase() === PLZ.address.toLowerCase()) {
    return [
      'https://static.tronscan.org/production/upload/logo/new/TYK71t3eD1pTxpkDp7gbqXM5DYfaVdfKjV.png?t=1668077389818',
    ];
  }

  const curatedLogo = allTokens
    .flatMap((tokens) => tokens.tokens)
    .find((token) => token.address.toLowerCase() === address.toLowerCase())?.logoURI;

  return curatedLogo ? [curatedLogo] : [];
};

import { TokenList } from '@intercroneswap/token-lists';
import schema from '@intercroneswap/token-lists/src/tokenlist.schema.json';
import Ajv from 'ajv';
import contenthashToUri from './contenthashToUri';
import { parseENSAddress } from './parseENSAddress';
import uriToHttp from './uriToHttp';

// Initialize Ajv with allErrors option
const tokenListValidator = new Ajv({ allErrors: true }).compile(schema);

// Define a cache object outside the function
const tokenListCache = new Map<string, TokenList>();

/**
 * Contains the logic for resolving a list URL to a validated token list
 * @param listUrl list url
 * @param resolveENSContentHash resolves an ens name to a contenthash
 */
export default async function getTokenList(
  listUrl: string,
  resolveENSContentHash: (ensName: string) => Promise<string>,
): Promise<TokenList> {
  // Check if the token list is already in the cache
  const cachedTokenList = tokenListCache.get(listUrl);
  if (cachedTokenList) {
    return cachedTokenList;
  }

  // Parse ENS address if applicable
  const parsedENS = parseENSAddress(listUrl);
  let urls: string[];

  // Resolve URLs based on ENS or direct URL
  if (parsedENS) {
    let contentHashUri;

    try {
      contentHashUri = await resolveENSContentHash(parsedENS.ensName);
    } catch (error) {
      console.debug(`Failed to resolve ENS name: ${parsedENS.ensName}`, error);
      throw new Error(`Failed to resolve ENS name: ${parsedENS.ensName}`);
    }

    let translatedUri;
    try {
      translatedUri = contenthashToUri(contentHashUri);
    } catch (error) {
      console.debug('Failed to translate contenthash to URI', contentHashUri);
      throw new Error(`Failed to translate contenthash to URI: ${contentHashUri}`);
    }

    urls = uriToHttp(`${translatedUri}${parsedENS.ensPath ?? ''}`);
  } else {
    urls = uriToHttp(listUrl);
  }

  // Loop through the resolved URLs
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const isLast = i === urls.length - 1;
    let response;

    try {
      // Fetch the token list
      response = await fetch(url);
    } catch (error) {
      console.debug('Failed to fetch list', listUrl, error);
      if (isLast) throw new Error(`Failed to download list ${listUrl}`);
      continue;
    }

    // Check if the response is OK
    if (!response.ok) {
      if (isLast) throw new Error(`Failed to download list ${listUrl}`);
      continue;
    }

    // Parse JSON response
    const json = await response.json();

    // Validate the token list
    if (!tokenListValidator(json)) {
      const validationErrors: string =
        tokenListValidator.errors?.reduce<string>((memo, error: any) => {
          const add = `${error.dataPath} ${error.message ?? ''}`;
          return memo.length > 0 ? `${memo}; ${add}` : `${add}`;
        }, '') ?? 'unknown error';
      throw new Error(`Token list failed validation: ${validationErrors}`);
    }

    // Cache the fetched token list
    tokenListCache.set(listUrl, json);

    return json as TokenList;
  }

  // If no valid response is found, throw an error
  throw new Error('Unrecognized list URL protocol.');
}

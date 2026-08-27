import { Contract } from '@ethersproject/contracts';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useActiveWeb3React } from '../../hooks';
import { useMulticallContract } from '../../hooks/useContract';
import useDebounce from '../../hooks/useDebounce';
import chunkArray from '../../utils/chunkArray';
import { CancelledError, retry, RetryableError } from '../../utils/retry';
import { useBlockNumber } from '../application/hooks';
import { AppDispatch, AppState } from '../index';
import {
  Call,
  errorFetchingMulticallResults,
  fetchingMulticallResults,
  parseCallKey,
  updateMulticallResults,
} from './actions';

// TRON nodes enforce a short TVM execution timeout for constant calls. Keeping
// batches small avoids an expensive aggregate timing out and being retried.
const CALL_CHUNK_SIZE = 6;
const MIN_BLOCKS_PER_FETCH = 5;
const CHUNK_REQUEST_GAP_MS = 750;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitedOrTemporary(error: any): boolean {
  const status = error?.response?.status ?? error?.status ?? error?.statusCode;
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return status === 429 || status >= 500 || message.includes('429') || message.includes('too many requests');
}

/**
 * Fetches a chunk of calls, enforcing a minimum block number constraint
 * @param multicallContract multicall contract to fetch against
 * @param chunk chunk of calls to make
 * @param minBlockNumber minimum block number of the result set
 */
async function fetchChunk(
  multicallContract: Contract,
  chunk: Call[],
  minBlockNumber: number,
): Promise<{ results: string[]; blockNumber: number }> {
  let resultsBlockNumber, returnData;
  try {
    [resultsBlockNumber, returnData] = await multicallContract.aggregate(
      chunk.map((obj) => [obj.address, obj.callData]),
    );
  } catch (error) {
    if (isRateLimitedOrTemporary(error)) {
      throw new RetryableError('TronGrid temporarily rate limited the request');
    }
    throw error;
  }
  if (resultsBlockNumber.toNumber() < minBlockNumber) {
    console.debug(`Fetched results for old block number: ${resultsBlockNumber.toString()} vs. ${minBlockNumber}`);
    throw new RetryableError('Fetched for old block number');
  }
  return { results: returnData, blockNumber: resultsBlockNumber.toNumber() };
}

/**
 * From the current all listeners state, return each call key mapped to the
 * minimum number of blocks per fetch. This is how often each key must be fetched.
 * @param allListeners the all listeners state
 * @param chainId the current chain id
 */
export function activeListeningKeys(
  allListeners: AppState['multicall']['callListeners'],
  chainId?: number,
): { [callKey: string]: number } {
  if (!allListeners || !chainId) return {};
  const listeners = allListeners[chainId];
  if (!listeners) return {};

  return Object.keys(listeners).reduce<{ [callKey: string]: number }>((memo, callKey) => {
    const keyListeners = listeners[callKey];

    const requestedBlocksPerFetch = Object.keys(keyListeners)
      .filter((key) => {
        const blocksPerFetch = parseInt(key);
        if (blocksPerFetch <= 0) return false;
        return keyListeners[blocksPerFetch] > 0;
      })
      .reduce((previousMin, current) => {
        return Math.min(previousMin, parseInt(current));
      }, Infinity);
    memo[callKey] = Number.isFinite(requestedBlocksPerFetch)
      ? Math.max(requestedBlocksPerFetch, MIN_BLOCKS_PER_FETCH)
      : requestedBlocksPerFetch;
    return memo;
  }, {});
}

/**
 * Return the keys that need to be refetched
 * @param callResults current call result state
 * @param listeningKeys each call key mapped to how old the data can be in blocks
 * @param chainId the current chain id
 * @param latestBlockNumber the latest block number
 */
export function outdatedListeningKeys(
  callResults: AppState['multicall']['callResults'],
  listeningKeys: { [callKey: string]: number },
  chainId: number | undefined,
  latestBlockNumber: number | undefined,
): string[] {
  if (!chainId || !latestBlockNumber) return [];
  const results = callResults[chainId];
  // no results at all, load everything
  if (!results) return Object.keys(listeningKeys);

  return Object.keys(listeningKeys).filter((callKey) => {
    const blocksPerFetch = listeningKeys[callKey];

    const data = callResults[chainId][callKey];
    // no data, must fetch
    if (!data) return true;

    const minDataBlockNumber = latestBlockNumber - (blocksPerFetch - 1);

    // already fetching it for a recent enough block, don't refetch it
    if (data.fetchingBlockNumber && data.fetchingBlockNumber >= minDataBlockNumber) return false;

    // if data is older than minDataBlockNumber, fetch it
    return !data.blockNumber || data.blockNumber < minDataBlockNumber;
  });
}

export default function Updater(): null {
  const dispatch = useDispatch<AppDispatch>();
  const state = useSelector<AppState, AppState['multicall']>((state) => state.multicall);
  // wait for listeners to settle before triggering updates
  const debouncedListeners = useDebounce(state.callListeners, 100);
  const latestBlockNumber = useBlockNumber();
  const { chainId } = useActiveWeb3React();
  const multicallContract = useMulticallContract();

  const listeningKeys: { [callKey: string]: number } = useMemo(() => {
    return activeListeningKeys(debouncedListeners, chainId);
  }, [debouncedListeners, chainId]);

  const unserializedOutdatedCallKeys = useMemo(() => {
    return outdatedListeningKeys(state.callResults, listeningKeys, chainId, latestBlockNumber);
  }, [chainId, state.callResults, listeningKeys, latestBlockNumber]);

  const serializedOutdatedCallKeys = useMemo(
    () => JSON.stringify(unserializedOutdatedCallKeys.sort()),
    [unserializedOutdatedCallKeys],
  );

  useEffect(() => {
    if (!latestBlockNumber || !chainId || !multicallContract) return;

    const outdatedCallKeys: string[] = JSON.parse(serializedOutdatedCallKeys);
    if (outdatedCallKeys.length === 0) return;
    const calls = outdatedCallKeys.map((key) => parseCallKey(key));

    const chunkedCalls = chunkArray(calls, CALL_CHUNK_SIZE);

    dispatch(
      fetchingMulticallResults({
        calls,
        chainId,
        fetchingBlockNumber: latestBlockNumber,
      }),
    );

    let cancelled = false;
    let cancelCurrentRequest: (() => void) | undefined;

    const fetchSequentially = async () => {
      for (const chunk of chunkedCalls) {
        if (cancelled) return;

        const { cancel, promise } = retry(() => fetchChunk(multicallContract, chunk, latestBlockNumber), {
          n: 2,
          minWait: 3000,
          maxWait: 9000,
        });
        cancelCurrentRequest = cancel;

        try {
          const { results: returnData, blockNumber: fetchBlockNumber } = await promise;
          if (cancelled) return;

          dispatch(
            updateMulticallResults({
              chainId,
              results: chunk.reduce<{ [callKey: string]: string | null }>((memo, call, index) => {
                memo[outdatedCallKeys[calls.indexOf(call)]] = returnData[index] ?? null;
                return memo;
              }, {}),
              blockNumber: fetchBlockNumber,
            }),
          );
        } catch (error) {
          if (error instanceof CancelledError || cancelled) return;
          console.warn('Multicall request failed after retry; continuing with remaining calls', error);
          dispatch(
            errorFetchingMulticallResults({
              calls: chunk,
              chainId,
              fetchingBlockNumber: latestBlockNumber,
            }),
          );
        }

        if (!cancelled) await wait(CHUNK_REQUEST_GAP_MS);
      }
    };

    fetchSequentially();

    return () => {
      cancelled = true;
      cancelCurrentRequest?.();
    };
  }, [chainId, multicallContract, dispatch, serializedOutdatedCallKeys, latestBlockNumber]);

  return null;
}

import axios from 'axios';

type JsonRpcRequest = { method?: string; params?: unknown[] };

const readMethods = new Set([
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_accounts',
]);

const cache = new Map<string, { expiresAt: number; value: Promise<any> }>();
let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

const DEFAULT_REQUEST_INTERVAL_MS = 350;
const MAX_READ_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_500;

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const cacheTtl = positiveNumber(process.env.REACT_APP_RPC_CACHE_TTL_MS, 12_000);
// TronGrid's public endpoint starts throttling well before a burst of ten
// constant calls. Keep one shared, conservative queue for every read request.
const minRequestInterval = positiveNumber(process.env.REACT_APP_RPC_MIN_INTERVAL_MS, DEFAULT_REQUEST_INTERVAL_MS);

function rpcRequest(args: any[]): JsonRpcRequest | undefined {
  if (typeof args[0] === 'string') return { method: args[0], params: args[1] };
  if (args[0] && typeof args[0] === 'object') return args[0];
  return undefined;
}

function waitForRequestSlot(): Promise<void> {
  const slot = queue.then(async () => {
    const wait = Math.max(0, lastRequestAt + minRequestInterval - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  });
  queue = slot.catch(() => undefined);
  return slot;
}

function isRateLimitedOrTemporary(error: any): boolean {
  const status = error?.response?.status ?? error?.status ?? error?.statusCode;
  const message = String(error?.response?.data?.message ?? error?.message ?? error ?? '').toLowerCase();
  return status === 429 || status >= 500 || message.includes('429') || message.includes('too many requests');
}

function retryAfterMs(error: any, attempt: number): number {
  const retryAfter = error?.response?.headers?.['retry-after'];
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1_000;
  return RETRY_BASE_DELAY_MS * 2 ** attempt + Math.round(Math.random() * 500);
}

async function queuedReadRequest(request: () => Promise<any>): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    await waitForRequestSlot();
    try {
      return await request();
    } catch (error) {
      if (attempt >= MAX_READ_RETRIES || !isRateLimitedOrTemporary(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs(error, attempt)));
    }
  }
}

/**
 * Adds a shared cache, in-flight de-duplication and a small request gap to both
 * the read-only and wallet provider. State-changing RPC methods are never cached.
 */
export function optimizeTronProvider(provider: any): any {
  const originalRequest = provider.request.bind(provider);

  provider.request = (...args: any[]) => {
    const request = rpcRequest(args);
    const method = request?.method;
    const cacheable = Boolean(method && readMethods.has(method));
    const key = cacheable ? JSON.stringify([method, request?.params ?? []]) : undefined;
    const cached = key ? cache.get(key) : undefined;

    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached && key) cache.delete(key);

    const value = cacheable
      ? queuedReadRequest(() => originalRequest(...args))
      : waitForRequestSlot().then(() => originalRequest(...args));
    if (key) {
      cache.set(key, { expiresAt: Date.now() + cacheTtl, value });
      value.catch(() => cache.delete(key));
    }
    return value;
  };

  return provider;
}

/** TronGrid expects this header on FullNode/SolidityNode/Event API requests. */
export function configureTronGridApiKey(): void {
  const apiKey = process.env.REACT_APP_TRONGRID_API_KEY;
  if (apiKey) axios.defaults.headers.common['TRON-PRO-API-KEY'] = apiKey;
}

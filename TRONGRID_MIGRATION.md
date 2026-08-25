# TronGrid migration

## Setup

1. Create a free API key in the TronGrid dashboard.
2. Copy the values below into `.env.local`.
3. Restrict the key to the production domain in TronGrid.
4. Run `npm install`, then `npm start` or `npm run build`.

```bash
REACT_APP_NETWORK_URL=https://api.trongrid.io
REACT_APP_TRONGRID_API_KEY=replace_with_your_key
REACT_APP_RPC_POLLING_INTERVAL_MS=30000
REACT_APP_RPC_CACHE_TTL_MS=12000
REACT_APP_RPC_MIN_INTERVAL_MS=120
```

Do not commit `.env.local`. Because this is a client-side React application,
the key can still be inspected in the browser. Domain restrictions prevent
casual reuse. If the key must remain secret, route requests through a backend
or edge proxy and store the key there.

## Request reduction

- Identical concurrent read requests share one promise.
- Successful read calls are cached briefly across both providers.
- Calls are spaced to avoid bursts.
- Block polling defaults to 30 seconds instead of 15 seconds.
- Up to 100 contract reads are grouped into each multicall.
- The unused Infura WebSocket connection was removed.

Transactions and all other state-changing calls are never cached.

## Tuning

Start with the defaults above. If limits are still reached, increase polling
to `45000` or cache TTL to `20000`. Do not set the polling interval below
`10000`; the application enforces that minimum.

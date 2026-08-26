# syntax=docker/dockerfile:1
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --legacy-peer-deps \
    && npm install --no-save --legacy-peer-deps eslint-config-react-app@7.0.1
COPY public ./public
COPY src ./src
COPY tsconfig.json ./
ARG REACT_APP_CHAIN_ID=11111
ARG REACT_APP_NETWORK_URL=https://api.trongrid.io
ARG REACT_APP_TRON_NETWORK=mainnet
ARG REACT_APP_RPC_POLLING_INTERVAL_MS=30000
ARG REACT_APP_RPC_CACHE_TTL_MS=12000
ARG REACT_APP_RPC_MIN_INTERVAL_MS=120
ENV REACT_APP_CHAIN_ID=$REACT_APP_CHAIN_ID \
    REACT_APP_NETWORK_URL=$REACT_APP_NETWORK_URL \
    REACT_APP_TRON_NETWORK=$REACT_APP_TRON_NETWORK \
    REACT_APP_RPC_POLLING_INTERVAL_MS=$REACT_APP_RPC_POLLING_INTERVAL_MS \
    REACT_APP_RPC_CACHE_TTL_MS=$REACT_APP_RPC_CACHE_TTL_MS \
    REACT_APP_RPC_MIN_INTERVAL_MS=$REACT_APP_RPC_MIN_INTERVAL_MS \
    GENERATE_SOURCEMAP=false \
    BROWSERSLIST_IGNORE_OLD_DATA=true
RUN --mount=type=secret,id=trongrid_api_key \
    REACT_APP_TRONGRID_API_KEY="$(cat /run/secrets/trongrid_api_key 2>/dev/null || true)" npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3010/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]

# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts

RUN npm ci

COPY public ./public
COPY src ./src
COPY tsconfig.json ./

ARG REACT_APP_CHAIN_ID=11111
ARG REACT_APP_TRONGRID_API_KEY

ENV REACT_APP_CHAIN_ID=${REACT_APP_CHAIN_ID}
ENV REACT_APP_TRONGRID_API_KEY=${REACT_APP_TRONGRID_API_KEY}
ENV GENERATE_SOURCEMAP=false
ENV BROWSERSLIST_IGNORE_OLD_DATA=true

RUN npm run build


FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3010/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
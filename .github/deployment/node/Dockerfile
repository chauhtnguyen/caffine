# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS assets
WORKDIR /app

COPY ./packages/backend/server /app
COPY ./packages/frontend/apps/web/dist /app/static
COPY ./packages/frontend/admin/dist /app/static/admin
COPY ./packages/frontend/apps/mobile/dist /app/static/mobile

# Keep server sourcemap for stacktraces, but don't ship frontend/node_modules sourcemaps.
ARG TARGETARCH
ARG TARGETVARIANT
# Needed for Prisma engine resolution (and potential engine download during cleanup).
RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl ca-certificates && \
  rm -rf /var/lib/apt/lists/*

# When built on Mac, node_modules has Darwin optional deps only. Install Linux optional deps
# for current arch only (npm rejects platform-mismatched packages).
RUN mkdir -p /tmp/linux-deps && \
  case "${TARGETARCH}" in \
    arm64) echo '{"dependencies":{"@node-rs/argon2-linux-arm64-gnu":"2.0.2","@node-rs/crc32-linux-arm64-gnu":"1.10.6"}}' > /tmp/linux-deps/package.json ;; \
    amd64) echo '{"dependencies":{"@node-rs/argon2-linux-x64-gnu":"2.0.2","@node-rs/crc32-linux-x64-gnu":"1.10.6"}}' > /tmp/linux-deps/package.json ;; \
    arm) echo '{"dependencies":{"@node-rs/argon2-linux-arm-gnueabihf":"2.0.2","@node-rs/crc32-linux-arm-gnueabihf":"1.10.6"}}' > /tmp/linux-deps/package.json ;; \
    *) echo "Unsupported TARGETARCH: ${TARGETARCH}" && exit 1 ;; \
  esac && \
  cd /tmp/linux-deps && npm install --omit=dev && \
  cp -r node_modules/@node-rs/* /app/node_modules/@node-rs/ && \
  rm -rf /tmp/linux-deps

RUN AFFINE_DOCKER_CLEAN=1 TARGETARCH="${TARGETARCH}" TARGETVARIANT="${TARGETVARIANT}" node ./scripts/docker-clean.mjs

FROM node:22-bookworm-slim
WORKDIR /app

COPY --from=assets /app /app

RUN apt-get update && \
  apt-get install -y --no-install-recommends openssl libjemalloc2 && \
  rm -rf /var/lib/apt/lists/*

# Enable jemalloc by preloading the library
ENV LD_PRELOAD=libjemalloc.so.2

EXPOSE 3010

CMD ["node", "./dist/main.js"]

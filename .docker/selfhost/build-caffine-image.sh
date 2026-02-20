#!/usr/bin/env bash
# Build Docker image for the custom Caffine branch (Postgres 17 external).
# Run from repo root: .docker/selfhost/build-caffine-image.sh
# Or from .docker/selfhost: ./build-caffine-image.sh (script cd's to repo root).

set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# Use the same Node version as upstream AFFiNE (.nvmrc). Required for correct workspace resolution.
if [ -f .nvmrc ]; then
  if [ -n "$NVM_DIR" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh" && nvm use
  elif command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env)" 2>/dev/null && fnm use
  fi
fi
NODE_VER=$(node -p 'process.versions.node')
echo "[caffine] Using Node $NODE_VER (upstream .nvmrc: $(cat .nvmrc 2>/dev/null || echo '?'))."

echo "[caffine] Ensuring dependencies (yarn install)..."
yarn install

echo "[caffine] Building server native addon (Rust/NAPI; required before server build)..."
yarn workspace @affine/server-native build
NATIVE_DIR="$REPO_ROOT/packages/backend/native"
if [ ! -f "$NATIVE_DIR/server-native.node" ]; then
  echo "[caffine] ERROR: server-native.node not produced. Install Rust (e.g. rustup) and ensure the native addon builds."
  echo "  Run manually: yarn workspace @affine/server-native build"
  exit 1
fi
# Webpack resolves all require() paths; ensure arch-specific names exist so bundle succeeds.
for name in server-native.arm64.node server-native.x64.node server-native.armv7.node; do
  [ ! -f "$NATIVE_DIR/$name" ] && cp "$NATIVE_DIR/server-native.node" "$NATIVE_DIR/$name"
done

echo "[caffine] Building server..."
yarn workspace @affine/server build
SERVER_DIST="$REPO_ROOT/packages/backend/server/dist/main.js"
if [ ! -f "$SERVER_DIST" ]; then
  echo "[caffine] ERROR: Server build did not produce dist/main.js (e.g. webpack failed). Cannot continue."
  echo "  Expected: $SERVER_DIST"
  echo "  Run manually: yarn workspace @affine/server build"
  exit 1
fi

echo "[caffine] Building web..."
BUILD_TYPE=canary yarn affine @affine/web build

echo "[caffine] Building admin..."
BUILD_TYPE=canary yarn affine @affine/admin build

echo "[caffine] Building mobile..."
BUILD_TYPE=canary yarn affine @affine/mobile build

# When building on Mac, dist/ has Darwin .node binaries. Build Linux server-native in a container
# and overwrite dist/ so the Docker image gets valid Linux ELF binaries.
if [ "$(uname -s)" = "Darwin" ]; then
  echo "[caffine] Building server-native for Linux (container; dist has Darwin binaries)..."
  # Use npx to run @napi-rs/cli directly instead of yarn workspace, which fails because
  # the host node_modules (macOS binaries) are volume-mounted and don't work on Linux.
  docker run --rm --platform linux/arm64 \
    -v "$REPO_ROOT:/workspace:rw" \
    -w /workspace/packages/backend/native \
    node:22-bookworm bash -c '
      set -e
      apt-get update -qq && apt-get install -y -qq build-essential curl pkg-config libssl-dev >/dev/null 2>&1
      rm -rf /var/lib/apt/lists/*
      curl -sSf https://sh.rustup.rs | sh -s -- -y -q
      . ~/.cargo/env
      echo "[container] Rust $(rustc --version)"
      npx --yes -p @napi-rs/cli@3.5.0 napi build --release --strip --no-const-enum
      echo "[container] Build done. Output:"
      ls -la server-native*.node 2>/dev/null || echo "(no .node files found!)"
    ' || { echo "[caffine] ERROR: Linux server-native build failed"; exit 1; }
  # napi outputs server-native.node (current platform) or server-native.linux-arm64-gnu.node
  NATIVE_OUT="$REPO_ROOT/packages/backend/native"
  LINUX_NODE=""
  for f in server-native.linux-arm64-gnu.node server-native.node; do
    # Only accept the file if it's actually a Linux ELF binary (not leftover macOS Mach-O)
    if [ -f "$NATIVE_OUT/$f" ] && file "$NATIVE_OUT/$f" | grep -q "ELF"; then
      LINUX_NODE="$NATIVE_OUT/$f"
      break
    fi
  done
  if [ -z "$LINUX_NODE" ]; then
    echo "[caffine] ERROR: No Linux ELF .node binary found in $NATIVE_OUT"
    echo "  Files present:"
    for f in "$NATIVE_OUT"/server-native*.node; do
      [ -f "$f" ] && echo "    $(ls -la "$f") — $(file --brief "$f")"
    done
    exit 1
  fi
  cp "$LINUX_NODE" "$REPO_ROOT/packages/backend/server/dist/server-native.arm64.node"
  echo "[caffine] Replaced dist/server-native.arm64.node with Linux binary ($(file --brief "$LINUX_NODE"))"
fi

# Match upstream CI: force Linux optional deps (x64/arm64/arm glibc) so the image works
# when built on non-Linux (e.g. Mac). Without this, node_modules would have Darwin deps only.
echo "[caffine] Preparing server for Docker (production deps + Prisma)..."
yarn config set --json supportedArchitectures.cpu '["x64", "arm64", "arm"]'
yarn config set --json supportedArchitectures.libc '["glibc"]'
yarn workspaces focus @affine/server --production
yarn workspace @affine/server prisma generate
mv node_modules packages/backend/server/node_modules

echo "[caffine] Building Docker image caffine:latest..."
docker build -f .github/deployment/node/Dockerfile -t caffine:latest .

echo "[caffine] Restoring workspace (yarn install)..."
rm -rf packages/backend/server/node_modules
yarn config unset supportedArchitectures.cpu 2>/dev/null || true
yarn config unset supportedArchitectures.libc 2>/dev/null || true
yarn install
# Restore Mac server-native binaries if we overwrote them with Linux build
if [ "$(uname -s)" = "Darwin" ]; then
  echo "[caffine] Rebuilding server-native for Mac (local dev)..."
  yarn workspace @affine/server-native build
  for name in server-native.arm64.node server-native.x64.node server-native.armv7.node; do
    [ ! -f "$NATIVE_DIR/$name" ] && cp "$NATIVE_DIR/server-native.node" "$NATIVE_DIR/$name"
  done
fi

echo "[caffine] Done. Run from .docker/selfhost: docker compose -f compose.external-postgres.yml up -d (ensure .env has AFFINE_IMAGE=caffine:latest and DATABASE_URL for Postgres 17)"

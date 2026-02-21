# Build and Configure CAFFiNE to Connect to Your Database

**Your Database:** PostgreSQL 17.7 at `localhost:5432/caffine`  
**Date:** 2026-02-21

---

## Step 1: Create Server Configuration

```bash
# Navigate to server directory
cd ~/projects/caffine/packages/backend/server

# Create .env file
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine"

# Redis Configuration  
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379

# Server Configuration
NODE_ENV=development
AFFINE_SERVER_HOST=localhost
AFFINE_SERVER_PORT=3010
AFFINE_SERVER_HTTPS=false

# Features
AFFINE_INDEXER_ENABLED=true
EOF

echo "✓ Created .env file with database connection"
```

---

## Step 2: Build Native Dependencies

**Note:** This runs on your Mac, not the VM. The native module must be built for macOS ARM64.

```bash
# Navigate to project root
cd ~/projects/caffine

# Install dependencies if not done
yarn install

# Build native Rust module (@affine/server-native)
yarn affine @affine/server-native build

# Expected output:
# Building @affine/server-native...
# Compiling Rust code...
# Build completed successfully

# This takes 5-10 minutes on first build
# Output: packages/backend/native/index.node

# Build reader package
yarn affine @affine/reader build

# Expected output:
# Building @affine/reader...
# Build completed
```

---

## Step 3: Verify Build Outputs

```bash
# Check native module exists
ls -la ~/projects/caffine/packages/backend/native/index.node

# Check reader build
ls -la ~/projects/caffine/packages/common/reader/dist/

# Both should exist and be recent
```

---

## Step 4: Test Database Connection

```bash
cd ~/projects/caffine/packages/backend/server

# Test Prisma connection
yarn prisma db execute --stdin <<< "SELECT COUNT(*) FROM users;"

# Expected output: Shows user count (you have 1 user)
```

---

## Step 5: Start Server

```bash
# Navigate to project root
cd ~/projects/caffine

# Start server
yarn affine server dev

# Expected output:
# [Nest] Starting Nest application...
# [Nest] Server initialized
# [Nest] Listening on http://localhost:3010
# [GraphQL] Playground available at http://localhost:3010/graphql

# Server is running and connected to your PostgreSQL database
```

---

## Step 6: Verify Server is Connected

**Open new terminal:**

```bash
# Test health endpoint
curl http://localhost:3010/api/healthz

# Expected: {"status":"ok"}

# Check server can query database
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { serverConfig { version } }"}'

# Should return server version info
```

---

## Configuration for iOS/iPad/macOS Apps

### For Web Frontend (Development)

```bash
# In another terminal
cd ~/projects/caffine

# Start frontend
yarn dev

# Select "web" when prompted
# Opens on http://localhost:8080
# Automatically connects to backend at http://localhost:3010
```

### For Desktop App (macOS Electron)

```bash
cd ~/projects/caffine/packages/frontend/apps/electron

# Create/edit .env if needed
cat > .env << 'EOF'
# Points to your local server
AFFINE_SERVER_URL=http://localhost:3010
EOF

# Build desktop app
yarn affine @affine/electron build

# Or run in dev mode
yarn affine @affine/electron dev
```

The desktop app will connect to `http://localhost:3010` automatically.

### For iOS App

```bash
cd ~/projects/caffine/packages/frontend/apps/ios

# Edit Capacitor config to point to your Mac
nano App/capacitor.config.ts
```

**Add/modify server configuration:**

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.affine.app',
  appName: 'CAFFiNE',
  webDir: 'dist',
  server: {
    // Development: point to your Mac's local server
    url: 'http://localhost:3010',  // or your Mac's IP
    cleartext: true  // Allow HTTP (not HTTPS)
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
```

**For network access from iOS device:**

```bash
# Find your Mac's IP
ipconfig getifaddr en0
# Example: 192.168.1.100

# Update server config
nano ~/projects/caffine/packages/backend/server/.env

# Change:
AFFINE_SERVER_HOST=192.168.1.100
AFFINE_SERVER_EXTERNAL_URL=http://192.168.1.100:3010

# Update iOS capacitor config
nano ~/projects/caffine/packages/frontend/apps/ios/App/capacitor.config.ts

# Change server.url to:
url: 'http://192.168.1.100:3010'
```

**Build iOS app:**

```bash
cd ~/projects/caffine/packages/frontend/apps/ios

# Build for iOS
BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/ios build

# Sync to Xcode project
yarn affine @affine/ios cap sync

# Open in Xcode
yarn affine @affine/ios cap open ios
```

---

## Database Connection Summary

**All builds will connect to:**
- **Database:** `postgresql://caffine:caffine@localhost:5432/caffine`
- **Redis:** `localhost:6379`
- **Server:** `http://localhost:3010`

**Configuration locations:**

1. **Server:** `packages/backend/server/.env`
   - Contains `DATABASE_URL`
   - Server reads this on startup

2. **Frontend (web):** Auto-detects backend at `localhost:3010`
   - No config needed for development

3. **Desktop app (Electron):** 
   - Can set `AFFINE_SERVER_URL` in app settings
   - Or configure in `packages/frontend/apps/electron/.env`

4. **iOS app:**
   - Configure in `packages/frontend/apps/ios/App/capacitor.config.ts`
   - Set `server.url` to your Mac's IP for network access

---

## Environment Variable Priority

CAFFiNE server reads config in this order:

1. **Environment variables** (highest priority)
2. **`.env` file** in `packages/backend/server/`
3. **Default values** (hardcoded)

So your `.env` file will override defaults.

---

## Troubleshooting Build Issues

### Native module build fails

```bash
# Check Rust toolchain
rustc --version
cargo --version

# Should match version in rust-toolchain.toml
cat ~/projects/caffine/rust-toolchain.toml

# Update Rust if needed
rustup update stable

# Clean and rebuild
cd ~/projects/caffine
yarn affine @affine/server-native clean
yarn affine @affine/server-native build
```

### Server can't connect to database

```bash
# Test database directly
psql postgresql://caffine:caffine@localhost:5432/caffine -c "SELECT version();"

# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check .env file syntax
cat ~/projects/caffine/packages/backend/server/.env | grep DATABASE_URL

# No spaces around = sign!
# Correct: DATABASE_URL="postgresql://..."
# Wrong:   DATABASE_URL = "postgresql://..."
```

### Server can't connect to Redis

```bash
# Check Redis running
redis-cli ping

# Start if not running
brew services start redis

# Check port
redis-cli -p 6379 ping
```

---

## Quick Start Script

Save this as `start-caffine.sh`:

```bash
#!/bin/bash
set -e

echo "=== Starting CAFFiNE Server ==="

# Check prerequisites
echo "Checking PostgreSQL..."
pg_isready -h localhost -p 5432 || { echo "PostgreSQL not running!"; exit 1; }

echo "Checking Redis..."
redis-cli ping > /dev/null || { echo "Redis not running! Run: brew services start redis"; exit 1; }

echo "Checking database..."
psql postgresql://caffine:caffine@localhost:5432/caffine -c "SELECT 1;" > /dev/null || { echo "Can't connect to database!"; exit 1; }

echo "Starting server..."
cd ~/projects/caffine
yarn affine server dev
```

**Usage:**
```bash
chmod +x start-caffine.sh
./start-caffine.sh
```

---

## Next Steps After Build

1. **Start server:** `yarn affine server dev`
2. **Test health:** `curl http://localhost:3010/api/healthz`
3. **Start frontend:** `yarn dev` (in another terminal)
4. **Access:** http://localhost:8080
5. **Build iOS app** (if needed, see iOS section above)

Your database is ready with:
- ✓ 52 tables (fully migrated)
- ✓ 1 user
- ✓ pgvector enabled
- ✓ All schemas up to date

Just need to build native modules and start the server!

# CAFFiNE App Connection Guide

How to configure each CAFFiNE app to connect to your PostgreSQL database.

**Your Database:** `postgresql://caffine:caffine@localhost:5432/caffine`  
**Your Server:** `http://localhost:3010` (or your Mac's IP for iOS/iPad)

---

## Connection Architecture

```
┌─────────────────────────────────────────┐
│  Apps (Web/Desktop/iOS/iPad)            │
│  - Connect via HTTP/WebSocket           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  CAFFiNE Server (Node.js)               │
│  - Port 3010                            │
│  - GraphQL API                          │
│  - WebSocket sync                       │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴───────┐
        ▼              ▼
┌──────────────┐  ┌──────────┐
│ PostgreSQL   │  │  Redis   │
│ Port 5432    │  │ Port 6379│
│              │  │          │
│ - Documents  │  │ - Cache  │
│ - Users      │  │ - Queue  │
│ - Blobs      │  │ - Sessions│
└──────────────┘  └──────────┘
```

**Key Point:** Apps don't connect directly to PostgreSQL. They connect to the CAFFiNE server, which handles database operations.

---

## Server Configuration (Required)

**File:** `~/projects/caffine/packages/backend/server/.env`

```bash
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine"
REDIS_SERVER_HOST=localhost
NODE_ENV=development
AFFINE_SERVER_HOST=localhost
AFFINE_SERVER_PORT=3010
```

This configuration is already created by `configure-and-build.sh`.

---

## 1. Web Frontend (Development)

**Location:** `packages/frontend/apps/web/`

**Configuration:** Auto-detects backend

```bash
# Start server first
cd ~/projects/caffine
yarn affine server dev
# Runs on http://localhost:3010

# In another terminal, start frontend
yarn dev
# Select "web" when prompted
# Runs on http://localhost:8080
# Automatically connects to http://localhost:3010
```

**No manual configuration needed** - frontend dev server auto-detects backend.

**Access:** http://localhost:8080

---

## 2. macOS Desktop App (Electron)

**Location:** `packages/frontend/apps/electron/`

### Option A: Development Mode

```bash
cd ~/projects/caffine

# Start server first
yarn affine server dev
# Runs on http://localhost:3010

# In another terminal, start Electron app
yarn affine @affine/electron dev

# App automatically connects to http://localhost:3010
```

### Option B: Production Build

```bash
# Build Electron app
cd ~/projects/caffine/packages/frontend/apps/electron
yarn affine @affine/electron build

# App package created in:
# packages/frontend/apps/electron/out/

# Install and run
# On first launch, configure server in app settings:
# Settings > Account > Server URL: http://localhost:3010
```

**Server URL Configuration:**

The desktop app can be configured via:
1. **In-app settings** (recommended): Settings > Account > Server URL
2. **Environment variable:** `AFFINE_SERVER_URL=http://localhost:3010`
3. **Config file:** App stores last-used server URL in user preferences

---

## 3. iOS App (iPhone/iPad)

**Location:** `packages/frontend/apps/ios/`

iOS apps need explicit server URL configuration.

### Development Build (Testing on Simulator)

```bash
cd ~/projects/caffine/packages/frontend/apps/ios

# Edit Capacitor config
nano App/capacitor.config.ts
```

**Configuration for localhost (simulator only):**

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.affine.app',
  appName: 'CAFFiNE',
  webDir: 'dist',
  server: {
    url: 'http://localhost:3010',
    cleartext: true  // Allow HTTP
  }
};

export default config;
```

**Build and run:**

```bash
# Build app bundle
BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/ios build

# Sync to Xcode
yarn affine @affine/ios sync:dev

# Open in Xcode
yarn affine @affine/ios cap open ios

# Run on simulator
# App connects to http://localhost:3010
```

### Physical Device (iPhone/iPad on WiFi)

For real devices, you need your **Mac's local IP address**.

**Step 1: Find Mac IP**

```bash
# Get Mac's local IP
ipconfig getifaddr en0
# Example output: 192.168.1.100
```

**Step 2: Update Server Config**

```bash
# Edit server .env
nano ~/projects/caffine/packages/backend/server/.env

# Change:
AFFINE_SERVER_HOST=192.168.1.100  # Your Mac's IP
AFFINE_SERVER_EXTERNAL_URL=http://192.168.1.100:3010

# Restart server
cd ~/projects/caffine
yarn affine server dev
```

**Step 3: Update iOS Capacitor Config**

```bash
nano ~/projects/caffine/packages/frontend/apps/ios/App/capacitor.config.ts
```

```typescript
const config: CapacitorConfig = {
  appId: 'pro.affine.app',
  appName: 'CAFFiNE',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.100:3010',  // Your Mac's IP
    cleartext: true
  }
};
```

**Step 4: Configure macOS Firewall**

```bash
# Allow Node.js through firewall
# System Settings > Network > Firewall > Options
# Click "+" and add /usr/local/bin/node
# Set to "Allow incoming connections"

# Or via command line:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

**Step 5: Build and Deploy**

```bash
cd ~/projects/caffine/packages/frontend/apps/ios

# Build
BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/ios build

# Sync
yarn affine @affine/ios cap sync

# Open in Xcode
yarn affine @affine/ios cap open ios

# In Xcode:
# 1. Select your iPhone/iPad as target
# 2. Click Run
# 3. App connects to http://192.168.1.100:3010
```

**Step 6: Test Connection**

On iPhone/iPad Safari, test:
```
http://192.168.1.100:3010/api/healthz
```

Should show: `{"status":"ok"}`

---

## 4. iPad App (Same as iOS)

Follow iOS instructions above. iPadOS uses same configuration as iOS.

---

## Configuration Summary Table

| App | Server URL | Config Location |
|-----|-----------|----------------|
| **Server** | - | `packages/backend/server/.env` |
| **Web (dev)** | http://localhost:3010 | Auto-detected |
| **Desktop (dev)** | http://localhost:3010 | Auto-detected |
| **Desktop (prod)** | http://localhost:3010 | In-app settings or env var |
| **iOS Simulator** | http://localhost:3010 | `ios/App/capacitor.config.ts` |
| **iOS Physical** | http://YOUR_MAC_IP:3010 | `ios/App/capacitor.config.ts` |
| **iPad** | http://YOUR_MAC_IP:3010 | Same as iOS |

---

## Dynamic Server Configuration (Future)

For production use, you may want to implement:

### Server Discovery UI

Add a "Server URL" input on app first launch:

```typescript
// In app code
const serverUrl = await promptUserForServerUrl();
// Save to local storage/preferences
// Use for all API calls
```

### QR Code Setup

Generate QR code on server dashboard:
```
http://192.168.1.100:3010/setup?token=abc123
```

Scan with mobile app to auto-configure.

### Environment-based Configuration

```bash
# For iOS app
# Create different configs for dev/staging/prod

# ios/App/capacitor.config.dev.ts
const config = {
  server: { url: 'http://localhost:3010' }
};

# ios/App/capacitor.config.prod.ts
const config = {
  server: { url: 'https://your-production-domain.com' }
};
```

---

## Troubleshooting Connections

### Web/Desktop can't connect to server

```bash
# Check server is running
curl http://localhost:3010/api/healthz

# Check server logs
# (in terminal where you ran `yarn affine server dev`)

# Verify .env file
cat ~/projects/caffine/packages/backend/server/.env
```

### iOS can't connect to server

```bash
# 1. Test from iOS Safari
# Navigate to: http://YOUR_MAC_IP:3010/api/healthz

# 2. Check server is bound to network interface
# In .env, use Mac's IP, not 0.0.0.0 or localhost

# 3. Check macOS firewall
# System Settings > Network > Firewall
# Ensure Node.js is allowed

# 4. Check same WiFi network
# Mac and iPhone/iPad must be on same network

# 5. Check Capacitor config
cat ~/projects/caffine/packages/frontend/apps/ios/App/capacitor.config.ts
```

### Database connection errors

```bash
# Server can't connect to database

# Check PostgreSQL running
pg_isready -h localhost -p 5432

# Check credentials in .env
cat ~/projects/caffine/packages/backend/server/.env | grep DATABASE_URL

# Test connection manually
psql postgresql://caffine:caffine@localhost:5432/caffine -c "SELECT 1;"
```

---

## Network Topologies

### Option 1: Local Development (All on Mac)

```
Mac
├── PostgreSQL :5432
├── Redis :6379
├── CAFFiNE Server :3010
├── Web Browser → http://localhost:8080
└── Desktop App → http://localhost:3010
```

### Option 2: Local Network (Mac + iOS/iPad)

```
Mac (192.168.1.100)
├── PostgreSQL :5432
├── Redis :6379
└── CAFFiNE Server :3010

iPhone (192.168.1.50)
└── CAFFiNE App → http://192.168.1.100:3010

iPad (192.168.1.51)
└── CAFFiNE App → http://192.168.1.100:3010
```

### Option 3: Tailscale VPN (Remote Access)

```
Mac (Tailscale: 100.64.0.1)
├── PostgreSQL :5432
├── Redis :6379
└── CAFFiNE Server :3010

iPhone (Tailscale: 100.64.0.2)
└── CAFFiNE App → http://100.64.0.1:3010
  (works anywhere with internet)
```

---

## Quick Reference: Starting Everything

```bash
# Terminal 1: Start PostgreSQL (if not auto-started)
brew services start postgresql@17

# Terminal 2: Start Redis (if not auto-started)
brew services start redis

# Terminal 3: Start CAFFiNE Server
cd ~/projects/caffine
yarn affine server dev

# Terminal 4: Start Web Frontend (optional)
cd ~/projects/caffine
yarn dev

# Terminal 5: Start Desktop App (optional)
cd ~/projects/caffine
yarn affine @affine/electron dev
```

**Access:**
- Web: http://localhost:8080
- Desktop: Electron window opens automatically
- iOS/iPad: Install via Xcode

---

## Security Notes

### Development (Current Setup)

- HTTP only (no HTTPS)
- Cleartext passwords in .env (okay for local dev)
- No authentication required for local connections
- Firewall allows incoming on port 3010

### Production Recommendations

1. **Use HTTPS** - Get SSL cert (Let's Encrypt or self-signed)
2. **Secure .env** - Use environment variables, not committed files
3. **Firewall rules** - Restrict to known IPs/networks
4. **VPN** - Use Tailscale instead of public internet
5. **Database password** - Use strong password, not "caffine"
6. **Redis password** - Configure Redis auth

---

All apps are now configured to connect through your CAFFiNE server to the PostgreSQL database at `localhost:5432/caffine`.

**Next:** Run `./configure-and-build.sh` to build everything!

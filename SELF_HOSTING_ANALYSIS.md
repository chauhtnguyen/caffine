# CAFFiNE Self-Hosting Analysis for macOS/iOS/iPadOS Sync

**Date:** 2026-02-20  
**Prepared for:** Chau Nguyen  
**Prepared by:** Virgil Clemens

## Executive Summary

CAFFiNE (AFFiNE fork) already has built-in self-hosting capabilities with full cross-device sync. The architecture uses:

- **PostgreSQL** (with pgvector extension) for data storage
- **Redis** for real-time collaboration
- **Y-CRDT** (via y-octo) for conflict-free document merging
- **Docker Compose** for easy deployment

You can host the server on your macOS machine and have all iOS/iPadOS/macOS apps sync to it.

## Architecture Overview

### Data Storage Stack

```
┌─────────────────────────────────────────┐
│  Clients (macOS/iOS/iPadOS Apps)        │
│  - Use Capacitor framework              │
│  - Connect via WebSocket + HTTP         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  AFFiNE Server (Node.js/NestJS)         │
│  - GraphQL API                          │
│  - WebSocket for real-time sync         │
│  - REST endpoints for blob storage      │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴───────┐
        ▼              ▼
┌──────────────┐  ┌──────────┐
│ PostgreSQL   │  │  Redis   │
│ (+ pgvector) │  │          │
│              │  │          │
│ - Snapshots  │  │ - Cache  │
│ - Updates    │  │ - Queue  │
│ - Blobs      │  │          │
└──────────────┘  └──────────┘
```

### Key Components

1. **PostgreSQL Database**
   - Stores document snapshots (full state)
   - Stores incremental updates (CRDT operations)
   - Stores user data, permissions, workspaces
   - Stores binary blobs (images, attachments)
   - Uses pgvector extension for AI embeddings

2. **Redis**
   - Real-time collaboration queue
   - Session management
   - Caching layer

3. **Y-CRDT Sync Engine (y-octo)**
   - Rust-based CRDT implementation
   - Compatible with Yjs (JavaScript)
   - Handles conflict-free merges
   - Thread-safe collaborative editing

## How Data Sync Works

### Document State Management

Every document in CAFFiNE has:

1. **Snapshot** - Full document state at a point in time (stored as binary CRDT blob)
2. **Updates** - Incremental changes since last snapshot (CRDT operations)
3. **History** - Past snapshots for version control

```sql
-- Core schema (simplified)
Snapshot {
  workspaceId  String
  id           String  (doc ID)
  blob         Bytes   (CRDT state)
  createdAt    DateTime
  updatedAt    DateTime
}

Update {
  workspaceId  String
  id           String  (doc ID)
  blob         Bytes   (CRDT operation)
  createdAt    DateTime
}
```

### Sync Flow

```
Client A (iOS)                    Server                    Client B (macOS)
     │                              │                              │
     │ ───── connect ──────────────►│                              │
     │                              │◄──── connect ────────────────│
     │                              │                              │
     │ ─── edit document ───►       │                              │
     │   (send CRDT update)         │                              │
     │                              │── broadcast update ────────► │
     │                              │   (WebSocket push)           │
     │                              │                              │
     │                        [Store update]                       │
     │                        [Merge into snapshot]                │
     │                              │                              │
     │◄─── ack ─────────────────────│                              │
     │                              │                              │
```

### Offline Support

- Clients can work offline and accumulate CRDT updates locally
- When reconnected, they send accumulated updates to server
- Server merges using CRDT algorithm (conflict-free)
- Other clients receive the merged state

## Self-Hosting Options

### Option 1: Docker Compose (Recommended)

**Location:** `.docker/selfhost/`

Pre-configured stack includes:
- AFFiNE server container
- PostgreSQL with pgvector
- Redis
- Automated migrations

**Setup Steps:**

```bash
# 1. Navigate to project
cd ~/projects/caffine

# 2. Copy environment config
cp .docker/selfhost/.env.example .docker/selfhost/.env

# 3. Edit .env file
nano .docker/selfhost/.env

# Key settings:
AFFINE_SERVER_HOST=your-mac-hostname.local  # or IP address
AFFINE_SERVER_HTTPS=false  # or true if using SSL
PORT=3010
DB_DATA_LOCATION=~/.affine/self-host/postgres/pgdata
UPLOAD_LOCATION=~/.affine/self-host/storage

# 4. Start services
cd .docker/selfhost
docker-compose up -d

# 5. Server will be available at:
# http://your-mac-hostname.local:3010
```

**Pros:**
- Easy to deploy (one command)
- Automatic updates (pull new images)
- Isolated from development environment
- Production-ready configuration

**Cons:**
- Requires Docker Desktop on macOS
- Slightly more resource overhead

### Option 2: Native Development Server

**Location:** `packages/backend/server/`

Run the server directly with Node.js (for development/testing).

**Setup Steps:**

```bash
# 1. Install dependencies
yarn install

# 2. Set up local dev services (Postgres + Redis)
cp .docker/dev/compose.yml.example .docker/dev/compose.yml
cp .docker/dev/.env.example .docker/dev/.env
docker-compose -f .docker/dev/compose.yml up -d

# 3. Build native packages
yarn affine @affine/server-native build

# 4. Build reader package
yarn affine @affine/reader build

# 5. Configure server
cp packages/backend/server/.env.example packages/backend/server/.env
nano packages/backend/server/.env

# 6. Initialize database
yarn affine server init

# 7. Start server
yarn affine server dev

# 8. (Optional) Start web frontend
yarn dev
```

**Pros:**
- Full control over server code
- Easy to customize and debug
- Can modify source code directly

**Cons:**
- More manual setup
- Need to manage Rust toolchain
- Requires more technical knowledge

## Connecting Mobile Apps

### iOS/iPadOS Configuration

The iOS app is built with Capacitor and can connect to any AFFiNE server.

**Build Location:** `packages/frontend/apps/ios/`

**Configuration:**

1. **Development Mode (Live Reload):**
```bash
# Start web dev server
yarn dev  # select 'ios' distribution

# Sync with custom server URL
CAP_SERVER_URL=http://your-mac-ip:8080 yarn affine @affine/ios sync:dev

# Open in Xcode
yarn affine @affine/ios cap open ios
```

2. **Production Build:**
```bash
# Build for production
BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/ios build

# Sync to iOS project
yarn affine @affine/ios cap sync

# Open in Xcode
yarn affine @affine/ios cap open ios
```

**In-App Server Configuration:**

The app needs to know your server URL. This is typically configured during:
- First launch (server selection screen)
- Or hardcoded in build config

You'll want to modify the app to point to your local server:
- Edit `packages/frontend/apps/ios/App/capacitor.config.ts`
- Or provide runtime server URL input in the app

### macOS Desktop App

**Build Location:** `packages/frontend/apps/electron/`

The Electron app can be configured similarly:

```bash
# Build desktop app
yarn affine @affine/electron build

# Or run in dev mode
yarn affine @affine/electron dev
```

**Server Configuration:**
- Usually configured via GUI settings after launch
- Or environment variable during build

## Network Setup for Cross-Device Access

### Local Network (Same WiFi)

**Recommended for home use:**

1. Find your Mac's local IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Example: 192.168.1.100
```

2. Set server host to this IP:
```bash
# In .docker/selfhost/.env
AFFINE_SERVER_HOST=192.168.1.100
PORT=3010
```

3. Configure iOS/iPad apps to connect to:
```
http://192.168.1.100:3010
```

**Pros:**
- No external dependencies
- Fast local network speeds
- Private (not exposed to internet)

**Cons:**
- Only works on same WiFi network
- IP might change (use static IP or hostname.local)

### Tailscale VPN (Recommended for Remote Access)

**Best for:** Access from anywhere (home, office, travel)

1. Install Tailscale on Mac and iOS devices
2. Each device gets a permanent Tailscale IP (e.g., 100.x.x.x)
3. Configure server to use Tailscale IP
4. Mobile apps can reach server even on different networks

**Pros:**
- Secure encrypted tunnel
- Works anywhere with internet
- Stable IP addresses
- No port forwarding needed

**Cons:**
- Requires Tailscale account
- Extra software to install

### Port Forwarding (Not Recommended)

Exposing server directly to internet via router port forwarding.

**Cons:**
- Security risk
- Need dynamic DNS for changing public IP
- Firewall configuration complexity

## Storage Persistence

### What Gets Stored

```
~/.affine/self-host/
├── postgres/
│   └── pgdata/              # PostgreSQL database files
│       ├── workspaces/      # Workspace metadata
│       ├── snapshots/       # Document snapshots (CRDT blobs)
│       ├── updates/         # Incremental updates
│       ├── blobs/           # Binary attachments metadata
│       └── users/           # User accounts
│
├── storage/                 # Actual file uploads
│   └── blobs/              # Images, PDFs, attachments
│       └── {workspace-id}/
│           └── {blob-id}
│
└── config/                  # Server configuration
    └── config.json         # Runtime settings
```

### Data Volume Estimates

- **Text documents:** ~1-10 KB per doc (compressed CRDT)
- **Images:** Original file size (no re-encoding)
- **Updates queue:** Usually small (merged into snapshots periodically)
- **Typical workspace:** 100-500 MB for 1000 docs with images

### Backup Strategy

```bash
# Stop server
docker-compose -f .docker/selfhost/compose.yml down

# Backup database
cp -r ~/.affine/self-host/postgres/pgdata ~/backups/affine-db-$(date +%F)

# Backup file storage
cp -r ~/.affine/self-host/storage ~/backups/affine-storage-$(date +%F)

# Restart server
docker-compose -f .docker/selfhost/compose.yml up -d
```

**Or use PostgreSQL dump:**
```bash
docker exec affine_postgres pg_dump -U affine affine > backup.sql
```

## Performance Considerations

### macOS Server Requirements

**Minimum:**
- 2 CPU cores
- 4 GB RAM
- 10 GB disk space

**Recommended:**
- 4 CPU cores
- 8 GB RAM
- 50+ GB disk (SSD preferred)

### Concurrent Users

The self-hosted setup handles:
- **1-5 users:** Very smooth (home/small team)
- **5-20 users:** Good (small business)
- **20+ users:** May need resource tuning

### Mobile Battery Impact

- WebSocket connection: minimal drain
- Sync on changes only (not continuous polling)
- Can configure sync intervals for battery saving

## Security Considerations

### Authentication

Default setup includes:
- Email/password login
- Session management (JWT tokens)
- Workspace permissions (owner/admin/member)
- Document-level permissions

### Network Security

**Recommended setup:**
1. Use HTTPS (TLS certificate) - especially if exposing to internet
2. Keep server on private network or VPN (Tailscale)
3. Use strong passwords
4. Enable 2FA if available in future versions

### Data Privacy

- All data stays on your Mac (no cloud sync unless you want it)
- End-to-end control over database
- Can encrypt PostgreSQL data volume for extra security

## Migration Path

### From AFFiNE Cloud to Self-Hosted

If you're already using AFFiNE cloud and want to migrate:

1. **Export workspaces** from cloud (if export feature available)
2. **Set up self-hosted server** (using steps above)
3. **Import workspaces** to local server
4. **Reconfigure mobile apps** to point to new server
5. **Sync devices** - initial sync might be large

### From Local-Only to Self-Hosted Sync

If using standalone desktop apps without sync:

1. **Set up server** first
2. **Create account** on local server
3. **Sign in** from desktop/mobile apps
4. **Choose "Sync to cloud"** option (points to your server)
5. **Upload local workspaces** to server

## Troubleshooting

### Common Issues

**Mobile app can't connect to server:**
- Check firewall allows port 3010
- Verify server is running: `docker ps` or `curl http://localhost:3010`
- Test from mobile browser first: `http://your-mac-ip:3010`
- Check devices on same network (or VPN)

**Sync conflicts:**
- CRDT should handle automatically
- If stuck, try "Force sync" in app settings
- Check server logs: `docker logs affine_server`

**Slow sync:**
- Check WiFi signal strength
- Large initial sync is normal (subsequent syncs are incremental)
- Postgres indexing might be running (check server load)

**Data loss concerns:**
- Regular backups (automate with cron/launchd)
- PostgreSQL has write-ahead logging (crash recovery)
- CRDT design prevents data loss from conflicts

## Next Steps & Recommendations

### Immediate Action Plan

1. **Choose deployment method:**
   - **Docker Compose** (if you want simple, production-ready setup)
   - **Native dev server** (if you want to modify code)

2. **Set up server on macOS:**
   - Follow Option 1 or Option 2 steps above
   - Test with web browser first

3. **Configure networking:**
   - Decide: local WiFi only or Tailscale VPN
   - Set appropriate `AFFINE_SERVER_HOST`

4. **Build iOS app:**
   - Configure server URL in Capacitor config
   - Build with Xcode
   - Install on iPhone/iPad via TestFlight or direct install

5. **Test sync:**
   - Create test workspace on macOS app
   - Sign in from iOS app
   - Verify documents sync both ways

### Future Enhancements

**Potential customizations:**
- Custom branding (CAFFiNE instead of AFFiNE)
- Modified sync intervals
- Custom authentication (LDAP, OAuth)
- Automated backups script
- Monitoring dashboard
- SSL/TLS setup with Let's Encrypt

**Mobile app improvements:**
- Add server URL picker on first launch
- QR code server setup (scan from Mac)
- Offline-first mode toggle
- Sync status indicators

## Resources

**Documentation:**
- Self-hosting guide: https://docs.affine.pro/self-host-affine
- Building docs: `docs/BUILDING.md`
- Server development: `docs/developing-server.md`

**Repository locations:**
- Server: `packages/backend/server/`
- iOS app: `packages/frontend/apps/ios/`
- macOS app: `packages/frontend/apps/electron/`
- Docker configs: `.docker/selfhost/`

**Community:**
- GitHub issues: https://github.com/toeverything/AFFiNE/issues
- Discord: https://affine.pro/redirect/discord

## Conclusion

CAFFiNE's self-hosting architecture is **production-ready** and designed for exactly your use case:

✅ **PostgreSQL + Redis** for robust data storage  
✅ **CRDT sync** for conflict-free multi-device editing  
✅ **iOS/macOS apps** already support custom servers  
✅ **Docker Compose** for easy deployment on macOS  
✅ **Offline support** with automatic sync when reconnected  

**Estimated setup time:** 2-4 hours (including app builds)

**Recommendation:** Start with **Docker Compose** setup for your production server, and build the iOS app with hardcoded server URL pointing to your Mac's Tailscale IP (or local IP if staying on home network).

---

Let me know which approach you'd like to pursue, and I can provide detailed step-by-step implementation guidance.

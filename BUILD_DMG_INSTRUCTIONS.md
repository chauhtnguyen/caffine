# Build CAFFiNE DMG - Quick Instructions

**Run this on your Mac to build the DMG with database configuration UI.**

---

## Prerequisites Check

```bash
# 1. PostgreSQL 17 running
pg_isready -h localhost -p 5432

# 2. Redis running
redis-cli ping

# 3. Database exists
psql -l | grep caffine

# If database not setup, see NATIVE_POSTGRES_SETUP.md
```

---

## Build DMG (One Command)

```bash
cd ~/projects/caffine
./build-complete-dmg.sh
```

**This script will:**
1. ✅ Configure server with database connection
2. ✅ Verify all prerequisites (PostgreSQL, Redis, Node, Rust)
3. ✅ Install dependencies (`yarn install`)
4. ✅ Build native Rust modules (10-15 min)
5. ✅ Build Electron desktop app (15-20 min)
6. ✅ Create DMG installer
7. ✅ Copy DMG to Desktop

**Total time:** 30-45 minutes

---

## Output

DMG file will be created at:
- Original: `~/projects/caffine/packages/frontend/apps/electron/out/CAFFiNE-*.dmg`
- Copied to: `~/Desktop/CAFFiNE.dmg`

**File size:** ~200-400 MB

---

## Install and Test

### Install

```bash
# Open DMG
open ~/Desktop/CAFFiNE.dmg

# Drag CAFFiNE.app to Applications folder

# First launch (bypass Gatekeeper for unsigned app)
# Right-click CAFFiNE.app > Open
```

### Test Database Configuration UI

1. **Launch CAFFiNE** from Applications
2. **Open Settings** (gear icon or Cmd+,)
3. **Navigate:** Workspace → Preferences
4. **Scroll down** to "Local Datastore" section
5. **You should see:**
   - Connection status (green dot if connected)
   - Database configuration form
   - Host, Port, Database, Username, Password fields
   - Test Connection button
   - Save Configuration button

### Test Connection

1. Click **"Test Connection"**
2. Should show:
   ```
   ✓ Connection successful
   Version: PostgreSQL 17.7 ...
   Tables: 52
   ```

### Test Reconnection Dialog

1. **Stop PostgreSQL:**
   ```bash
   brew services stop postgresql@17
   ```

2. **Wait 10-15 seconds**

3. **Dialog should appear:**
   - "⚠ Database Connection Lost"
   - Auto-retry countdown
   - "Retry Now" button
   - "Check Settings" button

4. **Click "Check Settings"**
   - Should navigate to Settings → Workspace → Preferences → Local Datastore

5. **Restart PostgreSQL:**
   ```bash
   brew services start postgresql@17
   ```

6. **Dialog should close automatically** within 10 seconds

---

## Troubleshooting Build

### Build fails: "PostgreSQL not running"

```bash
# Start PostgreSQL
brew services start postgresql@17

# Verify
pg_isready -h localhost -p 5432
```

### Build fails: "Redis not running"

```bash
# Start Redis
brew services start redis

# Verify
redis-cli ping
```

### Build fails: "Rust compilation error"

```bash
# Update Rust
rustup update stable

# Check version matches project
cat ~/projects/caffine/rust-toolchain.toml

# Clean and retry
cd ~/projects/caffine
yarn affine @affine/server-native clean
./build-complete-dmg.sh
```

### Build fails: "Native module not found"

```bash
# Rebuild native modules
cd ~/projects/caffine
yarn affine @affine/server-native clean
yarn affine @affine/server-native build

# Then rebuild Electron
yarn affine @affine/electron build
```

### DMG not created

```bash
# Check build output directory
ls -la ~/projects/caffine/packages/frontend/apps/electron/out/

# If .app exists but no DMG:
# electron-builder might have created ZIP instead
ls -la ~/projects/caffine/packages/frontend/apps/electron/out/*.zip
```

---

## Manual Build (Step by Step)

If automated script fails, run these manually:

```bash
cd ~/projects/caffine

# 1. Configure
cd packages/backend/server
cat > .env << 'EOF'
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine"
REDIS_SERVER_HOST=localhost
NODE_ENV=production
AFFINE_SERVER_HOST=localhost
AFFINE_SERVER_PORT=3010
EOF

# 2. Install dependencies
cd ~/projects/caffine
yarn install

# 3. Build native modules
yarn affine @affine/server-native build
yarn affine @affine/reader build

# 4. Build Electron app
yarn affine @affine/electron build

# 5. Find DMG
find packages/frontend/apps/electron/out -name "*.dmg"
```

---

## What's Included in This Build

✅ **Database Configuration UI**
- Settings → Workspace → Preferences → Local Datastore
- Configure host, port, database, username, password
- Test connection before saving
- Quick presets (Local, Network)

✅ **Reconnection Handling**
- Auto-detect when database goes offline
- Reconnection dialog with countdown
- "Check Settings" button navigates to database config

✅ **Status Monitoring**
- Real-time connection status indicator
- Polls database every 10 seconds
- Auto-closes reconnection dialog when restored

✅ **Configuration Persistence**
- Saved to `~/.affine/config/database.json`
- Persists across app restarts
- Accessible even when database is offline

---

## After Build

### Distribute DMG

The DMG file can be:
- Shared directly (200-400 MB)
- Uploaded to cloud storage
- Distributed via USB drive
- Hosted on web server

### User Setup

Recipients should:
1. Install CAFFiNE from DMG
2. Launch app (right-click > Open first time)
3. Go to Settings → Workspace → Preferences → Local Datastore
4. Enter their PostgreSQL connection details
5. Test connection
6. Save configuration

### No .env File Needed

Users don't need to edit any configuration files!
All database setup is done through the UI.

---

## Build Time Breakdown

| Step | Time | Can Skip If |
|------|------|-------------|
| yarn install | 5-10 min | Already installed |
| Build native modules | 10-15 min | Already built |
| Build Electron app | 15-20 min | Never |
| **Total** | **30-45 min** | **First build** |

Subsequent builds (if native modules already built): ~15-20 minutes

---

## Next Steps After Testing

1. ✅ Test database configuration UI
2. ✅ Test reconnection dialog
3. ✅ Verify settings persist across restarts
4. ✅ Test with different database configurations
5. ✅ Share DMG with users

---

**Ready to build!** Run `./build-complete-dmg.sh` on your Mac.

# CAFFiNE - Ready to Build

**Status:** ✅ All code complete, ready for macOS DMG build  
**Date:** 2026-02-21  
**Features:** Database Configuration UI + Full CAFFiNE functionality

---

## What You Have

### ✅ Complete Implementation

**Backend:**
- Database configuration API (7 endpoints)
- Configuration storage (`~/.affine/config/database.json`)
- Connection testing and validation
- Friendly error messages
- Auto-fallback to environment variables

**Frontend:**
- Settings page (Workspace → Preferences → Local Datastore)
- Connection testing UI
- Reconnection dialog
- Status monitoring
- Real-time updates

**Total:** 13 files, ~800 lines of code

---

## How to Build

### Quick Start (One Command)

```bash
cd ~/projects/caffine
./build-complete-dmg.sh
```

**Time:** 30-45 minutes  
**Output:** `~/Desktop/CAFFiNE.dmg` (200-400 MB)

---

## What the Build Script Does

```
1. Configure server (.env file)
   └─ DATABASE_URL, REDIS_SERVER_HOST, etc.

2. Verify prerequisites
   ├─ PostgreSQL 17 running ✓
   ├─ Redis running ✓
   ├─ Database 'caffine' exists ✓
   ├─ Node.js installed ✓
   └─ Rust installed ✓

3. Install dependencies
   └─ yarn install (~5-10 min)

4. Build native modules
   ├─ @affine/server-native (Rust) (~10-15 min)
   └─ @affine/reader (~1 min)

5. Build Electron app
   ├─ Bundle frontend
   ├─ Package with Electron
   └─ Create DMG (~15-20 min)

6. Copy DMG to Desktop
   └─ ~/Desktop/CAFFiNE.dmg
```

---

## Installation (For You to Test)

```bash
# 1. Open DMG
open ~/Desktop/CAFFiNE.dmg

# 2. Drag to Applications
# (Visual: drag CAFFiNE.app → Applications folder)

# 3. Launch (first time - bypass Gatekeeper)
# Right-click CAFFiNE.app → Open
```

---

## Testing Checklist

### Database Configuration UI

- [ ] Open Settings → Workspace → Preferences
- [ ] See "Local Datastore" section below "Sync with Affine Cloud"
- [ ] See connection status indicator (green dot)
- [ ] See form fields: Host, Port, Database, Username, Password
- [ ] Click "Test Connection" → Shows success with PostgreSQL version
- [ ] Change host to invalid value → Shows error message
- [ ] Change back to localhost → Test succeeds
- [ ] Click "Save Configuration" → Shows success notification
- [ ] Check `~/.affine/config/database.json` created

### Reconnection Dialog

- [ ] Stop PostgreSQL: `brew services stop postgresql@17`
- [ ] Wait 10-15 seconds
- [ ] See dialog: "⚠ Database Connection Lost"
- [ ] See countdown timer (5, 4, 3, 2, 1...)
- [ ] See retry attempt count incrementing
- [ ] Click "Check Settings" → Opens database settings page
- [ ] Start PostgreSQL: `brew services start postgresql@17`
- [ ] Dialog closes automatically within 10 seconds

### Configuration Persistence

- [ ] Configure database with custom values
- [ ] Save configuration
- [ ] Quit CAFFiNE
- [ ] Relaunch CAFFiNE
- [ ] Open Settings → Database
- [ ] Verify custom values are still there

### Settings Accessibility

- [ ] Stop PostgreSQL (database offline)
- [ ] Launch CAFFiNE
- [ ] Can still open Settings
- [ ] Can still navigate to Database settings
- [ ] Can still edit configuration
- [ ] Start PostgreSQL
- [ ] Test connection works

---

## Features You'll See

### 1. Settings Page Location

```
Settings (⚙ icon)
└── Workspace
    └── Preferences
        ├── Workspace Profile
        │   ├── Avatar
        │   ├── Name
        │   └── Labels
        ├── Sync with Affine Cloud
        └── Local Datastore ← NEW!
            ├── Status: ● Connected to localhost:5432/caffine
            ├── Host: [localhost]
            ├── Port: [5432]
            ├── Database: [caffine]
            ├── Username: [caffine]
            ├── Password: [••••••••]
            ├── ☐ Use SSL/TLS
            ├── [Test Connection] [Save Configuration]
            └── Presets: [Local PostgreSQL] [Network Server]
```

### 2. Connection Test Results

**Success:**
```
✓ Connection successful
Version: PostgreSQL 17.7 (Homebrew) on aarch64-apple-darwin
Tables: 52
```

**Failure:**
```
✗ Connection refused - PostgreSQL may not be running

Troubleshooting:
• Check PostgreSQL is running
• Verify host and port are correct
• Check username and password
• Ensure database exists
```

### 3. Reconnection Dialog

```
┌───────────────────────────────────────────┐
│ ⚠ Database Connection Lost                │
│                                           │
│ Lost connection to database server        │
│                                           │
│ Last known connection:                    │
│ localhost:5432/caffine                    │
│                                           │
│ Error: Connection refused - PostgreSQL    │
│ may not be running                        │
│                                           │
│ Automatically retrying in 5s...           │
│ Attempt #3                                │
│                                           │
│ What you can do:                          │
│ • Wait for automatic reconnection         │
│ • Check if PostgreSQL is running          │
│ • Verify database settings                │
│ • Check network connection                │
│                                           │
│        [Retry Now]  [Check Settings]      │
└───────────────────────────────────────────┘
```

---

## Build Troubleshooting

### Issue: "PostgreSQL not running"

```bash
# Start PostgreSQL
brew services start postgresql@17

# Verify
pg_isready -h localhost -p 5432
```

### Issue: "Redis not running"

```bash
# Start Redis
brew services start redis

# Verify
redis-cli ping
# Expected: PONG
```

### Issue: "Database caffine does not exist"

```bash
# Create database
psql postgres -c "CREATE DATABASE caffine;"
psql postgres -c "CREATE USER caffine_user WITH PASSWORD 'caffine';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE caffine TO caffine_user;"
psql caffine -c "CREATE EXTENSION vector;"

# Run migrations
cd ~/projects/caffine/packages/backend/server
yarn prisma migrate deploy
```

### Issue: "Native module build failed"

```bash
# Update Rust
rustup update stable

# Clean and rebuild
cd ~/projects/caffine
yarn affine @affine/server-native clean
yarn affine @affine/server-native build
```

---

## File Sizes

**Repository:**
- Full clone: ~550 MB
- node_modules: ~1.5 GB (after yarn install)

**Build Output:**
- DMG file: ~200-400 MB
- Installed app: ~500-700 MB

**Configuration:**
- `~/.affine/config/database.json`: <1 KB

---

## Documentation Created

1. **SELF_HOSTING_ANALYSIS.md** - Architecture overview
2. **NATIVE_POSTGRES_SETUP.md** - PostgreSQL setup guide
3. **BUILD_DMG.md** - DMG build instructions
4. **CUSTOM_DATABASE_LOCATION.md** - Database location config
5. **FEATURE_DATABASE_CONFIG_UI.md** - Feature design spec
6. **DATABASE_CONFIG_FEATURE_SUMMARY.md** - Backend API summary
7. **DATABASE_UI_COMPLETE.md** - Complete implementation
8. **BUILD_DMG_INSTRUCTIONS.md** - Build instructions
9. **READY_TO_BUILD.md** - This file

---

## Command Summary

```bash
# Prerequisites
brew services start postgresql@17
brew services start redis

# Build DMG (automated)
cd ~/projects/caffine
./build-complete-dmg.sh

# Output
ls -lh ~/Desktop/CAFFiNE.dmg

# Install
open ~/Desktop/CAFFiNE.dmg
# Drag to Applications, right-click > Open

# Test
# Launch CAFFiNE
# Settings → Workspace → Preferences → Local Datastore
```

---

## Next Steps

1. **Run build script** on your Mac
2. **Wait 30-45 minutes** for build to complete
3. **Install DMG** and test features
4. **Verify** database configuration UI works
5. **Test** reconnection dialog
6. **Share feedback** or proceed with distribution

---

**Everything is ready. Run `./build-complete-dmg.sh` when you're ready to build!** 🚀

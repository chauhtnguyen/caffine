# Build CAFFiNE macOS DMG

Complete instructions to build a distributable macOS DMG file.

---

## Prerequisites

Your setup is already complete:
- ✓ PostgreSQL 17.7 running
- ✓ Redis running
- ✓ Database configured (52 tables)
- ✓ pgvector extension installed

---

## Step 1: Configure Server Connection

```bash
cd ~/projects/caffine/packages/backend/server

cat > .env << 'EOF'
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine"
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379
NODE_ENV=production
AFFINE_SERVER_HOST=localhost
AFFINE_SERVER_PORT=3010
AFFINE_SERVER_HTTPS=false
AFFINE_INDEXER_ENABLED=true
EOF

echo "✓ Created .env file"
```

---

## Step 2: Install Dependencies

```bash
cd ~/projects/caffine

# Install all dependencies
yarn install

# This may take 5-10 minutes
```

---

## Step 3: Build Native Modules

```bash
cd ~/projects/caffine

# Build Rust native module
yarn affine @affine/server-native build

# This takes 5-10 minutes on first build
# Compiles Rust code for macOS ARM64

# Build reader
yarn affine @affine/reader build
```

---

## Step 4: Build Electron Desktop App

```bash
cd ~/projects/caffine

# Build Electron app for macOS
yarn affine @affine/electron build

# This command:
# 1. Builds the frontend web app
# 2. Packages it with Electron
# 3. Creates macOS .app bundle
# 4. Creates DMG installer
#
# Takes 10-20 minutes depending on machine
```

---

## Step 5: Locate DMG File

```bash
# DMG will be created in:
ls -lh ~/projects/caffine/packages/frontend/apps/electron/out/*.dmg

# Example output:
# CAFFiNE-0.22.4-arm64.dmg
# or
# CAFFiNE-0.22.4-universal.dmg

# Check file size (should be 200-400 MB)
```

---

## Step 6: Test DMG

```bash
# Mount and install
open ~/projects/caffine/packages/frontend/apps/electron/out/*.dmg

# Drag CAFFiNE.app to Applications
# Launch from Applications folder

# On first launch:
# 1. macOS will ask to trust the app (unsigned)
# 2. Right-click > Open to bypass Gatekeeper
# 3. App should launch and connect to http://localhost:3010
```

---

## Alternative: Build Script (All Steps Combined)

Save this as `build-dmg.sh`:

```bash
#!/bin/bash
set -e

echo "=== Building CAFFiNE macOS DMG ==="
echo ""

# Navigate to project
cd ~/projects/caffine

# Step 1: Configure server
echo "Step 1: Configuring server..."
cd packages/backend/server
cat > .env << 'EOF'
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine"
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379
NODE_ENV=production
AFFINE_SERVER_HOST=localhost
AFFINE_SERVER_PORT=3010
AFFINE_SERVER_HTTPS=false
AFFINE_INDEXER_ENABLED=true
EOF
echo "✓ Server configured"

# Step 2: Install dependencies
cd ~/projects/caffine
echo ""
echo "Step 2: Installing dependencies..."
yarn install
echo "✓ Dependencies installed"

# Step 3: Build native modules
echo ""
echo "Step 3: Building native modules..."
echo "(This may take 10-15 minutes...)"
yarn affine @affine/server-native build
yarn affine @affine/reader build
echo "✓ Native modules built"

# Step 4: Build Electron app
echo ""
echo "Step 4: Building Electron app and DMG..."
echo "(This may take 15-20 minutes...)"
yarn affine @affine/electron build
echo "✓ Electron app built"

# Step 5: Find DMG
echo ""
echo "=== Build Complete ==="
echo ""
echo "DMG file:"
ls -lh packages/frontend/apps/electron/out/*.dmg
echo ""
echo "App bundle:"
ls -d packages/frontend/apps/electron/out/mac*/*.app
echo ""
```

**Run the script:**

```bash
cd ~/projects/caffine
chmod +x build-dmg.sh
./build-dmg.sh
```

---

## Build Configuration Options

### Build for Apple Silicon (ARM64) Only

```bash
# In packages/frontend/apps/electron/package.json
# electron-builder config:

{
  "mac": {
    "target": {
      "target": "dmg",
      "arch": ["arm64"]
    }
  }
}

# Then build
yarn affine @affine/electron build
```

### Build Universal Binary (Intel + ARM64)

```bash
# In electron-builder config:

{
  "mac": {
    "target": {
      "target": "dmg",
      "arch": ["x64", "arm64"]
    }
  }
}

# Build (takes longer)
yarn affine @affine/electron build
```

### Build ZIP Instead of DMG

```bash
# In electron-builder config:

{
  "mac": {
    "target": ["zip"]
  }
}
```

---

## Troubleshooting

### Build fails: "Native module not found"

```bash
# Rebuild native modules
cd ~/projects/caffine
yarn affine @affine/server-native clean
yarn affine @affine/server-native build
```

### Build fails: "Rust compilation error"

```bash
# Check Rust version
rustc --version

# Update Rust
rustup update stable

# Check required version
cat ~/projects/caffine/rust-toolchain.toml

# Clean and rebuild
cargo clean
yarn affine @affine/server-native build
```

### DMG creation fails: "electron-builder not found"

```bash
# Install electron-builder globally
yarn global add electron-builder

# Or ensure it's in project deps
cd ~/projects/caffine
yarn install
```

### App won't open: "Damaged or incomplete"

```bash
# Remove quarantine attribute (unsigned app)
xattr -cr ~/projects/caffine/packages/frontend/apps/electron/out/mac-arm64/CAFFiNE.app

# Or right-click > Open instead of double-click
```

### App can't connect to server

```bash
# Start server first
cd ~/projects/caffine
yarn affine server dev

# Then launch desktop app
# In app settings, set server URL: http://localhost:3010
```

---

## Development vs Production Builds

### Development Build (Faster)

```bash
# No optimization, faster build
NODE_ENV=development yarn affine @affine/electron build

# Or run in dev mode (no DMG)
yarn affine @affine/electron dev
```

### Production Build (Optimized)

```bash
# Full optimization, slower build, smaller size
NODE_ENV=production yarn affine @affine/electron build
```

---

## Expected Build Output

```
packages/frontend/apps/electron/out/
├── mac-arm64/
│   └── CAFFiNE.app              # macOS app bundle
├── CAFFiNE-0.22.4-arm64.dmg     # DMG installer
└── builder-effective-config.yaml # Build configuration
```

**DMG file size:** ~200-400 MB (depending on arch and optimizations)

---

## Code Signing (Optional, for Distribution)

To distribute the app without "unsigned developer" warnings:

```bash
# 1. Get Apple Developer certificate
# 2. Configure signing in electron-builder

# In packages/frontend/apps/electron/package.json:
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}

# 3. Build with signing
yarn affine @affine/electron build

# 4. Notarize with Apple
# (requires Apple Developer account)
```

For testing, unsigned builds work fine (just need to right-click > Open).

---

## Quick Build Command

If everything is set up, just run:

```bash
cd ~/projects/caffine
yarn affine @affine/electron build
```

DMG will be in: `packages/frontend/apps/electron/out/CAFFiNE-*.dmg`

---

## Next Steps After Build

1. **Mount DMG:** `open packages/frontend/apps/electron/out/*.dmg`
2. **Install:** Drag CAFFiNE.app to Applications
3. **Launch:** Right-click > Open (first time only)
4. **Configure:** Settings > Server URL > http://localhost:3010
5. **Start server:** `yarn affine server dev` (in another terminal)
6. **Test:** Create workspace, add documents, verify sync

---

Estimated total build time: **30-45 minutes**
- Dependencies: 5-10 min
- Native modules: 10-15 min  
- Electron build: 15-20 min

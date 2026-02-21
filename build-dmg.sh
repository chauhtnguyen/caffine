#!/bin/bash
# Build CAFFiNE macOS DMG
# Run this on your Mac (not the VM)

set -e

echo "=== Building CAFFiNE macOS DMG ==="
echo ""

# Check we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Error: This script must run on macOS"
    exit 1
fi

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

# Step 5: Find and display DMG
echo ""
echo "=== Build Complete ==="
echo ""

DMG_FILE=$(find packages/frontend/apps/electron/out -name "*.dmg" -type f | head -1)

if [ -n "$DMG_FILE" ]; then
    echo "✓ DMG created successfully:"
    echo ""
    ls -lh "$DMG_FILE"
    echo ""
    echo "Location: $DMG_FILE"
    echo ""
    echo "To install:"
    echo "  open $DMG_FILE"
    echo ""
else
    echo "⚠ DMG file not found. Check build output above for errors."
    echo ""
    echo "Build artifacts in:"
    ls -la packages/frontend/apps/electron/out/
fi

echo ""
echo "To test the app:"
echo "  1. Open the DMG file"
echo "  2. Drag CAFFiNE.app to Applications"
echo "  3. Start server: cd ~/projects/caffine && yarn affine server dev"
echo "  4. Launch CAFFiNE from Applications (right-click > Open first time)"
echo ""

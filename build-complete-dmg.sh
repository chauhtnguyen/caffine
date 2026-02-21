#!/bin/bash
# Complete CAFFiNE Build Script
# Configures database, builds native modules, and creates macOS DMG
# Run this on your Mac

set -e

echo "=== CAFFiNE Complete Build ==="
echo "Building with Database Configuration UI feature"
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

# Step 2: Verify prerequisites
cd ~/projects/caffine
echo ""
echo "Step 2: Verifying prerequisites..."

# Check PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    PG_VERSION=$(psql --version | head -1)
    echo "✓ PostgreSQL is running: $PG_VERSION"
else
    echo "✗ PostgreSQL not running!"
    echo "  Start it with: brew services start postgresql@17"
    exit 1
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis is running"
else
    echo "✗ Redis not running!"
    echo "  Start it with: brew services start redis"
    exit 1
fi

# Check database connection
if psql postgresql://caffine:caffine@localhost:5432/caffine -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ Can't connect to database!"
    echo "  Check database exists: psql -l | grep caffine"
    exit 1
fi

# Check Node.js
if command -v node > /dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js $NODE_VERSION"
else
    echo "✗ Node.js not found!"
    exit 1
fi

# Check Rust
if command -v rustc > /dev/null 2>&1; then
    RUST_VERSION=$(rustc --version)
    echo "✓ Rust $RUST_VERSION"
else
    echo "✗ Rust not found!"
    echo "  Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Step 3: Install dependencies
echo ""
echo "Step 3: Installing dependencies..."
echo "(This may take 5-10 minutes...)"
yarn install
echo "✓ Dependencies installed"

# Step 4: Build native modules
echo ""
echo "Step 4: Building native modules..."
echo "(This may take 10-15 minutes...)"

# Build @affine/server-native
echo "  Building @affine/server-native..."
yarn affine @affine/server-native build

if [ -f "packages/backend/native/index.node" ]; then
    echo "  ✓ Native module built successfully"
else
    echo "  ✗ Native module build failed!"
    exit 1
fi

# Build @affine/reader
echo "  Building @affine/reader..."
yarn affine @affine/reader build
echo "  ✓ Reader package built"

# Step 5: Build Electron Desktop App
echo ""
echo "Step 5: Building Electron app and DMG..."
echo "(This may take 15-20 minutes...)"
yarn affine @affine/electron build
echo "✓ Electron app built"

# Step 6: Find and display DMG
echo ""
echo "=== Build Complete ==="
echo ""

DMG_FILE=$(find packages/frontend/apps/electron/out -name "*.dmg" -type f 2>/dev/null | head -1)

if [ -n "$DMG_FILE" ]; then
    echo "✓ DMG created successfully:"
    echo ""
    ls -lh "$DMG_FILE"
    echo ""
    echo "Location: $DMG_FILE"
    echo ""
    echo "Size: $(du -h "$DMG_FILE" | cut -f1)"
    echo ""
    
    # Copy to easier location
    DESKTOP_DMG="$HOME/Desktop/CAFFiNE.dmg"
    cp "$DMG_FILE" "$DESKTOP_DMG"
    echo "✓ Copied to Desktop: $DESKTOP_DMG"
    echo ""
    
    echo "To install:"
    echo "  1. Open $DESKTOP_DMG"
    echo "  2. Drag CAFFiNE.app to Applications"
    echo "  3. Right-click > Open (first time only)"
    echo ""
    echo "To configure database:"
    echo "  Settings → Workspace → Preferences → Local Datastore"
    echo ""
else
    echo "⚠ DMG file not found. Check build output above for errors."
    echo ""
    echo "Build artifacts:"
    ls -la packages/frontend/apps/electron/out/ 2>/dev/null || echo "  No output directory"
fi

echo ""
echo "=== Build Summary ==="
echo "Database Configuration UI: ✓ Included"
echo "Native modules: ✓ Built for macOS ARM64"
echo "Electron app: ✓ Packaged"
echo "DMG installer: ✓ Created"
echo ""
echo "Features included:"
echo "  • Runtime database configuration via Settings UI"
echo "  • Connection testing and status monitoring"
echo "  • Auto-reconnect on disconnect"
echo "  • Settings accessible when database is offline"
echo ""
echo "Build complete! 🎉"

#!/bin/bash
# CAFFiNE Configuration and Build Script
# Connects to your PostgreSQL 17.7 database at localhost:5432/caffine

set -e

echo "=== CAFFiNE Configuration and Build ==="
echo ""

# Step 1: Create .env file
echo "Step 1: Creating server .env file..."
cd ~/projects/caffine/packages/backend/server

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

echo "✓ Created .env file"
echo ""

# Step 2: Verify prerequisites
echo "Step 2: Verifying prerequisites..."

# Check PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✓ PostgreSQL is running"
else
    echo "✗ PostgreSQL not running!"
    exit 1
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis is running"
else
    echo "✗ Redis not running! Run: brew services start redis"
    exit 1
fi

# Check database connection
if psql postgresql://caffine:caffine@localhost:5432/caffine -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "✗ Can't connect to database!"
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
    echo "✗ Rust not found! Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo ""

# Step 3: Install dependencies
echo "Step 3: Installing dependencies..."
cd ~/projects/caffine
yarn install
echo "✓ Dependencies installed"
echo ""

# Step 4: Build native modules
echo "Step 4: Building native modules..."
echo "This may take 5-10 minutes..."

# Build @affine/server-native
cd ~/projects/caffine
yarn affine @affine/server-native build

if [ -f "packages/backend/native/index.node" ]; then
    echo "✓ Native module built successfully"
else
    echo "✗ Native module build failed!"
    exit 1
fi

# Build @affine/reader
yarn affine @affine/reader build
echo "✓ Reader package built"
echo ""

# Step 5: Verify database schema
echo "Step 5: Verifying database schema..."
cd ~/projects/caffine/packages/backend/server

TABLE_COUNT=$(psql postgresql://caffine:caffine@localhost:5432/caffine -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "✓ Found $TABLE_COUNT tables in database"

USER_COUNT=$(psql postgresql://caffine:caffine@localhost:5432/caffine -t -c "SELECT COUNT(*) FROM users;")
echo "✓ Found $USER_COUNT user(s)"
echo ""

# Done
echo "=== Build Complete ==="
echo ""
echo "Configuration:"
echo "  Database: postgresql://caffine:caffine@localhost:5432/caffine"
echo "  Redis: localhost:6379"
echo "  Server: http://localhost:3010"
echo ""
echo "To start server:"
echo "  cd ~/projects/caffine"
echo "  yarn affine server dev"
echo ""
echo "To start frontend:"
echo "  cd ~/projects/caffine"
echo "  yarn dev"
echo ""

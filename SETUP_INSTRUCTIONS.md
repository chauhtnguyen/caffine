# CAFFiNE macOS Setup Instructions
**Target:** PostgreSQL 17 + pgvector + Redis + Native dependencies  
**Date:** 2026-02-21

---

## Prerequisites Check

Run these commands to verify what's already installed:

```bash
# Check PostgreSQL 17
psql --version

# Check if Postgres is running
pg_isready -h localhost -p 5432

# Check Redis
redis-cli --version
redis-cli ping 2>/dev/null || echo "Redis not running"

# Check Node.js (need v22+)
node --version

# Check Rust
rustc --version

# Check Homebrew
brew --version
```

---

## Step 1: Install pgvector Extension

```bash
# Install pgvector via Homebrew
brew install pgvector

# Verify pgvector files installed
ls -la $(pg_config --sharedir)/extension/ | grep vector

# Expected output: vector--*.sql files
```

---

## Step 2: Install Redis

```bash
# Install Redis
brew install redis

# Start Redis as a service (runs on boot)
brew services start redis

# Verify Redis is running
redis-cli ping
# Expected output: PONG
```

---

## Step 3: Verify/Install Rust Toolchain

```bash
# Check if Rust is installed
rustc --version

# If not installed, install Rust:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# After installation, reload shell config
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

---

## Step 4: Create CAFFiNE Database

```bash
# Connect to PostgreSQL
psql postgres

# Run these SQL commands in psql:
CREATE DATABASE caffine;
CREATE USER caffine_user WITH PASSWORD 'caffine_secure_2026';
GRANT ALL PRIVILEGES ON DATABASE caffine TO caffine_user;

# Connect to caffine database
\c caffine

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify extension installed
\dx vector

# Exit psql
\q
```

**Save database credentials:**
- Database: `caffine`
- User: `caffine_user`
- Password: `caffine_secure_2026`
- Host: `localhost`
- Port: `5432`

---

## Step 5: Configure CAFFiNE Server Environment

```bash
# Navigate to server directory
cd ~/projects/caffine/packages/backend/server

# Create .env file from example
cp .env.example .env

# Edit .env file with these settings
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://caffine_user:caffine_secure_2026@localhost:5432/caffine"

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

# Optional: External URL (for generating links)
# AFFINE_SERVER_EXTERNAL_URL=http://localhost:3010

# Optional: Storage location (defaults to ~/.affine/storage)
# AFFINE_STORAGE_ROOT=/custom/path/to/storage
EOF
```

---

## Step 6: Install Project Dependencies

```bash
# Navigate to project root
cd ~/projects/caffine

# Install all dependencies
yarn install

# This may take 5-10 minutes
# Wait for completion before proceeding
```

---

## Step 7: Build Native Modules

```bash
# From project root
cd ~/projects/caffine

# Build @affine/server-native (Rust module)
yarn affine @affine/server-native build

# This compiles Rust code and may take 5-10 minutes
# Expected output: Build completed successfully

# Build @affine/reader package
yarn affine @affine/reader build

# Expected output: Build completed successfully
```

**Troubleshooting native build:**

If build fails with Rust errors:
```bash
# Check Rust toolchain version
cat ~/projects/caffine/rust-toolchain.toml
rustup show

# Install required Rust version if needed
rustup install stable

# Try clean build
yarn affine @affine/server-native clean
yarn affine @affine/server-native build
```

---

## Step 8: Initialize Database Schema

```bash
# Navigate to server package
cd ~/projects/caffine/packages/backend/server

# Run Prisma migrations
yarn prisma migrate deploy

# Expected output: 
# Database migrations applied successfully
# Created tables: users, workspaces, snapshots, updates, etc.

# Verify tables created
psql caffine -c "\dt"

# Should show ~30-40 tables
```

---

## Step 9: Seed Database (Optional - for testing)

```bash
# From server directory
cd ~/projects/caffine/packages/backend/server

# Seed test users
yarn seed

# Creates test accounts:
# - dev@affine.pro / password: dev
# - pro@affine.pro / password: pro  
# - team@affine.pro / password: team
```

**Skip this step for production** - create real users via signup instead.

---

## Step 10: Start CAFFiNE Server

```bash
# Navigate to project root
cd ~/projects/caffine

# Start server in development mode
yarn affine server dev

# Expected output:
# [Server] Listening on http://localhost:3010
# [GraphQL] Playground available at http://localhost:3010/graphql

# Keep this terminal open (server is running)
```

---

## Step 11: Verify Server is Working

**Open a new terminal** and run:

```bash
# Test health endpoint
curl http://localhost:3010/api/healthz

# Expected output: {"status":"ok"}

# Test GraphQL playground (browser)
open http://localhost:3010/graphql

# Should open browser with GraphQL playground
```

---

## Step 12: Start Web Frontend (Optional)

**In a new terminal:**

```bash
# Navigate to project root
cd ~/projects/caffine

# Start frontend dev server
yarn dev

# When prompted, select: web

# Expected output:
# Frontend running on http://localhost:8080
# Backend connected to http://localhost:3010

# Open browser
open http://localhost:8080
```

---

## Verification Checklist

Run these to confirm everything is working:

```bash
# 1. PostgreSQL is running
pg_isready -h localhost -p 5432
# Expected: localhost:5432 - accepting connections

# 2. Redis is running
redis-cli ping
# Expected: PONG

# 3. pgvector extension is enabled
psql caffine -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
# Expected: 1 row with extname = 'vector'

# 4. CAFFiNE database exists
psql -l | grep caffine
# Expected: caffine database listed

# 5. Tables created
psql caffine -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
# Expected: ~30-40 tables

# 6. Server is responding
curl -s http://localhost:3010/api/healthz | grep ok
# Expected: {"status":"ok"}

# 7. Check server logs for errors
# In the terminal where server is running
# Look for: "Listening on http://localhost:3010"
# No ERROR or FATAL messages
```

---

## Network Configuration (for iOS/iPad access)

To access CAFFiNE from iOS/iPad on same WiFi network:

### Find Mac's Local IP

```bash
# Get local IP address
ipconfig getifaddr en0

# Example output: 192.168.1.100
# Save this IP address
```

### Update Server Configuration

```bash
# Edit .env file
nano ~/projects/caffine/packages/backend/server/.env

# Change these lines:
AFFINE_SERVER_HOST=192.168.1.100  # Replace with your Mac's IP
AFFINE_SERVER_EXTERNAL_URL=http://192.168.1.100:3010

# Save and exit (Ctrl+O, Enter, Ctrl+X)

# Restart server
# Go to terminal running server, press Ctrl+C
# Then restart:
cd ~/projects/caffine
yarn affine server dev
```

### Test from iOS Device

```bash
# On your iPhone/iPad, open Safari
# Navigate to: http://192.168.1.100:3010/api/healthz
# (Replace 192.168.1.100 with your Mac's IP)

# Should see: {"status":"ok"}
```

### Configure macOS Firewall

```bash
# Option 1: Allow Node.js through firewall (GUI)
# 1. Open System Settings
# 2. Navigate to Network > Firewall > Options
# 3. Click "+" and add "node" application
# 4. Allow incoming connections

# Option 2: Temporarily disable firewall (for testing only)
# System Settings > Network > Firewall > Turn Off

# Option 3: Command line (requires admin password)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

---

## Common Issues & Solutions

### Issue: `psql: command not found`

```bash
# Add PostgreSQL to PATH
# If using Homebrew:
echo 'export PATH="/usr/local/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# If using Postgres.app:
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
psql --version
```

### Issue: `pg_config: command not found` during pgvector install

```bash
# Install PostgreSQL development headers
brew install postgresql@17

# Add to PATH
echo 'export PATH="/usr/local/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
pg_config --version

# Retry pgvector install
brew install pgvector
```

### Issue: `ERROR: extension "vector" does not exist`

```bash
# Verify pgvector installed
ls -la $(pg_config --sharedir)/extension/ | grep vector

# If no files found, reinstall
brew reinstall pgvector

# Connect to database and create extension
psql caffine -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify
psql caffine -c "\dx vector"
```

### Issue: Redis connection failed

```bash
# Check if Redis is running
redis-cli ping

# If no response, start Redis
brew services start redis

# Wait 5 seconds, then test again
sleep 5
redis-cli ping

# Check Redis is listening on correct port
redis-cli -h localhost -p 6379 ping
```

### Issue: Native build fails with Rust errors

```bash
# Check Rust version
rustc --version

# Update Rust to latest stable
rustup update stable

# Check required Rust version
cat ~/projects/caffine/rust-toolchain.toml

# Clean and rebuild
cd ~/projects/caffine
yarn affine @affine/server-native clean
yarn affine @affine/server-native build

# If still failing, check build logs for specific error
# Common issues:
# - Missing system libraries (install Xcode Command Line Tools)
# - Incompatible Rust version (check rust-toolchain.toml)
```

### Issue: Server won't start - port already in use

```bash
# Check what's using port 3010
lsof -i :3010

# Kill process if needed
kill -9 <PID>

# Or use different port in .env:
echo "AFFINE_SERVER_PORT=3011" >> ~/projects/caffine/packages/backend/server/.env

# Restart server
cd ~/projects/caffine
yarn affine server dev
```

### Issue: Database migrations fail

```bash
# Check database connection
psql caffine -c "SELECT version();"

# If connection works, check migration status
cd ~/projects/caffine/packages/backend/server
yarn prisma migrate status

# Reset database (WARNING: deletes all data)
psql postgres -c "DROP DATABASE caffine;"
psql postgres -c "CREATE DATABASE caffine;"
psql caffine -c "CREATE EXTENSION vector;"

# Re-run migrations
yarn prisma migrate deploy
```

---

## Next Steps After Setup

### 1. Access CAFFiNE Web Interface

```bash
# Server running on: http://localhost:3010
# Frontend running on: http://localhost:8080

# Open browser
open http://localhost:8080

# Create account or login with test user:
# Email: dev@affine.pro
# Password: dev
```

### 2. Create Workspace and Test Documents

- Click "Create Workspace"
- Create a test document
- Verify autosave works (look for "Saved" indicator)
- Test real-time sync (open same workspace in another browser tab)

### 3. Build iOS App

```bash
# Navigate to iOS app
cd ~/projects/caffine/packages/frontend/apps/ios

# Configure server URL
# Edit App/capacitor.config.ts
# Set: server.url = "http://192.168.1.100:3010"

# Build app
BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/ios build

# Sync to Xcode project
yarn affine @affine/ios cap sync

# Open in Xcode
yarn affine @affine/ios cap open ios
```

---

## Summary of Commands (Quick Reference)

```bash
# Install dependencies
brew install pgvector redis

# Start services
brew services start redis

# Create database
psql postgres -c "CREATE DATABASE caffine;"
psql postgres -c "CREATE USER caffine_user WITH PASSWORD 'caffine_secure_2026';"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE caffine TO caffine_user;"
psql caffine -c "CREATE EXTENSION vector;"

# Setup project
cd ~/projects/caffine
yarn install
yarn affine @affine/server-native build
yarn affine @affine/reader build

# Initialize database
cd packages/backend/server
cp .env.example .env
# Edit .env with database credentials
yarn prisma migrate deploy
yarn seed  # optional

# Start server
cd ~/projects/caffine
yarn affine server dev

# In another terminal, start frontend
yarn dev
```

---

## Final Verification Script

Run this to verify complete setup:

```bash
#!/bin/bash
echo "=== CAFFiNE Setup Verification ==="
echo ""

echo "1. PostgreSQL 17:"
psql --version

echo ""
echo "2. PostgreSQL running:"
pg_isready -h localhost -p 5432

echo ""
echo "3. Redis running:"
redis-cli ping

echo ""
echo "4. pgvector extension:"
psql caffine -c "SELECT extname FROM pg_extension WHERE extname = 'vector';" -t

echo ""
echo "5. Database tables:"
psql caffine -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" -t

echo ""
echo "6. Server health:"
curl -s http://localhost:3010/api/healthz

echo ""
echo "7. Node.js version:"
node --version

echo ""
echo "8. Rust version:"
rustc --version

echo ""
echo "=== Setup Complete ==="
echo "Server: http://localhost:3010"
echo "Frontend: http://localhost:8080"
echo "GraphQL: http://localhost:3010/graphql"
```

Save this as `verify-setup.sh`, make executable with `chmod +x verify-setup.sh`, then run `./verify-setup.sh`

---

## Support

If you encounter issues not covered here:

1. Check server logs (terminal where `yarn affine server dev` is running)
2. Check PostgreSQL logs: `/usr/local/var/log/postgresql@17.log`
3. Check Redis logs: `/usr/local/var/log/redis.log`
4. Review Common Issues section above
5. Provide error messages for debugging

---

**Setup should take approximately 30-60 minutes total.**

**Critical path:**
1. Install pgvector + Redis (5 min)
2. Create database (2 min)
3. Install dependencies (10 min)
4. Build native modules (10 min)
5. Run migrations (2 min)
6. Start server (1 min)
7. Test and verify (5 min)

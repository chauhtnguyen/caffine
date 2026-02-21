# Start CAFFiNE Server - Quick Guide

Your database is ready. Now configure and start the server.

---

## Step 1: Configure Server Environment

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

# Storage (defaults to ~/.affine/storage if not set)
# AFFINE_STORAGE_ROOT=/custom/path/to/storage
EOF

echo "✓ Created .env file"
```

---

## Step 2: Build Native Dependencies (if not done)

```bash
# Navigate to project root
cd ~/projects/caffine

# Check if already built
ls -la packages/backend/native/index.node 2>/dev/null && echo "✓ Native module exists" || echo "⚠ Need to build native module"

# If native module doesn't exist, build it:
yarn affine @affine/server-native build

# Build reader package (if not done)
yarn affine @affine/reader build
```

---

## Step 3: Verify Database Connection

```bash
# Test database connection
cd ~/projects/caffine/packages/backend/server

# Quick Prisma test
yarn prisma db execute --stdin <<< "SELECT version();"

# Should show PostgreSQL version
```

---

## Step 4: Start Server

```bash
# Navigate to project root
cd ~/projects/caffine

# Start server in development mode
yarn affine server dev

# Expected output:
# [Nest] INFO [Server] Listening on http://localhost:3010
# [Nest] INFO [GraphQL] Playground http://localhost:3010/graphql

# Server is now running
# Keep this terminal open
```

---

## Step 5: Test Server (New Terminal)

Open a new terminal and run:

```bash
# Health check
curl http://localhost:3010/api/healthz

# Expected: {"status":"ok"}

# GraphQL playground (browser)
open http://localhost:3010/graphql

# Should open GraphQL playground in browser
```

---

## Step 6: Start Frontend (Optional)

In another terminal:

```bash
cd ~/projects/caffine

# Start frontend dev server
yarn dev

# Select "web" when prompted

# Opens on http://localhost:8080
# Auto-connects to backend at http://localhost:3010
```

Access at: http://localhost:8080

---

## Quick Troubleshooting

### Server won't start - port in use

```bash
# Check what's using port 3010
lsof -i :3010

# Kill if needed
kill -9 <PID>
```

### Database connection error

```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection manually
psql postgresql://caffine:caffine@localhost:5432/caffine -c "SELECT 1;"
```

### Native module error

```bash
# Rebuild native modules
cd ~/projects/caffine
yarn affine @affine/server-native clean
yarn affine @affine/server-native build
```

---

## Your Existing User

You have 1 user in the database. To use it:

```bash
# Check user email
psql postgresql://caffine:caffine@localhost:5432/caffine -c "SELECT email, name FROM users;"

# Reset password if needed (in psql):
# UPDATE users SET password = '$hashed_password' WHERE email = 'user@example.com';
```

Or create new user via frontend signup at http://localhost:8080

---

## Network Access for iOS/iPad

### Find Mac IP

```bash
ipconfig getifaddr en0
# Example: 192.168.1.100
```

### Update .env

```bash
nano ~/projects/caffine/packages/backend/server/.env

# Change:
AFFINE_SERVER_HOST=192.168.1.100  # Your Mac's IP
AFFINE_SERVER_EXTERNAL_URL=http://192.168.1.100:3010

# Save and restart server
```

### Allow Firewall

```bash
# System Settings > Network > Firewall > Options
# Add "node" and allow incoming connections

# Or command line:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

### Test from iOS

```bash
# On iPhone/iPad Safari:
# http://192.168.1.100:3010/api/healthz

# Should show: {"status":"ok"}
```

---

## Summary

**Your setup:**
- PostgreSQL 17.7 ✓
- pgvector 0.8.1 ✓  
- Redis running ✓
- Database migrated (52 tables) ✓
- 1 user exists ✓

**To start CAFFiNE:**
```bash
cd ~/projects/caffine/packages/backend/server
# Create .env with DATABASE_URL (see Step 1)

cd ~/projects/caffine
yarn affine server dev  # Start server
yarn dev                # Start frontend (separate terminal)
```

**Access:**
- Frontend: http://localhost:8080
- Backend: http://localhost:3010
- GraphQL: http://localhost:3010/graphql

---

Ready to start the server!

# CAFFiNE Native PostgreSQL Setup (macOS)

**For:** Chau Nguyen  
**Date:** 2026-02-21  
**Purpose:** Self-hosting CAFFiNE server using existing macOS PostgreSQL (avoiding Docker)

---

## Prerequisites Check

You mentioned having **PostgreSQL 14 and 17** already running on macOS.

**Required components:**
- ✅ PostgreSQL (14 or 17) - you have this
- ❓ **pgvector extension** - needed for AI embeddings (check below)
- ❓ **Redis** - needed for real-time collaboration (lightweight)
- ✅ Node.js v22+ - needed for server runtime
- ✅ Rust toolchain - needed for native modules

---

## Step 1: Choose PostgreSQL Version

**Recommendation:** Use **PostgreSQL 17** (newer, better performance)

**Verify which is running:**
```bash
# Check running Postgres processes
ps aux | grep postgres

# Check installed versions
ls -la /usr/local/var/postgres*
# or
ls -la ~/Library/Application\ Support/Postgres

# If using Postgres.app:
ls -la /Applications/Postgres.app/Contents/Versions/
```

**Set default version (if multiple):**
```bash
# Add to ~/.zshrc or ~/.bash_profile
export PATH="/Applications/Postgres.app/Contents/Versions/17/bin:$PATH"
# or for Homebrew:
export PATH="/usr/local/opt/postgresql@17/bin:$PATH"

# Reload shell
source ~/.zshrc
```

**Verify active version:**
```bash
psql --version
# Should show: psql (PostgreSQL) 17.x
```

---

## Step 2: Install pgvector Extension

CAFFiNE requires **pgvector** for AI embedding search functionality.

### Option A: Homebrew (Easiest)

```bash
# Install pgvector
brew install pgvector

# If using Postgres 14:
brew install pgvector --with-postgresql@14

# Verify installation
ls -la $(pg_config --sharedir)/extension/ | grep vector
# Should show: vector--*.sql files
```

### Option B: Compile from Source

```bash
# Clone pgvector repo
git clone https://github.com/pgvector/pgvector.git
cd pgvector

# Make sure pg_config points to correct Postgres
which pg_config
pg_config --version

# Build and install
make
make install  # May need sudo

# Verify
ls -la $(pg_config --sharedir)/extension/ | grep vector
```

### Enable pgvector in Database

```bash
# Connect to Postgres
psql postgres

# Create extension
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx vector

# Exit
\q
```

---

## Step 3: Install Redis

Redis is required for:
- Real-time collaboration queues
- Session management
- Caching layer

### Install via Homebrew

```bash
# Install Redis
brew install redis

# Start Redis service (runs on startup)
brew services start redis

# Or run manually (for testing):
redis-server

# Verify Redis is running
redis-cli ping
# Should respond: PONG
```

**Redis uses ~50MB RAM and runs on port 6379 (default)**

---

## Step 4: Create CAFFiNE Database

```bash
# Connect to Postgres as superuser
psql postgres

# Create database
CREATE DATABASE caffine;

# Create user (optional, for security)
CREATE USER caffine_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE caffine TO caffine_user;

# Enable pgvector extension in caffine database
\c caffine
CREATE EXTENSION IF NOT EXISTS vector;

# Verify
\dx

# Exit
\q
```

**Database connection details (save these):**
- **Host:** localhost
- **Port:** 5432 (default Postgres port)
- **Database:** caffine
- **User:** caffine_user (or your postgres user)
- **Password:** (your password)

---

## Step 5: Configure CAFFiNE Server

```bash
# Navigate to server package
cd ~/projects/caffine/packages/backend/server

# Create environment file
cp .env.example .env

# Edit .env
nano .env
```

**Critical environment variables:**

```bash
# Database connection
DATABASE_URL="postgresql://caffine_user:your_secure_password@localhost:5432/caffine"

# Redis connection
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379

# Server configuration
NODE_ENV=production
AFFINE_SERVER_HOST=your-mac-hostname.local  # or IP address
AFFINE_SERVER_PORT=3010
AFFINE_SERVER_HTTPS=false  # set true if using SSL

# Optional: External URL (for links in emails, etc.)
AFFINE_SERVER_EXTERNAL_URL=http://your-mac-hostname.local:3010

# Indexing (optional - disable for lower resource usage)
AFFINE_INDEXER_ENABLED=true

# Feature flags
# AFFINE_EARLY_ACCESS_PREVIEW=false
```

**Find your Mac hostname:**
```bash
hostname
# or
scutil --get ComputerName
```

---

## Step 6: Build Native Dependencies

CAFFiNE has Rust-based native modules that need compilation.

```bash
# Navigate to project root
cd ~/projects/caffine

# Install all dependencies
yarn install

# Build native module (@affine/server-native)
yarn affine @affine/server-native build

# This may take 5-10 minutes (Rust compilation)
# Output will be in packages/backend/native/
```

**Troubleshooting build issues:**

If native build fails:
```bash
# Ensure Rust toolchain is installed
rustc --version
# If not: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Ensure correct Rust version
cat rust-toolchain.toml
rustup show

# Try clean build
yarn affine @affine/server-native clean
yarn affine @affine/server-native build
```

---

## Step 7: Build Reader Package

```bash
# From project root
yarn affine @affine/reader build
```

---

## Step 8: Initialize Database Schema

This runs Prisma migrations to create all tables:

```bash
# Navigate to server package
cd packages/backend/server

# Run migrations
yarn prisma migrate deploy

# Or in dev mode (creates migration history):
yarn prisma migrate dev

# Verify tables created
psql caffine -c "\dt"
# Should show: users, workspaces, snapshots, updates, etc.
```

**Database schema includes:**
- `users` - User accounts
- `workspaces` - Workspace metadata
- `snapshots` - Document CRDT snapshots
- `updates` - Incremental CRDT updates
- `blobs` - File attachments
- `workspace_user_permissions` - Access control
- Many more...

---

## Step 9: Seed Database (Optional)

Creates test users for development:

```bash
cd packages/backend/server

# Seed database
yarn seed

# Creates:
# - dev@affine.pro / password: dev
# - pro@affine.pro / password: pro
# - team@affine.pro / password: team
```

**For production:** Skip seeding, create real users via signup.

---

## Step 10: Start CAFFiNE Server

```bash
# From project root
cd ~/projects/caffine

# Start server in development mode (with auto-reload)
yarn affine server dev

# Or production mode:
yarn affine server build
yarn affine server start
```

**Server should start on port 3010:**
```
[Server] Listening on http://localhost:3010
[GraphQL] Playground available at http://localhost:3010/graphql
```

**Test server:**
```bash
# From another terminal
curl http://localhost:3010/api/healthz
# Should return: {"status":"ok"}
```

---

## Step 11: Start Web Frontend (Optional)

To access CAFFiNE via web browser:

```bash
# From project root
cd ~/projects/caffine

# Start frontend dev server
yarn dev

# Select "web" when prompted for distribution

# Frontend runs on http://localhost:8080
# Connects to backend on http://localhost:3010
```

**Access CAFFiNE:**
- Open browser: http://localhost:8080
- Sign up or login with test account (if seeded)
- Create workspace and test documents

---

## Step 12: Configure for Network Access

To access from iOS/iPad devices on same WiFi:

### Find Mac IP Address

```bash
# Get local IP
ifconfig en0 | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
# Example output: 192.168.1.100

# Or use Tailscale IP (if installed)
tailscale ip -4
# Example: 100.64.0.1
```

### Update Server Configuration

```bash
# Edit .env file
nano packages/backend/server/.env

# Change:
AFFINE_SERVER_HOST=192.168.1.100  # your Mac's IP
AFFINE_SERVER_EXTERNAL_URL=http://192.168.1.100:3010

# Restart server
# Ctrl+C to stop
yarn affine server dev
```

### Firewall Configuration

```bash
# Allow port 3010 through macOS firewall
# System Settings > Network > Firewall > Options
# Add "node" to allowed applications

# Or disable firewall temporarily for testing:
# System Settings > Network > Firewall > Turn Off
```

### Test from iPhone/iPad

```bash
# On iOS device, open Safari
# Navigate to: http://192.168.1.100:3010

# Should see CAFFiNE web interface
# Or API response if hitting /api/healthz
```

---

## Data Storage Locations

### PostgreSQL Data

```bash
# Default Postgres data directory (depends on installation)
# Homebrew:
/usr/local/var/postgresql@17/

# Postgres.app:
~/Library/Application Support/Postgres/var-17/

# Check current data directory:
psql caffine -c "SHOW data_directory;"
```

**What's stored:**
- CRDT snapshots (compressed binary blobs)
- Incremental updates
- User accounts, permissions
- Workspace metadata

### File Uploads (Blobs)

```bash
# Default location (configurable via .env)
~/.affine/storage/

# Structure:
~/.affine/storage/
└── blobs/
    └── {workspace-id}/
        ├── {blob-id-1}  # Image
        ├── {blob-id-2}  # PDF
        └── ...
```

**Configure custom storage location:**
```bash
# In .env:
AFFINE_STORAGE_ROOT=/path/to/custom/storage
```

---

## Backup Strategy

### PostgreSQL Backup

```bash
# Full database dump
pg_dump caffine > ~/backups/caffine-backup-$(date +%F).sql

# Compressed backup
pg_dump caffine | gzip > ~/backups/caffine-backup-$(date +%F).sql.gz

# Restore from backup
psql caffine < ~/backups/caffine-backup-2026-02-21.sql
```

### Blob Storage Backup

```bash
# Copy entire storage directory
cp -r ~/.affine/storage ~/backups/affine-storage-$(date +%F)

# Or use rsync for incremental backups
rsync -av --progress ~/.affine/storage/ ~/backups/affine-storage/
```

### Automated Backup Script

```bash
# Create backup script
cat > ~/bin/backup-caffine.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups/caffine
DATE=$(date +%F)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump caffine | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Backup storage
rsync -a ~/.affine/storage/ $BACKUP_DIR/storage-$DATE/

# Keep only last 7 days
find $BACKUP_DIR -type f -name "db-*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -type d -name "storage-*" -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
EOF

chmod +x ~/bin/backup-caffine.sh

# Run manually
~/bin/backup-caffine.sh

# Or schedule with launchd (macOS cron alternative)
# Create: ~/Library/LaunchAgents/com.caffine.backup.plist
```

---

## Running Server as Background Service (Production)

For production use, run server as a background service using **launchd** (macOS service manager).

### Create Launch Agent

```bash
# Create plist file
nano ~/Library/LaunchAgents/com.caffine.server.plist
```

**Paste configuration:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.caffine.server</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YOUR_USERNAME/projects/caffine/packages/backend/server/dist/index.js</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/projects/caffine</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>DATABASE_URL</key>
        <string>postgresql://caffine_user:password@localhost:5432/caffine</string>
        <key>REDIS_SERVER_HOST</key>
        <string>localhost</string>
    </dict>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/.caffine/logs/server.log</string>
    
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/.caffine/logs/server-error.log</string>
</dict>
</plist>
```

**Load service:**
```bash
# Load launch agent
launchctl load ~/Library/LaunchAgents/com.caffine.server.plist

# Start service
launchctl start com.caffine.server

# Check status
launchctl list | grep caffine

# View logs
tail -f ~/.caffine/logs/server.log
```

**Manage service:**
```bash
# Stop
launchctl stop com.caffine.server

# Unload (disable)
launchctl unload ~/Library/LaunchAgents/com.caffine.server.plist

# Restart
launchctl stop com.caffine.server && launchctl start com.caffine.server
```

---

## Monitoring & Logs

### Server Logs

```bash
# If running via yarn dev:
# Logs output to terminal

# If running via launchd:
tail -f ~/.caffine/logs/server.log
tail -f ~/.caffine/logs/server-error.log

# Search for errors
grep ERROR ~/.caffine/logs/server.log
```

### Database Logs

```bash
# Postgres logs location (depends on installation)
# Homebrew:
tail -f /usr/local/var/log/postgresql@17.log

# Postgres.app:
# View logs in Postgres.app GUI
```

### Redis Logs

```bash
# Redis logs (if running via brew services)
tail -f /usr/local/var/log/redis.log

# Redis CLI monitoring
redis-cli monitor
```

### Health Checks

```bash
# API health endpoint
curl http://localhost:3010/api/healthz

# GraphQL playground (browser)
open http://localhost:3010/graphql

# Database connection test
psql caffine -c "SELECT COUNT(*) FROM users;"

# Redis connection test
redis-cli ping
```

---

## Troubleshooting

### Server won't start

**Check ports in use:**
```bash
# Check if port 3010 already used
lsof -i :3010

# Check Postgres connection
psql caffine -c "SELECT version();"

# Check Redis connection
redis-cli ping
```

**Check environment variables:**
```bash
cd packages/backend/server
cat .env | grep -v '^#' | grep -v '^$'

# Verify DATABASE_URL format:
# postgresql://user:password@host:port/database
```

**Check native modules:**
```bash
# Rebuild native modules
yarn affine @affine/server-native clean
yarn affine @affine/server-native build
```

### Database migration errors

```bash
# Reset database (WARNING: deletes all data)
psql postgres -c "DROP DATABASE caffine;"
psql postgres -c "CREATE DATABASE caffine;"
psql caffine -c "CREATE EXTENSION vector;"

# Re-run migrations
cd packages/backend/server
yarn prisma migrate deploy

# Re-seed
yarn seed
```

### pgvector not found

```bash
# Check pgvector installed
psql caffine -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# If not found, create extension
psql caffine -c "CREATE EXTENSION vector;"

# Verify pgvector files exist
ls -la $(pg_config --sharedir)/extension/ | grep vector
```

### Redis connection failed

```bash
# Check Redis running
redis-cli ping

# If not running:
brew services start redis

# Check Redis port
redis-cli -h localhost -p 6379 ping

# Check Redis config
redis-cli CONFIG GET bind
redis-cli CONFIG GET port
```

### iOS app can't connect

```bash
# Test from iOS device browser
# Safari -> http://your-mac-ip:3010/api/healthz

# Check macOS firewall
# System Settings > Network > Firewall > Options
# Ensure "node" is allowed

# Check server binding
# In .env, use 0.0.0.0 instead of localhost:
# AFFINE_SERVER_HOST=0.0.0.0

# Verify Mac IP
ifconfig en0 | grep "inet "
```

---

## Performance Tuning

### PostgreSQL Optimization

```bash
# Edit Postgres config (location varies)
# Homebrew: /usr/local/var/postgresql@17/postgresql.conf
# Postgres.app: ~/Library/Application Support/Postgres/var-17/postgresql.conf

nano /usr/local/var/postgresql@17/postgresql.conf
```

**Recommended settings for CAFFiNE (8GB Mac):**
```ini
# Memory
shared_buffers = 512MB          # 1/4 of RAM
effective_cache_size = 2GB      # 1/4 to 1/2 of RAM
work_mem = 16MB                 # Per operation
maintenance_work_mem = 128MB    # For maintenance tasks

# Connections
max_connections = 100           # Adjust based on usage

# Query Performance
random_page_cost = 1.1          # For SSD (default 4.0 for HDD)
effective_io_concurrency = 200  # For SSD

# Write Performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

**Restart Postgres after changes:**
```bash
# Homebrew
brew services restart postgresql@17

# Postgres.app
# Restart via GUI
```

### Redis Optimization

Redis is already optimized for macOS out-of-the-box. Default settings work well.

**Optional tuning:**
```bash
# Edit Redis config
nano /usr/local/etc/redis.conf

# Memory limit (prevent runaway usage)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Restart Redis
brew services restart redis
```

---

## Next Steps

### 1. Build iOS App

```bash
cd ~/projects/caffine/packages/frontend/apps/ios

# Configure server URL
# Edit: App/capacitor.config.ts
# Set: server.url = "http://192.168.1.100:3010"

# Build app
BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/ios build

# Sync to Xcode project
yarn affine @affine/ios cap sync

# Open in Xcode
yarn affine @affine/ios cap open ios
```

### 2. Build macOS Desktop App

```bash
cd ~/projects/caffine/packages/frontend/apps/electron

# Build
yarn affine @affine/electron build

# Or run in dev mode
yarn affine @affine/electron dev
```

### 3. Set Up Automated Backups

```bash
# Create backup script (see Backup Strategy section)
~/bin/backup-caffine.sh

# Schedule with launchd
# Create: ~/Library/LaunchAgents/com.caffine.backup.plist
```

### 4. Configure SSL/TLS (Optional)

For HTTPS access (recommended for remote access):

```bash
# Generate self-signed cert (development)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Or use Let's Encrypt (production)
# Requires domain name pointing to your Mac
brew install certbot
certbot certonly --standalone -d your-domain.com

# Configure server to use SSL
# In .env:
AFFINE_SERVER_HTTPS=true
AFFINE_SSL_CERT=/path/to/cert.pem
AFFINE_SSL_KEY=/path/to/key.pem
```

---

## Summary Checklist

**Prerequisites:**
- [x] PostgreSQL 14 or 17 installed
- [ ] pgvector extension installed
- [ ] Redis installed and running
- [ ] Node.js v22+ installed
- [ ] Rust toolchain installed

**Setup:**
- [ ] Database created (caffine)
- [ ] User created (caffine_user)
- [ ] pgvector extension enabled
- [ ] .env file configured
- [ ] Native modules built
- [ ] Database migrations run
- [ ] Server starts successfully

**Network:**
- [ ] Server accessible from iOS device
- [ ] Firewall configured
- [ ] IP address/hostname configured

**Production:**
- [ ] launchd service configured
- [ ] Backup script created
- [ ] Monitoring in place

---

## Support

If you encounter issues during setup:

1. Check logs (server, Postgres, Redis)
2. Verify all services running
3. Test connectivity from iOS device
4. Review troubleshooting section above

Let me know which step you're on and I can provide more detailed guidance!

# Custom Database Location Configuration

How to configure CAFFiNE to use a PostgreSQL database at a custom location.

---

## Understanding Database Location

**Two different concepts:**

1. **PostgreSQL Data Directory** - Where PostgreSQL stores database files on disk
2. **Database Connection URL** - How CAFFiNE server connects to PostgreSQL

CAFFiNE only needs to know the **connection URL**. PostgreSQL handles where files are stored.

---

## Current Setup

Your current configuration:

**PostgreSQL Data Directory:**
```bash
# Find current PostgreSQL data directory
psql postgres -c "SHOW data_directory;"

# Typical locations:
# Homebrew: /usr/local/var/postgresql@17/
# Postgres.app: ~/Library/Application Support/Postgres/var-17/
```

**CAFFiNE Connection:**
```bash
# In packages/backend/server/.env:
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine"
```

---

## Option 1: Change PostgreSQL Data Directory

Move PostgreSQL's data storage to a different location.

### Step 1: Stop PostgreSQL

```bash
# If using Homebrew
brew services stop postgresql@17

# If using Postgres.app
# Stop via GUI
```

### Step 2: Move Data Directory

```bash
# Example: Move to external drive
NEW_DATA_DIR="/Volumes/ExternalDrive/PostgreSQL/data"

# Create new directory
mkdir -p "$NEW_DATA_DIR"

# Get current data directory
CURRENT_DATA_DIR=$(psql postgres -tc "SHOW data_directory;" | xargs)

# Copy all data
cp -R "$CURRENT_DATA_DIR"/* "$NEW_DATA_DIR/"

# Set ownership (macOS user)
chown -R $(whoami) "$NEW_DATA_DIR"
```

### Step 3: Configure PostgreSQL to Use New Location

**For Homebrew PostgreSQL:**

```bash
# Edit PostgreSQL config
nano /usr/local/var/postgresql@17/postgresql.conf

# Change:
data_directory = '/Volumes/ExternalDrive/PostgreSQL/data'

# Or use custom data directory when starting:
postgres -D /Volumes/ExternalDrive/PostgreSQL/data
```

**For Postgres.app:**

```bash
# Create new server with custom data directory
# 1. Open Postgres.app
# 2. Click "+" to add new server
# 3. Choose "Custom Location"
# 4. Select: /Volumes/ExternalDrive/PostgreSQL/data
# 5. Start new server
```

### Step 4: Restart PostgreSQL

```bash
# Homebrew
brew services start postgresql@17

# Postgres.app
# Start via GUI
```

### Step 5: Verify New Location

```bash
psql postgres -c "SHOW data_directory;"
# Should show: /Volumes/ExternalDrive/PostgreSQL/data
```

**CAFFiNE connection URL doesn't change** - still uses `localhost:5432/caffine`

---

## Option 2: Use Different Database (Same PostgreSQL Instance)

Keep PostgreSQL where it is, but use a different database name/location.

### Create Database in Custom Tablespace

```bash
# Connect to PostgreSQL
psql postgres

-- Create custom tablespace (storage location)
CREATE TABLESPACE caffine_external 
  LOCATION '/Volumes/ExternalDrive/PostgreSQL/tablespace';

-- Create database using custom tablespace
CREATE DATABASE caffine_external 
  TABLESPACE caffine_external;

-- Create user
CREATE USER caffine_user WITH PASSWORD 'caffine';
GRANT ALL PRIVILEGES ON DATABASE caffine_external TO caffine_user;

-- Enable pgvector
\c caffine_external
CREATE EXTENSION vector;
\q
```

### Update CAFFiNE Connection

```bash
# Edit .env
nano ~/projects/caffine/packages/backend/server/.env

# Change:
DATABASE_URL="postgresql://caffine_user:caffine@localhost:5432/caffine_external"
```

### Migrate Schema

```bash
cd ~/projects/caffine/packages/backend/server
yarn prisma migrate deploy
```

---

## Option 3: Remote Database Server

Use PostgreSQL running on a different machine or network location.

### Example: Database on NAS

```bash
# On NAS (192.168.1.50), install PostgreSQL
# Configure to accept remote connections

# Edit pg_hba.conf on NAS:
# Add line:
host    all    all    192.168.1.0/24    md5

# Edit postgresql.conf on NAS:
listen_addresses = '*'

# Create database on NAS
psql postgres
CREATE DATABASE caffine;
CREATE USER caffine_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE caffine TO caffine_user;
CREATE EXTENSION vector;
```

### Update CAFFiNE Connection

```bash
# Edit .env on your Mac
nano ~/projects/caffine/packages/backend/server/.env

# Change:
DATABASE_URL="postgresql://caffine_user:secure_password@192.168.1.50:5432/caffine"
```

### Test Connection

```bash
# From your Mac, test connection to NAS
psql postgresql://caffine_user:secure_password@192.168.1.50:5432/caffine -c "SELECT version();"
```

---

## Option 4: Environment Variable for Flexibility

Make database location configurable without editing .env file.

### Update .env Template

```bash
# In packages/backend/server/.env
DATABASE_URL="${DATABASE_URL:-postgresql://caffine:caffine@localhost:5432/caffine}"

# Now you can override via environment variable:
export DATABASE_URL="postgresql://user:pass@host:port/dbname"
yarn affine server dev
```

### Create Profile-Based Configs

```bash
# .env.local (for local development)
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine"

# .env.external (for external drive)
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine_external"

# .env.remote (for remote server)
DATABASE_URL="postgresql://caffine:caffine@192.168.1.50:5432/caffine"

# Load specific config:
cp .env.external .env
yarn affine server dev
```

---

## Configuration in Built Apps

### Desktop App (DMG)

The desktop app connects to server via HTTP. Database location is configured **on the server side**, not in the app.

**Desktop app config:**
```
Settings > Server URL > http://localhost:3010
```

**Server determines database location** via `.env` file.

### iOS/iPad App

Same as desktop - apps connect to server, server connects to database.

**iOS app only needs:**
```typescript
// In capacitor.config.ts
server: {
  url: 'http://your-mac-ip:3010'
}
```

---

## Dynamic Database Location (Advanced)

Add UI to configure database location without editing files.

### Create Admin Settings Page

```typescript
// In server code (packages/backend/server)
// Add admin API endpoint

import { Controller, Post, Body } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Post('database-config')
  async updateDatabaseConfig(@Body() config: { url: string }) {
    // Validate URL
    // Update .env file
    // Restart database connection pool
  }
}
```

### Create Settings UI

```typescript
// In frontend
function DatabaseSettings() {
  const [dbUrl, setDbUrl] = useState('');
  
  const handleSave = async () => {
    await fetch('/api/admin/database-config', {
      method: 'POST',
      body: JSON.stringify({ url: dbUrl })
    });
    // Restart server
  };
  
  return (
    <div>
      <input 
        value={dbUrl} 
        onChange={e => setDbUrl(e.target.value)}
        placeholder="postgresql://user:pass@host:port/db"
      />
      <button onClick={handleSave}>Save & Restart</button>
    </div>
  );
}
```

---

## Recommended Setup for You

Based on your requirements, I recommend:

### For Development/Testing

**Keep current setup:**
- PostgreSQL data: Default Homebrew location
- Database: `caffine` on localhost
- Connection: `postgresql://caffine:caffine@localhost:5432/caffine`

### For Production/Custom Location

**Option A: External Drive**
```bash
# 1. Create tablespace on external drive
psql postgres << 'EOF'
CREATE TABLESPACE caffine_external 
  LOCATION '/Volumes/ExternalDrive/CAFFiNE/db';
CREATE DATABASE caffine_prod TABLESPACE caffine_external;
GRANT ALL ON DATABASE caffine_prod TO caffine;
EOF

psql caffine_prod -c "CREATE EXTENSION vector;"

# 2. Update .env
DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine_prod"

# 3. Migrate
cd ~/projects/caffine/packages/backend/server
yarn prisma migrate deploy
```

**Option B: NAS/Network Storage**
```bash
# 1. Set up PostgreSQL on NAS
# 2. Create database and user
# 3. Update .env:
DATABASE_URL="postgresql://caffine:password@nas-ip:5432/caffine"
```

---

## Storage Size Estimates

Typical CAFFiNE database sizes:

- **Empty database:** ~50 MB (schema only)
- **100 documents:** ~100-200 MB
- **1,000 documents:** ~500 MB - 1 GB
- **10,000 documents:** ~5-10 GB

**Blob storage** (images, files) stored separately:
- Default: `~/.affine/storage/`
- Configurable via: `AFFINE_STORAGE_ROOT=/custom/path`

---

## Quick Reference

### Current Database Location

```bash
psql postgres -c "SHOW data_directory;"
```

### List All Databases

```bash
psql -l
```

### Check Database Size

```bash
psql caffine -c "
SELECT 
  pg_size_pretty(pg_database_size('caffine')) as db_size,
  pg_size_pretty(pg_total_relation_size('snapshots')) as snapshots_size,
  pg_size_pretty(pg_total_relation_size('updates')) as updates_size;
"
```

### Change Connection URL

```bash
# Edit .env
nano ~/projects/caffine/packages/backend/server/.env

# Update:
DATABASE_URL="postgresql://user:pass@host:port/dbname"

# Restart server
cd ~/projects/caffine
yarn affine server dev
```

---

## Configuration Template

Create `database-configs.sh` for easy switching:

```bash
#!/bin/bash
# Database Configuration Switcher

case "$1" in
  local)
    DB_URL="postgresql://caffine:caffine@localhost:5432/caffine"
    ;;
  external)
    DB_URL="postgresql://caffine:caffine@localhost:5432/caffine_external"
    ;;
  nas)
    DB_URL="postgresql://caffine:caffine@192.168.1.50:5432/caffine"
    ;;
  *)
    echo "Usage: $0 {local|external|nas}"
    exit 1
    ;;
esac

# Update .env
cd ~/projects/caffine/packages/backend/server
echo "DATABASE_URL=\"$DB_URL\"" > .env.database
cat .env.database .env.example | grep -v DATABASE_URL > .env.tmp
mv .env.tmp .env

echo "✓ Database configured: $DB_URL"
```

**Usage:**
```bash
./database-configs.sh local     # Use local database
./database-configs.sh external  # Use external drive
./database-configs.sh nas       # Use NAS
```

---

Would you like me to implement any of these options for your setup?

**Quick implementation for external drive:**

```bash
# 1. Where do you want to store the database?
CUSTOM_LOCATION="/path/to/your/location"

# 2. Create tablespace
psql postgres -c "CREATE TABLESPACE caffine_custom LOCATION '$CUSTOM_LOCATION';"

# 3. Create database on that tablespace
psql postgres -c "CREATE DATABASE caffine_custom TABLESPACE caffine_custom;"

# 4. Update .env
echo 'DATABASE_URL="postgresql://caffine:caffine@localhost:5432/caffine_custom"' >> ~/projects/caffine/packages/backend/server/.env
```

Let me know your preferred storage location and I can create the exact commands for you!

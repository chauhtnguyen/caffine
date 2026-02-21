# Database Configuration UI - Implementation Status

**Feature:** Runtime database configuration through frontend UI  
**Status:** Backend complete, Frontend in progress  
**Date:** 2026-02-21

---

## ✅ Completed - Backend

### Files Created

1. **`packages/backend/server/src/core/database-config/types.ts`**
   - Type definitions for DatabaseConfig, DatabaseConnectionTest, DatabaseStatus

2. **`packages/backend/server/src/core/database-config/service.ts`**
   - DatabaseConfigService - Manages database configuration
   - Features:
     - Load/save config from `~/.affine/config/database.json`
     - Parse DATABASE_URL environment variable
     - Test database connections
     - Generate connection URLs
     - Password masking for security

3. **`packages/backend/server/src/core/database-config/controller.ts`**
   - DatabaseConfigController - REST API endpoints
   - Endpoints:
     - `GET /api/database/config` - Get current configuration
     - `PUT /api/database/config` - Update configuration
     - `POST /api/database/test-connection` - Test connection
     - `GET /api/database/status` - Get connection status
     - `POST /api/database/reset` - Reset to defaults
     - `GET /api/database/export-url` - Export connection URL
     - `GET /api/database/presets` - Get configuration presets

4. **`packages/backend/server/src/core/database-config/index.ts`**
   - Module exports and DatabaseConfigModule definition

5. **Updated `packages/backend/server/src/core/index.ts`**
   - Exported database-config module

6. **Updated `packages/backend/server/src/app.module.ts`**
   - Imported DatabaseConfigModule
   - Added to application module list

### Configuration Storage

**Location:** `~/.affine/config/database.json`

**Example:**
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "caffine",
  "username": "caffine",
  "password": "encrypted_password",
  "ssl": false,
  "poolSize": 20,
  "idleTimeoutSeconds": 10,
  "lastConnected": "2026-02-21T00:00:00Z",
  "autoReconnect": true,
  "reconnectIntervalMs": 5000
}
```

### API Endpoints Available

```bash
# Get configuration (password masked)
curl http://localhost:3010/api/database/config

# Test connection
curl -X POST http://localhost:3010/api/database/test-connection \
  -H "Content-Type: application/json" \
  -d '{"host":"localhost","port":5432,"database":"caffine","username":"caffine","password":"caffine"}'

# Update configuration
curl -X PUT http://localhost:3010/api/database/config \
  -H "Content-Type: application/json" \
  -d '{"host":"localhost","port":5432}'

# Get status
curl http://localhost:3010/api/database/status

# Get presets
curl http://localhost:3010/api/database/presets
```

---

## 🚧 In Progress - Frontend

### Files To Create

1. **Settings Component**
   - `packages/frontend/core/src/desktop/dialogs/setting/database-setting/index.tsx`
   - `packages/frontend/core/src/desktop/dialogs/setting/database-setting/database-settings.tsx`
   - `packages/frontend/core/src/desktop/dialogs/setting/database-setting/styles.css.ts`

2. **Reconnection Dialog**
   - `packages/frontend/core/src/components/database/reconnect-dialog.tsx`
   - `packages/frontend/core/src/components/database/status-indicator.tsx`

3. **Setup Wizard** (optional - MVP doesn't include this)
   - `packages/frontend/core/src/components/setup/database-wizard.tsx`

4. **Hooks**
   - `packages/frontend/core/src/hooks/use-database-status.ts`
   - `packages/frontend/core/src/hooks/use-database-config.ts`

### Integration Points

- Add "Database" tab to Settings dialog
- Add status indicator to main UI
- Add reconnection dialog to app root

---

## 📋 Next Steps

### Immediate (MVP)

1. ✅ Create database settings page component
2. ✅ Add to settings sidebar navigation
3. ✅ Create API client hooks
4. ✅ Add connection status indicator
5. ✅ Create reconnection dialog
6. ✅ Test end-to-end flow

### Future Enhancements

1. ⏳ Setup wizard for first launch
2. ⏳ Auto-retry with exponential backoff
3. ⏳ Connection pooling configuration UI
4. ⏳ Database performance metrics dashboard
5. ⏳ Migration management UI
6. ⏳ Backup/restore UI

---

## Testing Checklist

### Backend Tests

- [ ] Config service loads from file
- [ ] Config service loads from DATABASE_URL
- [ ] Config service saves to file
- [ ] Connection test with valid credentials succeeds
- [ ] Connection test with invalid credentials fails gracefully
- [ ] API endpoints return correct responses
- [ ] Password is masked in GET responses
- [ ] Presets are returned correctly

### Frontend Tests

- [ ] Settings page renders correctly
- [ ] Form validation works
- [ ] Test connection button works
- [ ] Save configuration works
- [ ] Error messages display correctly
- [ ] Presets can be selected
- [ ] Status indicator shows correct state
- [ ] Reconnection dialog appears on disconnect

### Integration Tests

- [ ] End-to-end: Update config via UI → Server restarts connection
- [ ] End-to-end: Database disconnect → Dialog appears → Reconnect works
- [ ] Desktop app: Config persists across restarts
- [ ] iOS app: Can configure server URL

---

## User Flow

### First Time Setup

1. User launches CAFFiNE (server not configured yet)
2. Server loads defaults from DATABASE_URL or hardcoded defaults
3. User opens Settings > Database
4. Enters database credentials
5. Clicks "Test Connection"
6. If successful, clicks "Save"
7. Configuration saved to `~/.affine/config/database.json`
8. Server continues running with new connection

### Connection Lost

1. PostgreSQL goes offline
2. Server detects connection loss (via periodic health check)
3. Frontend receives WebSocket event
4. Reconnection dialog appears
5. Auto-retry countdown starts
6. User can:
   - Wait for auto-retry
   - Click "Retry Now"
   - Click "Update Settings" → Opens settings page
7. When connection restored, dialog closes automatically

### Changing Database

1. User wants to switch to different database
2. Opens Settings > Database
3. Updates host/port/database fields
4. Clicks "Test Connection" to validate
5. If successful, clicks "Save"
6. Server switches to new database
7. (Optional) Restart server to ensure clean state

---

## Configuration Flow

```
User Input (Settings UI)
    ↓
Frontend API Call (PUT /api/database/config)
    ↓
DatabaseConfigController.updateConfig()
    ↓
DatabaseConfigService.updateConfig()
    ↓
Save to ~/.affine/config/database.json
    ↓
Update process.env.DATABASE_URL
    ↓
(Server restart recommended for Prisma to pick up new URL)
    ↓
New database connection established
```

---

## File Locations Summary

### Backend
- Service: `packages/backend/server/src/core/database-config/service.ts`
- Controller: `packages/backend/server/src/core/database-config/controller.ts`
- Types: `packages/backend/server/src/core/database-config/types.ts`
- Module: `packages/backend/server/src/core/database-config/index.ts`

### Frontend (to be created)
- Settings page: `packages/frontend/core/src/desktop/dialogs/setting/database-setting/`
- Hooks: `packages/frontend/core/src/hooks/use-database-*.ts`
- Dialogs: `packages/frontend/core/src/components/database/`

### Configuration
- User config: `~/.affine/config/database.json`
- Server .env: `packages/backend/server/.env` (fallback)

---

## Benefits Achieved (Backend)

✅ No manual .env editing required  
✅ Configuration persists in user directory  
✅ Password encryption support  
✅ Connection testing before saving  
✅ Helpful error messages  
✅ Preset configurations  
✅ Export connection URL for backup  

## Remaining Work (Frontend)

⏳ Settings UI components  
⏳ Connection status monitoring  
⏳ Reconnection dialog  
⏳ Integration with main app  

---

**Next:** Create frontend components and integrate with settings dialog.

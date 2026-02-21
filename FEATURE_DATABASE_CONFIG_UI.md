# Feature: Runtime Database Configuration UI

Allow users to configure database connection through frontend settings instead of editing `.env` files.

---

## User Experience Flow

### First Launch (No Database Configured)

```
┌─────────────────────────────────────────┐
│  CAFFiNE Setup                          │
│                                         │
│  Welcome! Configure your database:      │
│                                         │
│  Database Host:  [localhost        ]   │
│  Database Port:  [5432             ]   │
│  Database Name:  [caffine          ]   │
│  Username:       [caffine          ]   │
│  Password:       [••••••••         ]   │
│                                         │
│  Advanced ▼                             │
│                                         │
│  [ Test Connection ]  [ Save & Start ] │
│                                         │
│  Presets: [Local PostgreSQL ▼]         │
└─────────────────────────────────────────┘
```

### Connection Success

```
┌─────────────────────────────────────────┐
│  ✓ Database Connected                   │
│                                         │
│  Connected to: localhost:5432/caffine   │
│  Tables: 52                             │
│  Version: PostgreSQL 17.7               │
│                                         │
│  [ Continue to CAFFiNE ]               │
└─────────────────────────────────────────┘
```

### Connection Failed

```
┌─────────────────────────────────────────┐
│  ✗ Database Connection Failed           │
│                                         │
│  Error: Connection refused              │
│  - Check PostgreSQL is running          │
│  - Verify host and port are correct     │
│  - Check username and password          │
│                                         │
│  [ Edit Settings ]  [ Retry ]          │
└─────────────────────────────────────────┘
```

### Runtime Disconnection

```
┌─────────────────────────────────────────┐
│  ⚠ Database Offline                     │
│                                         │
│  Lost connection to database            │
│  Last known: localhost:5432/caffine     │
│                                         │
│  Options:                               │
│  • Wait and retry automatically         │
│  • Update database settings             │
│  • Work in offline mode (read-only)     │
│                                         │
│  Retrying in 5s... [ Retry Now ]       │
│  [ Update Settings ]                    │
└─────────────────────────────────────────┘
```

### Settings Page (After Setup)

```
┌─────────────────────────────────────────┐
│  Settings > Database                    │
│                                         │
│  Status: ✓ Connected                    │
│  Connection: localhost:5432/caffine     │
│                                         │
│  Database Configuration:                │
│    Host:     [localhost        ]       │
│    Port:     [5432             ]       │
│    Database: [caffine          ]       │
│    Username: [caffine          ]       │
│    Password: [••••••••         ]       │
│                                         │
│  Connection Pool:                       │
│    Max Connections: [20         ]      │
│    Idle Timeout:    [10 seconds ]      │
│                                         │
│  [ Test Connection ]                    │
│  [ Save Changes ]                       │
│  [ Restore Defaults ]                   │
│                                         │
│  Last connection check: 2s ago ✓        │
└─────────────────────────────────────────┘
```

---

## Technical Implementation

### Architecture

```
Frontend (React/Settings UI)
    ↓ API calls
Backend (NestJS)
    ↓ Reads/writes config
Config Store (JSON file + in-memory)
    ↓ Provides connection params
Prisma Client (Database ORM)
    ↓ Connects using params
PostgreSQL Database
```

### Storage Location

**Config file:** `~/.affine/config/database.json`

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "caffine",
  "username": "caffine",
  "password": "encrypted_password_here",
  "ssl": false,
  "poolSize": 20,
  "idleTimeoutSeconds": 10,
  "lastConnected": "2026-02-21T00:40:00Z",
  "autoReconnect": true,
  "reconnectIntervalMs": 5000
}
```

**Password encryption:** Use system keychain or AES encryption

---

## Implementation Steps

### Step 1: Backend - Database Config Service

**File:** `packages/backend/server/src/core/database/config.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
  idleTimeoutSeconds: number;
  lastConnected?: string;
  autoReconnect: boolean;
  reconnectIntervalMs: number;
}

@Injectable()
export class DatabaseConfigService {
  private configPath = join(homedir(), '.affine', 'config', 'database.json');
  private config: DatabaseConfig;

  constructor(private configService: ConfigService) {
    this.loadConfig();
  }

  private loadConfig(): void {
    if (existsSync(this.configPath)) {
      // Load from file
      const data = readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(data);
    } else {
      // Load from .env or defaults
      this.config = {
        host: this.configService.get('DB_HOST', 'localhost'),
        port: this.configService.get('DB_PORT', 5432),
        database: this.configService.get('DB_DATABASE', 'caffine'),
        username: this.configService.get('DB_USERNAME', 'caffine'),
        password: this.configService.get('DB_PASSWORD', ''),
        ssl: this.configService.get('DB_SSL', false),
        poolSize: 20,
        idleTimeoutSeconds: 10,
        autoReconnect: true,
        reconnectIntervalMs: 5000,
      };
    }
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  async updateConfig(newConfig: Partial<DatabaseConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Save to file
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  getConnectionUrl(): string {
    const { host, port, database, username, password, ssl } = this.config;
    const sslParam = ssl ? '?ssl=true' : '';
    return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
  }

  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // Create temporary Prisma client with test config
      const { PrismaClient } = await import('@prisma/client');
      const testClient = new PrismaClient({
        datasources: {
          db: {
            url: this.getConnectionUrl(),
          },
        },
      });

      // Test query
      const result = await testClient.$queryRaw`SELECT version() as version`;
      await testClient.$disconnect();

      // Update last connected timestamp
      this.config.lastConnected = new Date().toISOString();
      await this.updateConfig({});

      return {
        success: true,
        details: {
          version: result[0]?.version,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

### Step 2: Backend - API Endpoints

**File:** `packages/backend/server/src/core/database/config.controller.ts`

```typescript
import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { DatabaseConfigService } from './config.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('api/database')
@UseGuards(AdminGuard) // Only admins can configure database
export class DatabaseConfigController {
  constructor(private dbConfigService: DatabaseConfigService) {}

  @Get('config')
  getConfig() {
    const config = this.dbConfigService.getConfig();
    // Don't expose password in response
    return {
      ...config,
      password: '********',
    };
  }

  @Put('config')
  async updateConfig(@Body() newConfig: any) {
    await this.dbConfigService.updateConfig(newConfig);
    return { success: true };
  }

  @Post('test-connection')
  async testConnection(@Body() testConfig?: any) {
    // Test with provided config or current config
    if (testConfig) {
      const tempService = new DatabaseConfigService(null);
      // Create temporary instance with test config
      await tempService.updateConfig(testConfig);
      return await tempService.testConnection();
    } else {
      return await this.dbConfigService.testConnection();
    }
  }

  @Get('status')
  async getStatus() {
    const config = this.dbConfigService.getConfig();
    const testResult = await this.dbConfigService.testConnection();
    
    return {
      connected: testResult.success,
      host: config.host,
      port: config.port,
      database: config.database,
      lastConnected: config.lastConnected,
      error: testResult.error,
      details: testResult.details,
    };
  }
}
```

### Step 3: Frontend - Database Settings Component

**File:** `packages/frontend/core/src/components/settings/DatabaseSettings.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Button, Input, Alert } from '@affine/component';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export function DatabaseSettings() {
  const [config, setConfig] = useState<DatabaseConfig>({
    host: 'localhost',
    port: 5432,
    database: 'caffine',
    username: 'caffine',
    password: '',
    ssl: false,
  });
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    loadConfig();
    checkStatus();
  }, []);

  const loadConfig = async () => {
    const response = await fetch('/api/database/config');
    const data = await response.json();
    setConfig(data);
  };

  const checkStatus = async () => {
    const response = await fetch('/api/database/status');
    const data = await response.json();
    
    if (data.connected) {
      setStatus('success');
      setDetails(data.details);
    } else {
      setStatus('error');
      setError(data.error || 'Database offline');
    }
  };

  const handleTestConnection = async () => {
    setStatus('testing');
    setError('');

    try {
      const response = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setDetails(result.details);
      } else {
        setStatus('error');
        setError(result.error);
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  const handleSave = async () => {
    // Test connection first
    await handleTestConnection();

    if (status === 'success') {
      // Save config
      await fetch('/api/database/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      // Show success message
      alert('Database configuration saved successfully!');
    }
  };

  return (
    <div className="database-settings">
      <h2>Database Configuration</h2>

      {status === 'success' && (
        <Alert type="success">
          ✓ Connected to {config.host}:{config.port}/{config.database}
          {details && <div>Version: {details.version}</div>}
        </Alert>
      )}

      {status === 'error' && (
        <Alert type="error">
          ✗ Connection failed: {error}
          <ul>
            <li>Check PostgreSQL is running</li>
            <li>Verify host and port are correct</li>
            <li>Check username and password</li>
          </ul>
        </Alert>
      )}

      <div className="form-group">
        <label>Host</label>
        <Input
          value={config.host}
          onChange={(e) => setConfig({ ...config, host: e.target.value })}
          placeholder="localhost"
        />
      </div>

      <div className="form-group">
        <label>Port</label>
        <Input
          type="number"
          value={config.port}
          onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
          placeholder="5432"
        />
      </div>

      <div className="form-group">
        <label>Database</label>
        <Input
          value={config.database}
          onChange={(e) => setConfig({ ...config, database: e.target.value })}
          placeholder="caffine"
        />
      </div>

      <div className="form-group">
        <label>Username</label>
        <Input
          value={config.username}
          onChange={(e) => setConfig({ ...config, username: e.target.value })}
          placeholder="caffine"
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <Input
          type="password"
          value={config.password}
          onChange={(e) => setConfig({ ...config, password: e.target.value })}
          placeholder="••••••••"
        />
      </div>

      <div className="form-actions">
        <Button onClick={handleTestConnection} disabled={status === 'testing'}>
          {status === 'testing' ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button onClick={handleSave} variant="primary">
          Save Configuration
        </Button>
      </div>

      <details>
        <summary>Advanced</summary>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={config.ssl}
              onChange={(e) => setConfig({ ...config, ssl: e.target.checked })}
            />
            Use SSL/TLS
          </label>
        </div>
      </details>

      <div className="presets">
        <h3>Presets</h3>
        <Button onClick={() => setConfig({ ...config, host: 'localhost', port: 5432 })}>
          Local PostgreSQL
        </Button>
        <Button onClick={() => setConfig({ ...config, host: '192.168.1.50', port: 5432 })}>
          Network Server
        </Button>
      </div>
    </div>
  );
}
```

### Step 4: First Launch Setup Wizard

**File:** `packages/frontend/core/src/components/setup/DatabaseSetup.tsx`

```typescript
export function DatabaseSetupWizard() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<DatabaseConfig>(defaultConfig);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const steps = [
    { title: 'Welcome', component: <WelcomeStep /> },
    { title: 'Database', component: <DatabaseConfigStep config={config} setConfig={setConfig} /> },
    { title: 'Test', component: <TestConnectionStep config={config} status={connectionStatus} /> },
    { title: 'Complete', component: <CompleteStep /> },
  ];

  return (
    <div className="setup-wizard">
      <h1>CAFFiNE Setup</h1>
      <StepIndicator steps={steps} currentStep={step} />
      {steps[step].component}
      <div className="wizard-actions">
        {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
        {step < steps.length - 1 && <Button onClick={() => setStep(step + 1)}>Next</Button>}
        {step === steps.length - 1 && <Button onClick={handleFinish}>Start CAFFiNE</Button>}
      </div>
    </div>
  );
}
```

### Step 5: Runtime Reconnection Handler

**File:** `packages/backend/server/src/core/database/connection-monitor.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseConfigService } from './config.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ConnectionMonitorService implements OnModuleInit {
  private checkInterval: NodeJS.Timeout;
  private reconnectInterval: NodeJS.Timeout;
  private isConnected = false;

  constructor(
    private prisma: PrismaService,
    private dbConfig: DatabaseConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    // Start monitoring connection
    this.startMonitoring();
  }

  private startMonitoring() {
    // Check connection every 5 seconds
    this.checkInterval = setInterval(async () => {
      const wasConnected = this.isConnected;
      this.isConnected = await this.checkConnection();

      if (wasConnected && !this.isConnected) {
        // Connection lost
        this.eventEmitter.emit('database.disconnected');
        this.startReconnecting();
      } else if (!wasConnected && this.isConnected) {
        // Connection restored
        this.eventEmitter.emit('database.connected');
        this.stopReconnecting();
      }
    }, 5000);
  }

  private async checkConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private startReconnecting() {
    const config = this.dbConfig.getConfig();
    
    if (!config.autoReconnect) return;

    this.reconnectInterval = setInterval(async () => {
      console.log('Attempting to reconnect to database...');
      
      if (await this.checkConnection()) {
        console.log('✓ Database connection restored');
        this.stopReconnecting();
      }
    }, config.reconnectIntervalMs);
  }

  private stopReconnecting() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }
}
```

### Step 6: Frontend Connection Status Monitor

**File:** `packages/frontend/core/src/hooks/useDatabaseStatus.ts`

```typescript
import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

export function useDatabaseStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // Listen for database events
    const unsubscribe = subscribe('database.disconnected', () => {
      setIsConnected(false);
      setShowReconnectDialog(true);
    });

    const unsubscribeConnected = subscribe('database.connected', () => {
      setIsConnected(true);
      setShowReconnectDialog(false);
    });

    return () => {
      unsubscribe();
      unsubscribeConnected();
    };
  }, []);

  return { isConnected, showReconnectDialog };
}
```

**File:** `packages/frontend/core/src/components/DatabaseReconnectDialog.tsx`

```typescript
export function DatabaseReconnectDialog({ open, onClose }: Props) {
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!open) return;

    // Auto-retry every 5 seconds
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          handleRetry();
          return 5;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, retryCount]);

  const handleRetry = async () => {
    setRetryCount((c) => c + 1);
    
    try {
      const response = await fetch('/api/database/status');
      const data = await response.json();
      
      if (data.connected) {
        onClose();
      }
    } catch (err) {
      // Still offline
    }
  };

  const handleUpdateSettings = () => {
    // Navigate to database settings
    window.location.href = '/settings/database';
  };

  return (
    <Dialog open={open}>
      <DialogTitle>⚠ Database Offline</DialogTitle>
      <DialogContent>
        <p>Lost connection to database</p>
        <p>Retrying in {countdown}s...</p>
        <p>Attempt #{retryCount}</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleRetry}>Retry Now</Button>
        <Button onClick={handleUpdateSettings}>Update Settings</Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## File Structure

```
packages/backend/server/src/
  └── core/
      └── database/
          ├── config.service.ts           # Database config management
          ├── config.controller.ts        # API endpoints
          ├── connection-monitor.service.ts # Connection monitoring
          └── database.module.ts          # Module definition

packages/frontend/core/src/
  └── components/
      ├── settings/
      │   └── DatabaseSettings.tsx      # Settings page
      ├── setup/
      │   └── DatabaseSetupWizard.tsx  # First-launch wizard
      └── DatabaseReconnectDialog.tsx  # Reconnect popup

~/.affine/config/
  └── database.json                     # User's database config
```

---

## Implementation Checklist

- [ ] Backend: Create `DatabaseConfigService`
- [ ] Backend: Create `DatabaseConfigController`
- [ ] Backend: Create `ConnectionMonitorService`
- [ ] Backend: Add API routes
- [ ] Frontend: Create `DatabaseSettings` component
- [ ] Frontend: Create setup wizard
- [ ] Frontend: Create reconnect dialog
- [ ] Frontend: Add to settings menu
- [ ] Testing: Connection test functionality
- [ ] Testing: Reconnection flow
- [ ] Documentation: User guide

---

## Benefits

✅ **No .env file editing** - configure through UI  
✅ **User-friendly** - clear error messages and guidance  
✅ **Resilient** - automatic reconnection  
✅ **Portable** - config stored in user directory  
✅ **Secure** - password encryption  
✅ **Support-friendly** - users can self-diagnose  

---

Would you like me to:
1. Implement this feature in the codebase?
2. Create a prototype/demo?
3. Add this to the DMG build TODO list?

This would be a significant UX improvement for CAFFiNE!

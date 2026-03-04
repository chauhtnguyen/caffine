import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';

import { app } from 'electron';

import type { NamespaceHandlers } from '../type';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'caffine',
  username: 'caffine',
  password: '',
};

function getConfigDir(): string {
  return path.join(app.getPath('userData'), 'config');
}

function getConfigPath(): string {
  return path.join(getConfigDir(), 'database.json');
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// caffine: IPC handlers for database configuration UI
export const databaseConfigHandlers = {
  getConfig: async () => {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      } catch {
        return { ...DEFAULT_CONFIG };
      }
    }
    return { ...DEFAULT_CONFIG };
  },

  saveConfig: async (
    _: Electron.IpcMainInvokeEvent,
    config: DatabaseConfig
  ) => {
    ensureConfigDir();
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  },

  testConnection: async (
    _: Electron.IpcMainInvokeEvent,
    config: DatabaseConfig
  ) => {
    const { host, port } = config;
    return new Promise<{ success: boolean; error?: string }>(resolve => {
      const socket = net.createConnection({ host, port }, () => {
        socket.destroy();
        resolve({ success: true });
      });
      socket.setTimeout(5000);
      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          error: `Connection timed out (${host}:${port})`,
        });
      });
      socket.on('error', (err: Error) => {
        socket.destroy();
        resolve({ success: false, error: err.message });
      });
    });
  },
} satisfies NamespaceHandlers;

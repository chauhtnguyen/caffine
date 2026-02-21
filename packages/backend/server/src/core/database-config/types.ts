/**
 * Database configuration types
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize?: number;
  idleTimeoutSeconds?: number;
  lastConnected?: string;
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
}

export interface DatabaseConnectionTest {
  success: boolean;
  error?: string;
  details?: {
    version?: string;
    timestamp?: string;
    tableCount?: number;
  };
}

export interface DatabaseStatus {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  lastConnected?: string;
  error?: string;
  details?: any;
}

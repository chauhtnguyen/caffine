import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { PrismaClient } from '@prisma/client';
import type {
  DatabaseConfig,
  DatabaseConnectionTest,
  DatabaseStatus,
} from './types';

@Injectable()
export class DatabaseConfigService {
  private readonly logger = new Logger(DatabaseConfigService.name);
  private configPath: string;
  private config: DatabaseConfig;

  constructor() {
    // Store config in user's home directory
    this.configPath = join(
      process.env.AFFINE_CONFIG_PATH ||
        join(homedir(), '.affine', 'config'),
      'database.json'
    );
    this.loadConfig();
  }

  private loadConfig(): void {
    if (existsSync(this.configPath)) {
      try {
        const data = readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(data);
        this.logger.log('Loaded database config from file');
      } catch (error) {
        this.logger.error('Failed to load database config', error);
        this.config = this.getDefaultConfig();
      }
    } else {
      // Initialize from DATABASE_URL env var or defaults
      this.config = this.getDefaultConfig();
      this.logger.log('Using default database config');
    }
  }

  private getDefaultConfig(): DatabaseConfig {
    // Parse DATABASE_URL if it exists
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      try {
        const url = new URL(databaseUrl);
        return {
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          database: url.pathname.slice(1), // Remove leading /
          username: url.username,
          password: url.password,
          ssl: url.searchParams.has('ssl'),
          poolSize: 20,
          idleTimeoutSeconds: 10,
          autoReconnect: true,
          reconnectIntervalMs: 5000,
        };
      } catch (error) {
        this.logger.error('Failed to parse DATABASE_URL', error);
      }
    }

    // Fallback defaults
    return {
      host: 'localhost',
      port: 5432,
      database: 'caffine',
      username: 'caffine',
      password: '',
      ssl: false,
      poolSize: 20,
      idleTimeoutSeconds: 10,
      autoReconnect: true,
      reconnectIntervalMs: 5000,
    };
  }

  getConfig(): DatabaseConfig {
    // Return copy without password in plain text
    return {
      ...this.config,
      password: '********', // Mask password
    };
  }

  getFullConfig(): DatabaseConfig {
    // For internal use only - includes password
    return { ...this.config };
  }

  async updateConfig(newConfig: Partial<DatabaseConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    // Save to file
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      this.logger.log('Saved database config to file');

      // Update environment variable for Prisma
      const connectionUrl = this.getConnectionUrl();
      process.env.DATABASE_URL = connectionUrl;
      this.logger.log('Updated DATABASE_URL environment variable');
    } catch (error) {
      this.logger.error('Failed to save database config', error);
      throw error;
    }
  }

  getConnectionUrl(): string {
    const { host, port, database, username, password, ssl } = this.config;
    const sslParam = ssl ? '?ssl=true' : '';
    return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
  }

  async testConnection(
    testConfig?: Partial<DatabaseConfig>
  ): Promise<DatabaseConnectionTest> {
    const configToTest = testConfig
      ? { ...this.config, ...testConfig }
      : this.config;

    try {
      // Build connection URL
      const { host, port, database, username, password, ssl } = configToTest;
      const sslParam = ssl ? '?ssl=true' : '';
      const connectionUrl = `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;

      // Create temporary Prisma client
      const testClient = new PrismaClient({
        datasources: {
          db: {
            url: connectionUrl,
          },
        },
      });

      // Test basic query
      const versionResult = await testClient.$queryRaw<
        Array<{ version: string }>
      >`SELECT version() as version`;

      // Count tables
      const tableCountResult = await testClient.$queryRaw<
        Array<{ count: bigint }>
      >`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `;

      await testClient.$disconnect();

      // Update last connected timestamp if testing current config
      if (!testConfig) {
        this.config.lastConnected = new Date().toISOString();
        await this.updateConfig({});
      }

      return {
        success: true,
        details: {
          version: versionResult[0]?.version || 'Unknown',
          timestamp: new Date().toISOString(),
          tableCount: Number(tableCountResult[0]?.count || 0),
        },
      };
    } catch (error) {
      this.logger.error('Database connection test failed', error);

      // Parse error message for user-friendly output
      let errorMessage = error.message || 'Unknown error';

      if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused - PostgreSQL may not be running';
      } else if (errorMessage.includes('password authentication failed')) {
        errorMessage = 'Authentication failed - check username and password';
      } else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
        errorMessage = `Database "${configToTest.database}" does not exist`;
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage = 'Connection timed out - check host and port';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getStatus(): Promise<DatabaseStatus> {
    const testResult = await this.testConnection();

    return {
      connected: testResult.success,
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      lastConnected: this.config.lastConnected,
      error: testResult.error,
      details: testResult.details,
    };
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.updateConfig({});
    this.logger.log('Reset database config to defaults');
  }

  /**
   * Export config as connection URL (for user to copy)
   */
  exportConnectionUrl(includeSsl = false): string {
    const { host, port, database, username, password, ssl } = this.config;
    const sslParam = includeSsl && ssl ? '?ssl=true' : '';
    // Mask password for export
    return `postgresql://${username}:****@${host}:${port}/${database}${sslParam}`;
  }
}

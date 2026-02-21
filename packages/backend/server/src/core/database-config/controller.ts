import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DatabaseConfigService } from './service';
import type { DatabaseConfig } from './types';

/**
 * Database configuration API endpoints
 * Allows users to configure database connection through UI
 */
@Controller('api/database')
export class DatabaseConfigController {
  private readonly logger = new Logger(DatabaseConfigController.name);

  constructor(private dbConfigService: DatabaseConfigService) {}

  /**
   * Get current database configuration
   * Password is masked for security
   */
  @Get('config')
  getConfig() {
    try {
      const config = this.dbConfigService.getConfig();
      return {
        success: true,
        config,
      };
    } catch (error) {
      this.logger.error('Failed to get config', error);
      throw new HttpException(
        'Failed to get database configuration',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update database configuration
   * Saves to ~/.affine/config/database.json
   */
  @Put('config')
  async updateConfig(@Body() newConfig: Partial<DatabaseConfig>) {
    try {
      // Validate required fields if updating connection params
      if (newConfig.host || newConfig.port || newConfig.database) {
        if (!newConfig.host && !this.dbConfigService.getFullConfig().host) {
          throw new HttpException(
            'Host is required',
            HttpStatus.BAD_REQUEST
          );
        }
        if (!newConfig.database && !this.dbConfigService.getFullConfig().database) {
          throw new HttpException(
            'Database name is required',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      await this.dbConfigService.updateConfig(newConfig);

      return {
        success: true,
        message: 'Database configuration updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update config', error);
      throw new HttpException(
        error.message || 'Failed to update database configuration',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Test database connection
   * Can test with current config or provided test config
   */
  @Post('test-connection')
  async testConnection(@Body() testConfig?: Partial<DatabaseConfig>) {
    try {
      const result = await this.dbConfigService.testConnection(testConfig);
      return result;
    } catch (error) {
      this.logger.error('Connection test failed', error);
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Get database connection status
   * Includes connection state, version, table count
   */
  @Get('status')
  async getStatus() {
    try {
      const status = await this.dbConfigService.getStatus();
      return status;
    } catch (error) {
      this.logger.error('Failed to get status', error);
      throw new HttpException(
        'Failed to get database status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Reset database configuration to defaults
   */
  @Post('reset')
  async resetToDefaults() {
    try {
      await this.dbConfigService.resetToDefaults();
      return {
        success: true,
        message: 'Database configuration reset to defaults',
      };
    } catch (error) {
      this.logger.error('Failed to reset config', error);
      throw new HttpException(
        'Failed to reset database configuration',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Export connection URL (password masked)
   */
  @Get('export-url')
  exportConnectionUrl() {
    try {
      const url = this.dbConfigService.exportConnectionUrl();
      return {
        success: true,
        url,
      };
    } catch (error) {
      this.logger.error('Failed to export URL', error);
      throw new HttpException(
        'Failed to export connection URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get connection presets for common configurations
   */
  @Get('presets')
  getPresets() {
    return {
      success: true,
      presets: [
        {
          name: 'Local PostgreSQL (Default)',
          description: 'PostgreSQL running on localhost',
          config: {
            host: 'localhost',
            port: 5432,
            database: 'caffine',
            username: 'caffine',
            ssl: false,
          },
        },
        {
          name: 'Network Server',
          description: 'PostgreSQL on another machine',
          config: {
            host: '192.168.1.50',
            port: 5432,
            database: 'caffine',
            username: 'caffine',
            ssl: false,
          },
        },
        {
          name: 'Cloud/Remote (SSL)',
          description: 'Remote PostgreSQL with SSL',
          config: {
            host: 'db.example.com',
            port: 5432,
            database: 'caffine',
            username: 'caffine',
            ssl: true,
          },
        },
      ],
    };
  }
}

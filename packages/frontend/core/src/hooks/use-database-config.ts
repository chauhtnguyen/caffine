import { useCallback, useEffect, useState } from 'react';

interface DatabaseConfig {
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

interface DatabaseConnectionTest {
  success: boolean;
  error?: string;
  details?: {
    version?: string;
    timestamp?: string;
    tableCount?: number;
  };
}

export function useDatabaseConfig() {
  const [config, setConfig] = useState<DatabaseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load configuration
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/database/config');
      const data = await response.json();

      if (data.success) {
        setConfig(data.config);
      } else {
        setError('Failed to load database configuration');
      }
    } catch (err) {
      setError(err.message || 'Failed to load database configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback(async (newConfig: Partial<DatabaseConfig>) => {
    try {
      const response = await fetch('/api/database/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      const data = await response.json();

      if (data.success) {
        // Reload config to get updated values
        await loadConfig();
        return true;
      } else {
        throw new Error(data.message || 'Failed to update configuration');
      }
    } catch (err) {
      throw err;
    }
  }, [loadConfig]);

  // Test connection
  const testConnection = useCallback(async (testConfig?: Partial<DatabaseConfig>): Promise<DatabaseConnectionTest> => {
    try {
      const response = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig || {}),
      });

      const result = await response.json();
      return result;
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Connection test failed',
      };
    }
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      const response = await fetch('/api/database/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        await loadConfig();
        return true;
      } else {
        throw new Error('Failed to reset configuration');
      }
    } catch (err) {
      throw err;
    }
  }, [loadConfig]);

  // Load presets
  const [presets, setPresets] = useState<any[]>([]);
  const loadPresets = useCallback(async () => {
    try {
      const response = await fetch('/api/database/presets');
      const data = await response.json();

      if (data.success) {
        setPresets(data.presets);
      }
    } catch (err) {
      console.error('Failed to load presets', err);
    }
  }, []);

  // Load config on mount
  useEffect(() => {
    loadConfig();
    loadPresets();
  }, [loadConfig, loadPresets]);

  return {
    config,
    loading,
    error,
    updateConfig,
    testConnection,
    resetToDefaults,
    reloadConfig: loadConfig,
    presets,
  };
}

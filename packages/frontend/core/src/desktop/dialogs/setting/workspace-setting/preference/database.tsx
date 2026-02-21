import { SettingRow } from '@affine/component/setting-components';
import { Button } from '@affine/component/ui/button';
import { Input } from '@affine/component/ui/input';
import { notify } from '@affine/component';
import { useI18n } from '@affine/i18n';
import { useCallback, useEffect, useState } from 'react';
import { useLiveData } from '@toeverything/infra';
import { useDatabaseConfig } from '@affine/core/hooks/use-database-config';
import { useDatabaseStatus } from '@affine/core/hooks/use-database-status';
import * as styles from './database.css';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export const DatabasePanel = () => {
  const t = useI18n();
  const { config, loading, updateConfig, testConnection } = useDatabaseConfig();
  const { status, isConnected } = useDatabaseStatus();

  const [formData, setFormData] = useState<DatabaseConfig>({
    host: 'localhost',
    port: 5432,
    database: 'caffine',
    username: 'caffine',
    password: '',
    ssl: false,
  });

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    details?: any;
  } | null>(null);

  // Load config when available
  useEffect(() => {
    if (config) {
      setFormData({
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        password: '', // Don't show password
        ssl: config.ssl,
      });
    }
  }, [config]);

  const handleInputChange = useCallback((field: keyof DatabaseConfig, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null); // Clear test result when config changes
  }, []);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await testConnection(formData);
      setTestResult(result);

      if (result.success) {
        notify.success({
          title: 'Connection Successful',
          message: `Connected to PostgreSQL ${result.details?.version || ''}`,
        });
      } else {
        notify.error({
          title: 'Connection Failed',
          message: result.error || 'Could not connect to database',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message || 'Connection test failed',
      });
      notify.error({
        title: 'Connection Test Failed',
        message: error.message || 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  }, [formData, testConnection]);

  const handleSave = useCallback(async () => {
    // Test connection first
    if (!testResult?.success) {
      notify.warning({
        title: 'Test Connection First',
        message: 'Please test the connection before saving',
      });
      return;
    }

    setSaving(true);

    try {
      await updateConfig(formData);
      notify.success({
        title: 'Configuration Saved',
        message: 'Database configuration has been updated',
      });
    } catch (error) {
      notify.error({
        title: 'Save Failed',
        message: error.message || 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  }, [formData, testResult, updateConfig]);

  const handleApplyPreset = useCallback((preset: 'local' | 'network') => {
    if (preset === 'local') {
      setFormData({
        host: 'localhost',
        port: 5432,
        database: 'caffine',
        username: 'caffine',
        password: '',
        ssl: false,
      });
    } else if (preset === 'network') {
      setFormData(prev => ({
        ...prev,
        host: '192.168.1.50',
        port: 5432,
        ssl: false,
      }));
    }
    setTestResult(null);
  }, []);

  return (
    <SettingRow
      name="Local Datastore"
      desc="Configure connection to your PostgreSQL database"
      spreadCol={false}
      style={{
        padding: '16px',
        background: 'var(--affine-background-secondary-color)',
        marginTop: '24px',
        borderRadius: '8px',
      }}
    >
      <div className={styles.databasePanel}>
        {/* Connection Status */}
        <div className={styles.statusBar}>
          <div className={styles.statusIndicator}>
            <span className={isConnected ? styles.statusDot : styles.statusDotOffline} />
            <span className={styles.statusText}>
              {isConnected ? (
                <>Connected to {status?.host}:{status?.port}/{status?.database}</>
              ) : (
                'Database Offline'
              )}
            </span>
          </div>
        </div>

        {/* Form Fields */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Host</label>
          <Input
            value={formData.host}
            onChange={e => handleInputChange('host', e.target.value)}
            placeholder="localhost"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Port</label>
          <Input
            type="number"
            value={formData.port}
            onChange={e => handleInputChange('port', parseInt(e.target.value) || 5432)}
            placeholder="5432"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Database</label>
          <Input
            value={formData.database}
            onChange={e => handleInputChange('database', e.target.value)}
            placeholder="caffine"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Username</label>
          <Input
            value={formData.username}
            onChange={e => handleInputChange('username', e.target.value)}
            placeholder="caffine"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <Input
            type="password"
            value={formData.password}
            onChange={e => handleInputChange('password', e.target.value)}
            placeholder="••••••••"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.ssl}
              onChange={e => handleInputChange('ssl', e.target.checked)}
            />
            <span>Use SSL/TLS</span>
          </label>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={testResult.success ? styles.successMessage : styles.errorMessage}>
            {testResult.success ? (
              <>
                ✓ Connection successful
                {testResult.details && (
                  <div className={styles.details}>
                    <div>Version: {testResult.details.version}</div>
                    <div>Tables: {testResult.details.tableCount}</div>
                  </div>
                )}
              </>
            ) : (
              <>
                ✗ {testResult.error}
                <div className={styles.troubleshooting}>
                  <div>Troubleshooting:</div>
                  <ul>
                    <li>Check PostgreSQL is running</li>
                    <li>Verify host and port are correct</li>
                    <li>Check username and password</li>
                    <li>Ensure database exists</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Button
            onClick={handleTestConnection}
            disabled={testing}
            variant="secondary"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !testResult?.success}
            variant="primary"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Presets */}
        <div className={styles.presets}>
          <span className={styles.presetsLabel}>Quick Presets:</span>
          <Button
            onClick={() => handleApplyPreset('local')}
            variant="plain"
            size="small"
          >
            Local PostgreSQL
          </Button>
          <Button
            onClick={() => handleApplyPreset('network')}
            variant="plain"
            size="small"
          >
            Network Server
          </Button>
        </div>
      </div>
    </SettingRow>
  );
};

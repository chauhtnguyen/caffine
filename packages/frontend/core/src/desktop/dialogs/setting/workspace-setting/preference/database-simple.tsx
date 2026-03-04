import { notify } from '@affine/component';
import { SettingRow } from '@affine/component/setting-components';
import { Button } from '@affine/component/ui/button';
import { Input } from '@affine/component/ui/input';
import { apis } from '@affine/electron-api';
import { useCallback, useEffect, useState } from 'react';

// caffine: Database config panel using Electron IPC
export const DatabasePanel = () => {
  const [config, setConfig] = useState({
    host: 'localhost',
    port: 5432,
    database: 'caffine',
    username: 'caffine',
    password: '',
  });

  useEffect(() => {
    apis?.databaseConfig
      .getConfig()
      .then(saved => {
        if (saved) {
          setConfig(saved);
        }
      })
      .catch(() => {
        // use defaults
      });
  }, []);

  const handleInputChange = useCallback(
    (field: string, value: string | number) => {
      setConfig(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleTestConnection = useCallback(async () => {
    if (!apis) {
      notify.error({
        title: 'Not Available',
        message: 'Database config is only available in the desktop app',
      });
      return;
    }
    try {
      const result = await apis.databaseConfig.testConnection(config);

      if (result?.success) {
        notify.success({
          title: 'Connection Successful',
          message: `Connected to PostgreSQL`,
        });
      } else {
        notify.error({
          title: 'Connection Failed',
          message: result?.error || 'Could not connect',
        });
      }
    } catch (error: any) {
      notify.error({
        title: 'Connection Test Failed',
        message: error.message || 'Unknown error',
      });
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    if (!apis) {
      notify.error({
        title: 'Not Available',
        message: 'Database config is only available in the desktop app',
      });
      return;
    }
    try {
      const result = await apis.databaseConfig.saveConfig(config);

      if (result?.success) {
        notify.success({
          title: 'Configuration Saved',
          message: 'Database configuration updated',
        });
      }
    } catch (error: any) {
      notify.error({
        title: 'Save Failed',
        message: error.message || 'Failed to save',
      });
    }
  }, [config]);

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
      <div
        id="database-config-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
          marginTop: '12px',
        }}
      >
        {/* Host */}
        <div
          id="database-config-host"
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <label
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            Host
          </label>
          <Input
            value={config.host}
            onChange={e => handleInputChange('host', e.target.value)}
            placeholder="localhost"
            style={{ width: '100%', height: '36px' }}
          />
        </div>

        {/* Port */}
        <div
          id="database-config-port"
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <label
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            Port
          </label>
          <Input
            type="number"
            value={config.port}
            onChange={e =>
              handleInputChange('port', parseInt(e.target.value) || 5432)
            }
            placeholder="5432"
            style={{ width: '100%', height: '36px' }}
          />
        </div>

        {/* Database */}
        <div
          id="database-config-database"
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <label
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            Database
          </label>
          <Input
            value={config.database}
            onChange={e => handleInputChange('database', e.target.value)}
            placeholder="caffine"
            style={{ width: '100%', height: '36px' }}
          />
        </div>

        {/* Username */}
        <div
          id="database-config-username"
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <label
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            Username
          </label>
          <Input
            value={config.username}
            onChange={e => handleInputChange('username', e.target.value)}
            placeholder="caffine"
            style={{ width: '100%', height: '36px' }}
          />
        </div>

        {/* Password */}
        <div
          id="database-config-password"
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <label
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--affine-text-secondary-color)',
            }}
          >
            Password
          </label>
          <Input
            type="password"
            value={config.password}
            onChange={e => handleInputChange('password', e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', height: '36px' }}
          />
        </div>

        {/* Action Buttons */}
        <div
          id="database-config-actions"
          style={{ display: 'flex', gap: '12px', marginTop: '8px' }}
        >
          <Button
            onClick={() => void handleTestConnection()}
            variant="secondary"
          >
            Test Connection
          </Button>
          <Button onClick={() => void handleSave()} variant="primary">
            Save Configuration
          </Button>
        </div>
      </div>
    </SettingRow>
  );
};

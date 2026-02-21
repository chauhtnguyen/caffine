import { SettingRow } from '@affine/component/setting-components';
import { Button } from '@affine/component/ui/button';
import { Input } from '@affine/component/ui/input';
import { notify } from '@affine/component';
import { useI18n } from '@affine/i18n';
import { useCallback, useState } from 'react';

export const DatabasePanel = () => {
  const t = useI18n();
  
  const [config, setConfig] = useState({
    host: 'localhost',
    port: 5432,
    database: 'caffine',
    username: 'caffine',
    password: '',
  });

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTestConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const result = await response.json();
      
      if (result.success) {
        notify.success({
          title: 'Connection Successful',
          message: `Connected to PostgreSQL`,
        });
      } else {
        notify.error({
          title: 'Connection Failed',
          message: result.error || 'Could not connect',
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
    try {
      const response = await fetch('/api/database/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const result = await response.json();
      
      if (result.success) {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginTop: '12px' }}>
        {/* Host */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>
            Port
          </label>
          <Input
            type="number"
            value={config.port}
            onChange={e => handleInputChange('port', parseInt(e.target.value) || 5432)}
            placeholder="5432"
            style={{ width: '100%', height: '36px' }}
          />
        </div>

        {/* Database */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--affine-text-secondary-color)' }}>
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
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <Button onClick={handleTestConnection} variant="secondary">
            Test Connection
          </Button>
          <Button onClick={handleSave} variant="primary">
            Save Configuration
          </Button>
        </div>
      </div>
    </SettingRow>
  );
};

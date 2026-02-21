import { Button } from '@affine/component/ui/button';
import { Modal } from '@affine/component/ui/modal';
import { useI18n } from '@affine/i18n';
import { useCallback, useEffect, useState } from 'react';
import { useDatabaseStatus } from '@affine/core/hooks/use-database-status';
import * as styles from './reconnect-dialog.css';

interface ReconnectDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const DatabaseReconnectDialog = ({
  open,
  onClose,
  onOpenSettings,
}: ReconnectDialogProps) => {
  const t = useI18n();
  const { status, checkStatus, isConnected } = useDatabaseStatus();
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(5);

  // Auto-close when connection is restored
  useEffect(() => {
    if (isConnected && open) {
      onClose();
    }
  }, [isConnected, open, onClose]);

  // Auto-retry countdown
  useEffect(() => {
    if (!open) return;

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

  const handleRetry = useCallback(async () => {
    setRetryCount((c) => c + 1);
    await checkStatus();
  }, [checkStatus]);

  const handleOpenSettings = useCallback(() => {
    onOpenSettings();
    onClose();
  }, [onOpenSettings, onClose]);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onClose}
      contentOptions={{
        className: styles.dialogContent,
      }}
    >
      <div className={styles.dialogHeader}>
        <div className={styles.warningIcon}>⚠</div>
        <h2 className={styles.dialogTitle}>Database Connection Lost</h2>
      </div>

      <div className={styles.dialogBody}>
        <p className={styles.message}>
          Lost connection to database server
        </p>

        {status && (
          <div className={styles.connectionInfo}>
            <div>Last known connection:</div>
            <div className={styles.connectionDetails}>
              {status.host}:{status.port}/{status.database}
            </div>
          </div>
        )}

        {status?.error && (
          <div className={styles.errorBox}>
            <strong>Error:</strong> {status.error}
          </div>
        )}

        <div className={styles.retryInfo}>
          <div className={styles.countdown}>
            Automatically retrying in {countdown}s...
          </div>
          <div className={styles.attemptCount}>
            Attempt #{retryCount}
          </div>
        </div>

        <div className={styles.options}>
          <div className={styles.optionTitle}>What you can do:</div>
          <ul className={styles.optionsList}>
            <li>Wait for automatic reconnection</li>
            <li>Check if PostgreSQL is running</li>
            <li>Verify database settings</li>
            <li>Check network connection</li>
          </ul>
        </div>
      </div>

      <div className={styles.dialogActions}>
        <Button onClick={handleRetry} variant="secondary">
          Retry Now
        </Button>
        <Button onClick={handleOpenSettings} variant="primary">
          Check Settings
        </Button>
      </div>
    </Modal>
  );
};

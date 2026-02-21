import { useCallback, useEffect, useState } from 'react';

interface DatabaseStatus {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  lastConnected?: string;
  error?: string;
  details?: any;
}

export function useDatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [loading, setLoading] = useState(true);

  // Check database status
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/database/status');
      const data = await response.json();

      setStatus(data);
      setIsConnected(data.connected);
      setLoading(false);
    } catch (err) {
      console.error('Failed to check database status', err);
      setIsConnected(false);
      setLoading(false);
    }
  }, []);

  // Poll status every 10 seconds
  useEffect(() => {
    // Initial check
    checkStatus();

    // Poll every 10 seconds
    const interval = setInterval(checkStatus, 10000);

    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    status,
    isConnected,
    loading,
    checkStatus,
  };
}

import { useState, useEffect } from 'react';
import { checkDatabaseConnection } from '../services/dbService';

/**
 * Custom hook to check PostgreSQL database connection status
 * @param {number} checkInterval - Check interval in milliseconds, default 60 seconds
 * @returns {Object} Status object
 */
export const usePostgresStatus = (checkInterval = 60000) => {
  const [status, setStatus] = useState({
    isConnected: null,
    lastChecked: null,
    message: 'Checking PostgreSQL connection...',
    isChecking: true
  });

  useEffect(() => {
    let isMounted = true;
    
    const checkConnection = async () => {
      if (!isMounted) return;
      
      setStatus(prev => ({ ...prev, isChecking: true }));
      
      try {
        const connected = await checkDatabaseConnection();
        
        if (isMounted) {
          setStatus({
            isConnected: connected,
            lastChecked: new Date(),
            message: connected 
              ? 'Connected to PostgreSQL database' 
              : 'Could not connect to PostgreSQL database',
            isChecking: false
          });
        }
      } catch (error) {
        if (isMounted) {
          setStatus({
            isConnected: false,
            lastChecked: new Date(),
            message: `PostgreSQL connection error: ${error.message}`,
            isChecking: false
          });
        }
      }
    };

    // Execute first check immediately
    checkConnection();
    
    // Set up periodic checks
    const intervalId = setInterval(checkConnection, checkInterval);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [checkInterval]);

  /**
   * Manually refresh connection status
   * @returns {Promise<boolean>} Whether connection is successful
   */
  const refreshStatus = async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const connected = await checkDatabaseConnection();
      
      setStatus({
        isConnected: connected,
        lastChecked: new Date(),
        message: connected 
          ? 'Connected to PostgreSQL database' 
          : 'Could not connect to PostgreSQL database',
        isChecking: false
      });
      
      return connected;
    } catch (error) {
      setStatus({
        isConnected: false,
        lastChecked: new Date(),
        message: `PostgreSQL connection error: ${error.message}`,
        isChecking: false
      });
      
      return false;
    }
  };

  // Return status object and refresh function
  return { 
    ...status, 
    refreshStatus 
  };
};

export default usePostgresStatus; 
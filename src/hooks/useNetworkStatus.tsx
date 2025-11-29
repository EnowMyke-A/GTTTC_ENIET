import { useState, useEffect, useRef } from 'react';
import isOnline from 'is-online';

interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnlineState, setIsOnlineState] = useState(navigator.onLine);
  const previousOnlineState = useRef(navigator.onLine);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const checkNetworkStatus = async () => {
      try {
        const online = await isOnline();
        
        if (isMounted) {
          // Only update state and log if the status has changed
          if (online !== previousOnlineState.current) {
            setIsOnlineState(online);
            
            // Log the network status change
            if (online) {
              console.log('🟢 Application is now ONLINE');
            } else {
              console.log('🔴 Application is now OFFLINE');
            }
            
            previousOnlineState.current = online;
          }
        }
      } catch (error) {
        console.error('Error checking network status:', error);
        if (isMounted) {
          setIsOnlineState(false);
          if (previousOnlineState.current !== false) {
            console.log('🔴 Application is now OFFLINE (error checking connectivity)');
            previousOnlineState.current = false;
          }
        }
      }
    };

    const handleOnline = () => {
      console.log('🟢 Browser detected ONLINE event');
      checkNetworkStatus();
    };

    const handleOffline = () => {
      console.log('🔴 Browser detected OFFLINE event');
      setIsOnlineState(false);
      if (previousOnlineState.current !== false) {
        console.log('🔴 Application is now OFFLINE');
        previousOnlineState.current = false;
      }
    };

    // Initial check
    checkNetworkStatus();

    // Listen to browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 10 seconds using is-online library
    intervalId = setInterval(checkNetworkStatus, 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  return {
    isOnline: isOnlineState,
    isOffline: !isOnlineState,
  };
};

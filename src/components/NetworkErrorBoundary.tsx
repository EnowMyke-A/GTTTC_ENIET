import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import NotFound from '@/pages/NotFound';

interface NetworkErrorBoundaryProps {
  children: React.ReactNode;
}

const NetworkErrorBoundary: React.FC<NetworkErrorBoundaryProps> = ({ children }) => {
  const { isOffline } = useNetworkStatus();
  const [showOfflineScreen, setShowOfflineScreen] = useState(false);

  useEffect(() => {
    if (isOffline) {
      // Show offline screen after a short delay to avoid flashing
      const timer = setTimeout(() => {
        setShowOfflineScreen(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setShowOfflineScreen(false);
    }
  }, [isOffline]);

  if (showOfflineScreen) {
    return <NotFound isNetworkError={true} />;
  }

  return <>{children}</>;
};

export default NetworkErrorBoundary;

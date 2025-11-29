import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface NetworkStatusProviderProps {
  children: React.ReactNode;
}

export const NetworkStatusProvider = ({ children }: NetworkStatusProviderProps) => {
  // Initialize network status monitoring
  useNetworkStatus();
  
  return <>{children}</>;
};

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
  dehydrate,
  hydrate,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MobileNavProvider } from "@/hooks/useMobileNav";
import { NetworkStatusProvider } from "@/components/NetworkStatusProvider";
import ProtectedRoute from "@/components/Layout/ProtectedRoute";
import NetworkErrorBoundary from "@/components/NetworkErrorBoundary";
import { RoleBasedApp } from "@/components/RoleBasedApp";
import { LoadingOverlay } from "@/components/ui/loading";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes before considering it stale
      staleTime: 5 * 60 * 1000,
      // Cache data for 10 minutes before garbage collection
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus to preserve user state
      refetchOnWindowFocus: false,
      // Only refetch on reconnect if data is stale
      refetchOnReconnect: false,
      // Don't refetch when component mounts if data is fresh
      refetchOnMount: false,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Initialize query client with state restoration
const initializeQueryClient = () => {
  const client = queryClient;

  // Restore from localStorage on app start
  try {
    const cached = localStorage.getItem("GTTTC_ENIET_CACHE");
    if (cached) {
      const { timestamp, state } = JSON.parse(cached);
      // Only restore if cache is less than 1 hour old
      if (Date.now() - timestamp < 60 * 60 * 1000) {
        hydrate(client, state);
        console.info("Query cache restored from localStorage");
      } else {
        localStorage.removeItem("GTTTC_ENIET_CACHE");
      }
    }
  } catch (error) {
    console.warn("Failed to restore query cache:", error);
    localStorage.removeItem("GTTTC_ENIET_CACHE");
  }

  // Save to localStorage periodically and on beforeunload
  const saveToLocalStorage = () => {
    try {
      const clientData = {
        timestamp: Date.now(),
        state: dehydrate(client),
      };
      localStorage.setItem("GTTTC_ENIET_CACHE", JSON.stringify(clientData));
    } catch (error) {
      console.warn("Failed to persist query cache:", error);
    }
  };

  // Save on beforeunload
  window.addEventListener("beforeunload", saveToLocalStorage);

  // Save periodically (every 30 seconds)
  const interval = setInterval(saveToLocalStorage, 30000);

  return () => {
    window.removeEventListener("beforeunload", saveToLocalStorage);
    clearInterval(interval);
  };
};

const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    console.log('QueryProvider mounted');
    const cleanup = initializeQueryClient();
    return () => {
      console.log('QueryProvider unmounting');
      cleanup();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const App = () => {
  useEffect(() => {
    console.log('App component mounted');
    
    const handleVisibilityChange = () => {
      console.log('Visibility changed:', document.hidden ? 'hidden' : 'visible');
    };
    
    const handleFocus = () => {
      console.log('Window focused');
    };
    
    const handleBlur = () => {
      console.log('Window blurred');
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      console.log('App component unmounting - THIS SHOULD NOT HAPPEN!');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
  
  return (
    <QueryProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <MobileNavProvider>
              <NetworkStatusProvider>
                <NetworkErrorBoundary>
                  <Suspense fallback={<LoadingOverlay message="Loading application..." size="xl" />}>
                    <Routes>
                      <Route 
                        path="/auth" 
                        element={
                          <Suspense fallback={<LoadingOverlay message="Loading..." size="xl" />}>
                            <Auth />
                          </Suspense>
                        } 
                      />
                      <Route
                        path="/*"
                        element={
                          <ProtectedRoute>
                            <Suspense fallback={<LoadingOverlay message="Loading your workspace..." size="xl" />}>
                              <RoleBasedApp />
                            </Suspense>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </Suspense>
                </NetworkErrorBoundary>
              </NetworkStatusProvider>
            </MobileNavProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryProvider>
  );
};

export default App;

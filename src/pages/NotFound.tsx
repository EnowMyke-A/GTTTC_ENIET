import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Error404Animation from "@/components/animations/Error404Animation";
import NoConnectionAnimation from "@/components/animations/NoConnectionAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, RefreshCw } from "lucide-react";

interface NotFoundProps {
  isNetworkError?: boolean;
}

const NotFound = ({ isNetworkError = false }: NotFoundProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNetworkError) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    } else {
      console.error("Network Error: Unable to connect to server");
    }
  }, [location.pathname, isNetworkError]);

  const handleGoHome = () => {
    navigate("/");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="shadow-none border-0 max-w-md w-full">
        <CardContent className="py-12 pt-6">
          <div className="text-center space-y-6">
           { isNetworkError ? <NoConnectionAnimation
              height={350}
              width={262}
              loop={true}
              autoplay={true}
              className="m-auto"/> :<Error404Animation
              width={400}
              height={400}
              loop={true}
              autoplay={true}
              className="m-auto"
            />}
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-muted-foreground/85">
                {isNetworkError ? "No Internet Connection" : "Page Not Found"}
              </h2>
              <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto">
                {isNetworkError 
                  ? "Please check your internet connection and try again. The page will automatically retry when connection is restored."
                  : "The page you're looking for doesn't exist or has been moved. Let's get you back on track."
                }
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
              {isNetworkError && (
                <Button 
                  onClick={handleRefresh}
                  variant="outline"
                  className="flex items-center gap-2 bg-muted hover:bg-accent/30 collapsible-content"
                  data-state="open"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;

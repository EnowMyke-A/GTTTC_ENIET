import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showLogo?: boolean;
}

const sizeConfig = {
  sm: {
    container: "w-16 h-16",
    logo: "w-8 h-8",
    spinner: "w-16 h-16 border-2",
  },
  md: {
    container: "w-24 h-24",
    logo: "w-12 h-12",
    spinner: "w-24 h-24 border-3",
  },
  lg: {
    container: "w-32 h-32",
    logo: "w-16 h-16",
    spinner: "w-32 h-32 border-4",
  },
  xl: {
    container: "w-40 h-40",
    logo: "w-20 h-20",
    spinner: "w-40 h-40 border-4",
  },
};

export const Loading = ({ 
  size = "md", 
  className,
  showLogo = true 
}: LoadingProps) => {
  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative flex items-center justify-center", config.container)}>
        {/* Rotating spinner ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-solid animate-spin thin-spinner",
            config.spinner,
            "border-primary/10 border-t-primary"
          )}
        />
        
        {/* Logo in the center */}
        {showLogo && (
          <div className="relative z-10 flex items-center justify-center">
            <img
              src="/logo_eniet.webp"
              alt="ENIET Logo"
              className={cn("object-contain", config.logo)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Full screen loading overlay
export const LoadingOverlay = ({ 
  size = "lg",
  className,
  message 
}: LoadingProps & { message?: string }) => {
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm",
      className
    )}>
      <Loading size={size} />
      <h1 className="text-xl font-bold text-foreground mt-6">
        GTTTC ENIET KUMBA
      </h1>
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

// Inline loading for smaller spaces
export const LoadingInline = ({ 
  size = "sm",
  className 
}: LoadingProps) => {
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <Loading size={size} showLogo={false} />
    </div>
  );
};

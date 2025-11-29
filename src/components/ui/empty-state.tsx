import React from 'react';
import { cn } from '@/lib/utils';
import EmptyBoxAnimation from '@/components/animations/EmptyBoxAnimation';

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  animationWidth?: number | string;
  animationHeight?: number | string;
  children?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  className,
  animationWidth = 120,
  animationHeight = 120,
  children,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center space-y-4 py-12", className)}>
      <EmptyBoxAnimation 
        width={animationWidth} 
        height={animationHeight}
        className="opacity-60"
      />
      <div className="space-y-2">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="pt-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default EmptyState;

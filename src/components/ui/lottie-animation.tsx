import React from 'react';
import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';

interface LottieAnimationProps {
  animationData: any;
  className?: string;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  style?: React.CSSProperties;
}

const LottieAnimation: React.FC<LottieAnimationProps> = ({
  animationData,
  className,
  width = 200,
  height = 200,
  loop = true,
  autoplay = true,
  speed = 1,
  style,
}) => {
  const defaultStyle: React.CSSProperties = {
    width,
    height,
    ...style,
  };

  return (
    <div className={cn("flex items-center justify-center", className)} style={defaultStyle}>
      <Lottie
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
        rendererSettings={{
          preserveAspectRatio: 'xMidYMid slice'
        }}
      />
    </div>
  );
};

export default LottieAnimation;

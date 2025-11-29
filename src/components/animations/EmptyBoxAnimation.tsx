import React from 'react';
import LottieAnimation from '@/components/ui/lottie-animation';
import emptyBoxAnimationData from '../empty box3.json';

interface EmptyBoxAnimationProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  loop?: boolean;
  autoplay?: boolean;
}

const EmptyBoxAnimation: React.FC<EmptyBoxAnimationProps> = ({
  className,
  width = 150,
  height = 150,
  loop = true,
  autoplay = true,
}) => {
  return (
    <LottieAnimation
      animationData={emptyBoxAnimationData}
      className={className}
      width={width}
      height={height}
      loop={loop}
      autoplay={autoplay}
    />
  );
};

export default EmptyBoxAnimation;

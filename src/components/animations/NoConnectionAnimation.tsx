import React from "react";
import LottieAnimation from "@/components/ui/lottie-animation";
import noConnectionAnimationData from "./No Connection.json";

interface NoConnectionAnimationProps {
  width?: number;
  height?: number;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

const NoConnectionAnimation: React.FC<NoConnectionAnimationProps> = ({
  width = 300,
  height = 300,
  className = "",
  loop = true,
  autoplay = true,
}) => {
  return (
    <LottieAnimation
      animationData={noConnectionAnimationData}
      className={className}
      width={width}
      height={height}
      loop={loop}
      autoplay={autoplay}
    />
  );
};

export default NoConnectionAnimation;

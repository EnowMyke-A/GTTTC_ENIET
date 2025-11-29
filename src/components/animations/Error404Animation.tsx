import React from "react";
import LottieAnimation from "@/components/ui/lottie-animation";
import error404AnimationData from "./Error 404 Animation.json";

interface Error404AnimationProps {
  width?: number;
  height?: number;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

const Error404Animation: React.FC<Error404AnimationProps> = ({
  width = 300,
  height = 300,
  className = "",
  loop = true,
  autoplay = true,
}) => {
  return (
    <LottieAnimation
      animationData={error404AnimationData}
      className={className}
      width={width}
      height={height}
      loop={loop}
      autoplay={autoplay}
    />
  );
};

export default Error404Animation;

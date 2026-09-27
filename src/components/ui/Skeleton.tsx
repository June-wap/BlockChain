import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rectangular",
  ...props
}) => {
  const variantStyles = {
    text: "h-4 w-full rounded-sm",
    circular: "rounded-full shrink-0",
    rectangular: "rounded-xl",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-dark-200/70",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};

import React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
  onRemove?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  dot = false,
  dotColor,
  icon,
  onRemove,
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-dark-100 text-dark-800 border-dark-200/80",
    primary: "bg-primary-50 text-primary-700 border-primary-200",
    success: "bg-success-50 text-success-700 border-success-200",
    warning: "bg-warning-50 text-warning-700 border-warning-200",
    danger: "bg-danger-50 text-danger-700 border-danger-200",
    outline: "bg-surface text-dark-700 border-border",
  };

  const dotStyles = {
    default: "bg-dark-500",
    primary: "bg-primary-600",
    success: "bg-success-600",
    warning: "bg-warning-500",
    danger: "bg-danger-600",
    outline: "bg-dark-400",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            dotColor || dotStyles[variant]
          )}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 focus-visible:outline-none rounded-full p-0.5"
          aria-label="Remove badge"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

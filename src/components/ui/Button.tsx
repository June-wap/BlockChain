import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "success";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]";

    const variantStyles = {
      primary:
        "bg-primary-600 text-white hover:bg-primary-700 shadow-xs focus-visible:ring-primary-500",
      secondary:
        "bg-dark-100 text-dark-800 hover:bg-dark-200 border border-dark-200/80 focus-visible:ring-dark-400",
      outline:
        "bg-surface text-dark-700 border border-border hover:bg-dark-50 hover:text-dark-900 focus-visible:ring-primary-500 shadow-2xs",
      ghost:
        "text-dark-600 hover:bg-dark-100 hover:text-dark-900 focus-visible:ring-primary-500",
      danger:
        "bg-danger-600 text-white hover:bg-danger-700 shadow-xs focus-visible:ring-danger-500",
      success:
        "bg-success-600 text-white hover:bg-success-700 shadow-xs focus-visible:ring-success-500",
    };

    const sizeStyles = {
      xs: "h-7 px-2.5 text-xs rounded-md gap-1",
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-9.5 px-4 text-sm rounded-lg gap-2",
      lg: "h-11 px-5 text-base rounded-xl gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        )}
        {!isLoading && leftIcon && (
          <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

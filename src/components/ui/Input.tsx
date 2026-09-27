import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      id: customId,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-semibold text-dark-800 select-none"
          >
            {label}
            {required && <span className="text-danger-600 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-dark-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "w-full h-10 px-3.5 text-sm bg-surface text-dark-900 border rounded-lg transition-colors placeholder:text-dark-400",
              "border-border hover:border-dark-300",
              "focus-visible:outline-none focus-visible:border-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500/20",
              "disabled:bg-dark-50 disabled:text-dark-400 disabled:cursor-not-allowed disabled:border-dark-200",
              leftIcon && "pl-10",
              (rightIcon || error) && "pr-10",
              error &&
                "border-danger-600 focus-visible:border-danger-600 focus-visible:ring-danger-500/20 text-danger-900",
              className
            )}
            {...props}
          />

          {error ? (
            <div className="absolute right-3 flex items-center pointer-events-none text-danger-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            rightIcon && (
              <div className="absolute right-3 flex items-center pointer-events-none text-dark-400">
                {rightIcon}
              </div>
            )
          )}
        </div>

        {error && (
          <p
            id={errorId}
            className="text-xs font-medium text-danger-600 flex items-center gap-1 mt-1"
          >
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-dark-500 mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

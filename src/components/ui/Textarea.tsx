import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      showCount = false,
      maxLength,
      value,
      defaultValue,
      id: customId,
      disabled,
      required,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const currentLength =
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
        ? defaultValue.length
        : 0;

    return (
      <div className="w-full space-y-1.5 text-left">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={id}
              className="block text-xs font-semibold text-dark-800 select-none"
            >
              {label}
              {required && <span className="text-danger-600 ml-1">*</span>}
            </label>
          )}

          {showCount && maxLength && (
            <span className="text-[11px] text-dark-400">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            "w-full px-3.5 py-2.5 text-sm bg-surface text-dark-900 border rounded-lg transition-colors placeholder:text-dark-400 resize-y",
            "border-border hover:border-dark-300",
            "focus-visible:outline-none focus-visible:border-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500/20",
            "disabled:bg-dark-50 disabled:text-dark-400 disabled:cursor-not-allowed disabled:border-dark-200",
            error &&
              "border-danger-600 focus-visible:border-danger-600 focus-visible:ring-danger-500/20 text-danger-900",
            className
          )}
          {...props}
        />

        {error && (
          <p id={errorId} className="text-xs font-medium text-danger-600 mt-1">
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

Textarea.displayName = "Textarea";

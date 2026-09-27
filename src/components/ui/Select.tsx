import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, AlertCircle } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      options,
      placeholder,
      id: customId,
      disabled,
      required,
      children,
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
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "w-full h-10 pl-3.5 pr-10 text-sm bg-surface text-dark-900 border rounded-lg appearance-none transition-colors cursor-pointer",
              "border-border hover:border-dark-300",
              "focus-visible:outline-none focus-visible:border-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500/20",
              "disabled:bg-dark-50 disabled:text-dark-400 disabled:cursor-not-allowed disabled:border-dark-200",
              error &&
                "border-danger-600 focus-visible:border-danger-600 focus-visible:ring-danger-500/20 text-danger-900",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 flex items-center pointer-events-none text-dark-400">
            {error ? (
              <AlertCircle className="w-4 h-4 text-danger-600" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

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

Select.displayName = "Select";

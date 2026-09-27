import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      checked,
      indeterminate = false,
      id: customId,
      disabled,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;

    return (
      <div className="flex items-start gap-2.5 text-left">
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors cursor-pointer select-none",
              "border-border bg-surface text-white",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30 peer-focus-visible:border-primary-600 peer-focus-visible:outline-none",
              "peer-checked:bg-primary-600 peer-checked:border-primary-600",
              indeterminate && "bg-primary-600 border-primary-600",
              error && "border-danger-600",
              disabled &&
                "cursor-not-allowed bg-dark-50 border-dark-200 text-dark-300 opacity-60",
              className
            )}
            onClick={() => {
              if (!disabled && onChange) {
                const syntheticEvent = {
                  target: { checked: !checked },
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(syntheticEvent);
              }
            }}
          >
            {indeterminate ? (
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            ) : checked ? (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            ) : null}
          </div>
        </div>

        {(label || description) && (
          <div className="select-none">
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  "text-sm font-medium text-dark-800 cursor-pointer block leading-snug",
                  disabled && "cursor-not-allowed text-dark-400"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-dark-500 mt-0.5">{description}</p>
            )}
            {error && (
              <p className="text-xs font-medium text-danger-600 mt-1">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

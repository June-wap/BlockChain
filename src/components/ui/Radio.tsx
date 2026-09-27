import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      label,
      description,
      checked,
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
            type="radio"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-colors cursor-pointer select-none",
              "border-border bg-surface",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30 peer-focus-visible:border-primary-600 peer-focus-visible:outline-none",
              "peer-checked:border-primary-600",
              disabled &&
                "cursor-not-allowed bg-dark-50 border-dark-200 opacity-60",
              className
            )}
            onClick={() => {
              if (!disabled && onChange) {
                const syntheticEvent = {
                  target: { value: props.value, checked: true },
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(syntheticEvent);
              }
            }}
          >
            {checked && (
              <span className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-in zoom-in-75 duration-100" />
            )}
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
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = "Radio";

export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  label,
  error,
  disabled = false,
  orientation = "vertical",
  className,
}) => {
  return (
    <div className={cn("space-y-2 text-left", className)}>
      {label && (
        <span className="block text-xs font-semibold text-dark-800 select-none">
          {label}
        </span>
      )}

      <div
        className={cn(
          "gap-3",
          orientation === "horizontal"
            ? "flex flex-wrap items-center"
            : "flex flex-col"
        )}
      >
        {options.map((opt) => (
          <Radio
            key={opt.value}
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={disabled || opt.disabled}
            label={opt.label}
            description={opt.description}
            onChange={(e) => onChange && onChange(e.target.value)}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs font-medium text-danger-600 mt-1">{error}</p>
      )}
    </div>
  );
};

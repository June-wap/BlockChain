import React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string | number;
    label?: string;
    direction: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  accentColor?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  trend,
  icon,
  accentColor = "primary",
  className,
}) => {
  const accentStyles = {
    primary: "text-primary-600 bg-primary-50 border-primary-200",
    success: "text-success-600 bg-success-50 border-success-200",
    warning: "text-warning-600 bg-warning-50 border-warning-200",
    danger: "text-danger-600 bg-danger-50 border-danger-200",
    neutral: "text-dark-600 bg-dark-50 border-dark-200",
  };

  return (
    <div
      className={cn(
        "p-5 rounded-2xl border border-border bg-surface shadow-xs transition-shadow hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-dark-900">
            {value}
          </h3>
        </div>

        {icon && (
          <div
            className={cn(
              "p-2.5 rounded-xl border shrink-0",
              accentStyles[accentColor]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(trend || description) && (
        <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          {trend && (
            <div className="flex items-center gap-1 font-semibold">
              {trend.direction === "up" && (
                <span className="text-success-600 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {trend.value}
                </span>
              )}
              {trend.direction === "down" && (
                <span className="text-danger-600 flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {trend.value}
                </span>
              )}
              {trend.direction === "neutral" && (
                <span className="text-dark-500 flex items-center">
                  <Minus className="w-3.5 h-3.5" />
                  {trend.value}
                </span>
              )}
              {trend.label && (
                <span className="font-normal text-dark-400">
                  {trend.label}
                </span>
              )}
            </div>
          )}

          {description && (
            <span className="text-dark-500 truncate">{description}</span>
          )}
        </div>
      )}
    </div>
  );
};

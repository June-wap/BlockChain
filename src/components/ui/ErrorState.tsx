import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  errorCode?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  description = "An error occurred while loading this section. Please try again or contact support if the issue persists.",
  errorCode,
  onRetry,
  retryText = "Try Again",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-danger-200/80 bg-danger-50/30",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-danger-100/80 border border-danger-200 text-danger-600 flex items-center justify-center mb-4 shadow-2xs">
        <AlertCircle className="w-6 h-6 stroke-[2]" />
      </div>

      {errorCode && (
        <span className="font-mono text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-danger-100 text-danger-700 border border-danger-200 mb-2">
          Error {errorCode}
        </span>
      )}

      <h3 className="text-base font-bold text-dark-900 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-dark-500 mt-1 max-w-sm leading-relaxed">
        {description}
      </p>

      {onRetry && (
        <div className="mt-6">
          <Button
            variant="danger"
            size="md"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            {retryText}
          </Button>
        </div>
      )}
    </div>
  );
};

import React from "react";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import { Button } from "./Button";
import Link from "next/link";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-surface",
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-dark-50 border border-dark-200/60 flex items-center justify-center text-dark-400 mb-4 shadow-2xs">
        {icon || <Inbox className="w-6 h-6 stroke-[1.5]" />}
      </div>

      <h3 className="text-base font-bold text-dark-900 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-dark-500 mt-1 max-w-sm leading-relaxed">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {actionText && actionHref && (
            <Link href={actionHref}>
              <Button size="md">{actionText}</Button>
            </Link>
          )}

          {actionText && onAction && !actionHref && (
            <Button size="md" onClick={onAction}>
              {actionText}
            </Button>
          )}

          {secondaryActionText && (
            <Button
              variant="outline"
              size="md"
              onClick={onSecondaryAction}
            >
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Breadcrumb, BreadcrumbItem } from "./Breadcrumb";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  badge,
  actions,
  backHref,
  className,
}) => {
  return (
    <div className={cn("space-y-3 pb-6 border-b border-border/80", className)}>
      {/* Top row: Back link or Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-dark-500 hover:text-dark-900 transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        ) : breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumb items={breadcrumbs} showHome />
        ) : null}
      </div>

      {/* Main Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-dark-900">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-dark-500 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

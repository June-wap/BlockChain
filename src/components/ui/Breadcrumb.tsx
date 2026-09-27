import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHome = false,
  className,
}) => {
  return (
    <nav aria-label="Breadcrumb" className={cn("select-none", className)}>
      <ol className="flex items-center gap-1.5 text-xs text-dark-500">
        {showHome && (
          <li className="flex items-center">
            <Link
              href="/"
              className="text-dark-400 hover:text-dark-700 transition-colors p-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
              aria-label="Home"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-dark-300 ml-1.5 shrink-0" />
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-dark-900 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 rounded px-0.5"
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1",
                    isLast
                      ? "font-semibold text-dark-900"
                      : "text-dark-500"
                  )}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}

              {!isLast && (
                <ChevronRight className="w-3.5 h-3.5 text-dark-300 ml-1.5 shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

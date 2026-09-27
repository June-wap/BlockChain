import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, AlertCircle, ArrowUpRight } from "lucide-react";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  actor?: string;
  roleBadge?: React.ReactNode;
  txHash?: string;
  status?: "completed" | "current" | "upcoming" | "rejected";
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ items, className }) => {
  return (
    <div className={cn("space-y-6 text-left", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const status = item.status || "completed";

        const iconConfig = {
          completed: {
            icon: Check,
            bg: "bg-success-600 text-white",
            line: "bg-success-500",
          },
          current: {
            icon: Clock,
            bg: "bg-primary-600 text-white ring-4 ring-primary-100",
            line: "bg-border",
          },
          upcoming: {
            icon: Clock,
            bg: "bg-dark-100 text-dark-400 border border-border",
            line: "bg-border",
          },
          rejected: {
            icon: AlertCircle,
            bg: "bg-danger-600 text-white",
            line: "bg-border",
          },
        };

        const currentStyle = iconConfig[status];
        const IconComponent = currentStyle.icon;

        return (
          <div key={item.id} className="relative flex gap-4 group">
            {/* Vertical connector line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-4 top-8 -bottom-6 w-0.5 transition-colors",
                  currentStyle.line
                )}
              />
            )}

            {/* Circular milestone node */}
            <div
              className={cn(
                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                currentStyle.bg
              )}
            >
              <IconComponent className="w-4 h-4 stroke-[2.5]" />
            </div>

            {/* Content card */}
            <div className="flex-1 min-w-0 pt-0.5 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-dark-900 leading-snug">
                    {item.title}
                  </h4>
                  {item.roleBadge && <div>{item.roleBadge}</div>}
                </div>

                {item.timestamp && (
                  <span className="text-[11px] text-dark-400 shrink-0">
                    {item.timestamp}
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-dark-600 mt-1 leading-relaxed bg-dark-50/60 p-3 rounded-xl border border-border/60">
                  {item.description}
                </p>
              )}

              {/* Actor & On-chain Tx Hash */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-dark-400">
                {item.actor && (
                  <span>
                    Initiated by:{" "}
                    <strong className="text-dark-700 font-semibold">
                      {item.actor}
                    </strong>
                  </span>
                )}

                {item.txHash && (
                  <span className="inline-flex items-center gap-1 font-mono text-primary-600 hover:text-primary-700 transition">
                    <span>Tx: {item.txHash}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

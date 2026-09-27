"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "underline",
  className,
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for tablist (ArrowLeft, ArrowRight, Home, End)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (e.key === "ArrowRight") {
      targetIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (e.key === "ArrowLeft") {
      targetIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === "Home") {
      targetIndex = 0;
    } else if (e.key === "End") {
      targetIndex = enabledTabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    onChange(enabledTabs[targetIndex].id);
  };

  return (
    <div
      ref={tabListRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex items-center gap-1 select-none overflow-x-auto",
        variant === "underline" && "border-b border-border",
        variant === "pills" && "p-1 bg-dark-100 rounded-xl",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        if (variant === "pills") {
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              disabled={tab.disabled}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                isActive
                  ? "bg-surface text-dark-900 shadow-xs"
                  : "text-dark-600 hover:text-dark-900 hover:bg-dark-200/60",
                tab.disabled && "opacity-40 pointer-events-none"
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "bg-dark-200 text-dark-600"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            disabled={tab.disabled}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              isActive
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-dark-500 hover:text-dark-900 hover:border-dark-300",
              tab.disabled && "opacity-40 pointer-events-none"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-semibold",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "bg-dark-100 text-dark-600"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      addToast({ type: "success", title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addToast({ type: "error", title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addToast({ type: "warning", title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addToast({ type: "info", title, message, duration }),
  };

  const iconConfig = {
    success: { icon: CheckCircle2, color: "text-success-600 bg-success-50 border-success-200" },
    error: { icon: AlertCircle, color: "text-danger-600 bg-danger-50 border-danger-200" },
    warning: { icon: AlertTriangle, color: "text-warning-600 bg-warning-50 border-warning-200" },
    info: { icon: Info, color: "text-primary-600 bg-primary-50 border-primary-200" },
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}

      {/* Floating container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((t) => {
          const { icon: Icon, color } = iconConfig[t.type];

          return (
            <div
              key={t.id}
              role="alert"
              className={cn(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-surface border border-border shadow-xl transition-all",
                "animate-in slide-in-from-top-2 fade-in duration-200"
              )}
            >
              <div className={`p-1.5 rounded-lg border shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 text-left pt-0.5">
                <h5 className="text-xs font-bold text-dark-900 leading-tight">
                  {t.title}
                </h5>
                {t.message && (
                  <p className="text-xs text-dark-500 mt-1 leading-snug">
                    {t.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-100 transition shrink-0"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

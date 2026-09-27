import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  route: string;
  badge?: string;
  backHref?: string;
  actionText?: string;
  actionHref?: string;
  metaInfo?: { label: string; value: string }[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  subtitle,
  route,
  badge = "Foundation Ready",
  backHref,
  actionText,
  actionHref,
  metaInfo,
}) => {
  return (
    <div className="space-y-6">
      {/* Top action / back row */}
      {backHref && (
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/70">
              {badge}
            </span>
            <span className="font-mono text-xs text-slate-400">{route}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">{subtitle}</p>
        </div>

        {actionText && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition shrink-0"
          >
            {actionText}
          </Link>
        )}
      </div>

      {/* Key metadata chips if any */}
      {metaInfo && metaInfo.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metaInfo.map((m, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs"
            >
              <p className="text-xs font-medium text-slate-500">{m.label}</p>
              <p className="text-base font-semibold text-slate-900 mt-1">
                {m.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Foundation Status Card */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 text-brand-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Route Architecture Initialized
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          This route is registered, secured by role-based guards, and ready for full functional UI in upcoming modules.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
          <Clock className="w-3.5 h-3.5" />
          <span>RBAC enforced &middot; Parameter routing enabled</span>
        </div>
      </div>
    </div>
  );
};

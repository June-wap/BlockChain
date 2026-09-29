"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert, ArrowRight, LogOut, RefreshCw } from "lucide-react";
import { getRoleConfig } from "@/lib/formatters";
import Link from "next/link";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  portalName?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  portalName = "Portal",
}) => {
  const { user, role, isAuthenticated, isLoading, switchRole, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const redirectedRef = React.useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-slate-500 animate-pulse">
          Verifying security credentials & RBAC permissions...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user || !role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-slate-500">
          Redirecting to login...
        </p>
      </div>
    );
  }

  const hasAccess = allowedRoles.includes(role);

  if (!hasAccess) {
    const userRoleConfig = getRoleConfig(role);

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-rose-50 border-b border-rose-100 p-6 flex items-start gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-lg shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">403 Access Denied</h2>
              <p className="text-sm text-slate-600 mt-1">
                You do not have authorization to view the <strong className="text-slate-900">{portalName}</strong>.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Your Current Role:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${userRoleConfig.badgeClass}`}
                >
                  {userRoleConfig.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Required Role(s):</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {allowedRoles.map((r) => {
                    const cfg = getRoleConfig(r);
                    return (
                      <span
                        key={r}
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${cfg.badgeClass}`}
                      >
                        {cfg.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              This system enforces strict role-based access control (RBAC). If you believe this is in error, contact your system administrator or switch to an authorized demo profile below.
            </p>

            {/* Quick switcher for testing / review convenience */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Quick Role Switch (Demo Mode)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allowedRoles.map((r) => {
                  const cfg = getRoleConfig(r);
                  return (
                    <button
                      key={r}
                      onClick={() => switchRole(r)}
                      className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 border border-slate-200 hover:border-brand-300 font-medium transition"
                    >
                      <span>Switch to {cfg.label}</span>
                      <RefreshCw className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <Link
                href={userRoleConfig.defaultPath}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Go to My Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

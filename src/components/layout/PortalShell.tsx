"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem, UserRole } from "@/types";
import { useAuth, DEMO_USERS } from "@/lib/auth-context";
import { getRoleConfig } from "@/lib/formatters";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  Menu,
  X,
  Shield,
  LogOut,
  ChevronDown,
  Bell,
  Wallet,
  ExternalLink,
} from "lucide-react";

interface PortalShellProps {
  portalTitle: string;
  portalSubtitle?: string;
  navItems: NavItem[];
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const PortalShell: React.FC<PortalShellProps> = ({
  portalTitle,
  portalSubtitle = "Insurance Claim System",
  navItems,
  allowedRoles,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const pathname = usePathname();
  const { user, role, logout, switchRole } = useAuth();

  const roleConfig = role ? getRoleConfig(role) : null;

  return (
    <RoleGuard allowedRoles={allowedRoles} portalName={portalTitle}>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* ==================================================== */}
        {/* DESKTOP SIDEBAR                                      */}
        {/* ==================================================== */}
        <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-slate-900 text-slate-100 border-r border-slate-800 shrink-0 select-none">
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white block">
                  InsurChain
                </span>
                <span className="text-xs text-brand-400 font-medium tracking-wide uppercase">
                  {portalTitle}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Navigation
            </div>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" &&
                  !item.href.endsWith("/dashboard") &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DynamicIcon
                      name={item.iconName}
                      className={isActive ? "text-white" : "text-slate-400"}
                      size={18}
                    />
                    <span>{item.title}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User profile & quick role footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-brand-400 shrink-0">
                  {user?.fullName?.charAt(0) || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.fullName || "User"}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {user?.email || "No email"}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Role badge */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Current Role:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-semibold border ${roleConfig?.badgeClass}`}
              >
                {roleConfig?.label}
              </span>
            </div>
          </div>
        </aside>

        {/* ==================================================== */}
        {/* MAIN BODY AREA                                       */}
        {/* ==================================================== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navbar */}
          <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Open mobile navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {portalTitle}
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  {portalSubtitle}
                </p>
              </div>
            </div>

            {/* Right toolbar */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Dev/Demo Role Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition"
                  title="Switch between roles to test RBAC and portal views"
                >
                  <span className="hidden sm:inline text-slate-500">Role:</span>
                  <span className="font-semibold text-slate-900">
                    {roleConfig?.label}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {roleSwitcherOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">
                        Switch Role (Demo)
                      </p>
                    </div>
                    {DEMO_USERS.map((demo) => (
                      <button
                        key={demo.role}
                        onClick={() => {
                          switchRole(demo.role);
                          setRoleSwitcherOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition ${
                          role === demo.role
                            ? "bg-brand-50 text-brand-700 font-semibold"
                            : "text-slate-700"
                        }`}
                      >
                        <div>
                          <p>{demo.label}</p>
                          <p className="text-[10px] text-slate-400 font-normal">
                            {demo.role}
                          </p>
                        </div>
                        {role === demo.role && (
                          <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wallet info indicator */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <Wallet className="w-3.5 h-3.5 text-brand-600" />
                <span className="font-mono text-[11px]" title={user?.walletAddress || "No wallet connected"}>
                  {user?.walletAddress
                    ? `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(user.walletAddress.length - 4)}`
                    : "No Wallet"}
                </span>
              </div>

              {/* Portal Links Menu (Quick Portal Switch) */}
              <Link
                href="/"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1"
                title="Landing Page"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </header>

          {/* Main Workspace Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>

        {/* ==================================================== */}
        {/* MOBILE DRAWER DIALOG                                 */}
        {/* ==================================================== */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-slate-100 shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-brand-500" />
                  <span className="font-bold text-white text-base">
                    InsurChain
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                      pathname === item.href
                        ? "bg-brand-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <DynamicIcon name={item.iconName} size={18} />
                      <span>{item.title}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-rose-300 text-sm font-medium transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

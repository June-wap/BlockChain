"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { RoleGuard } from "@/components/layout/RoleGuard";
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  CreditCard,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  matchPrefix?: string;
}

const CUSTOMER_NAV: CustomerNavItem[] = [
  {
    title: "Dashboard",
    href: "/customer/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Policies",
    href: "/customer/policies",
    matchPrefix: "/customer/policies",
    icon: ShieldCheck,
  },
  {
    title: "My Claims",
    href: "/customer/claims",
    matchPrefix: "/customer/claims",
    icon: FileText,
  },
  {
    title: "Payments",
    href: "/customer/payments",
    matchPrefix: "/customer/payments",
    icon: CreditCard,
  },
  {
    title: "Notifications",
    href: "/customer/notifications",
    icon: Bell,
    badge: 2,
  },
  {
    title: "Profile",
    href: "/customer/profile",
    matchPrefix: "/customer/profile",
    icon: User,
  },
];

function getPageMetadata(pathname: string): { title: string; subtitle: string } {
  if (pathname === "/customer/dashboard") {
    return { title: "Dashboard", subtitle: "Overview of insurance policies & claims" };
  }
  if (pathname === "/customer/policies") {
    return { title: "My Policies", subtitle: "Active insurance coverages and terms" };
  }
  if (pathname.startsWith("/customer/policies/")) {
    return { title: "Policy Details", subtitle: "Coverage conditions and policy rules" };
  }
  if (pathname === "/customer/claims") {
    return { title: "My Claims", subtitle: "Track submitted claims and payout progress" };
  }
  if (pathname === "/customer/claims/new") {
    return { title: "File New Claim", subtitle: "Submit incident details and evidence documents" };
  }
  if (pathname.startsWith("/customer/claims/")) {
    return { title: "Claim Details", subtitle: "Lifecycle milestones and reviewer assessment" };
  }
  if (pathname === "/customer/payments") {
    return { title: "Payments", subtitle: "Disbursements and transaction receipts" };
  }
  if (pathname === "/customer/notifications") {
    return { title: "Notifications", subtitle: "Real-time updates and claim alerts" };
  }
  if (pathname === "/customer/profile") {
    return { title: "Customer Profile", subtitle: "Personal KYC credentials and payout wallet" };
  }
  return { title: "Customer Portal", subtitle: "Insurance Claim Processing System" };
}

function getInitials(name?: string): string {
  if (!name) return "CU";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const { title: pageTitle, subtitle: pageSubtitle } = getPageMetadata(pathname);

  // Close drawer on path change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  // Handle escape key to close mobile drawer
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawerOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileDrawerOpen]);

  const isItemActive = (item: CustomerNavItem) => {
    if (item.href === "/customer/dashboard") {
      return pathname === "/customer/dashboard";
    }
    if (item.matchPrefix) {
      return pathname === item.href || pathname.startsWith(item.matchPrefix);
    }
    return pathname === item.href;
  };

  return (
    <RoleGuard allowedRoles={[UserRole.CUSTOMER]} portalName="Customer Portal">
      <div className="min-h-screen bg-background text-dark-900 flex overflow-x-hidden max-w-full">
        {/* ==================================================== */}
        {/* DESKTOP SIDEBAR (Left)                               */}
        {/* ==================================================== */}
        <aside className="hidden lg:flex lg:w-64 xl:w-72 flex-col bg-surface border-r border-border shrink-0 select-none z-20">
          {/* Brand Logo Header */}
          <div className="h-16 px-5 border-b border-border flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div className="leading-none">
                <span className="font-bold text-base tracking-tight text-dark-900 block">
                  InsurChain
                </span>
                <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider block mt-0.5">
                  Customer Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Items List */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Customer navigation">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-dark-400">
              Customer Menu
            </div>

            {CUSTOMER_NAV.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                    active
                      ? "bg-primary-600 text-white shadow-xs"
                      : "text-dark-600 hover:bg-dark-100 hover:text-dark-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-colors",
                        active ? "text-white" : "text-dark-400 group-hover:text-dark-700"
                      )}
                    />
                    <span>{item.title}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-primary-50 text-primary-700 border border-primary-200"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Customer Profile & Logout Footer */}
          <div className="p-3 border-t border-border bg-dark-50/40">
            <Link
              href="/customer/profile"
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface transition border border-transparent hover:border-border group"
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 border border-primary-200 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                {getInitials(user?.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-dark-900 truncate group-hover:text-primary-700">
                  {user?.fullName || "Customer"}
                </p>
                <p className="text-[11px] text-dark-500 truncate">
                  {user?.email || "customer@insurance.com"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-primary-600 transition shrink-0" />
            </Link>

            <button
              type="button"
              onClick={logout}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-danger-600 hover:bg-danger-50 transition border border-transparent hover:border-danger-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ==================================================== */}
        {/* MAIN WORKSPACE WRAPPER                               */}
        {/* ==================================================== */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* ================================================== */}
          {/* TOP BAR                                            */}
          {/* ================================================== */}
          <header className="h-16 bg-surface border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs select-none">
            {/* Left: Mobile hamburger & Dynamic Page Title */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Drawer Trigger Button */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-lg text-dark-600 hover:text-dark-900 hover:bg-dark-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shrink-0"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Dynamic Page Title & Subtitle */}
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-dark-900 truncate tracking-tight">
                  {pageTitle}
                </h1>
                <p className="text-xs text-dark-500 hidden sm:block truncate">
                  {pageSubtitle}
                </p>
              </div>
            </div>

            {/* Right: Notification Bell & Customer Avatar */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Notifications Icon with Badge */}
              <Link
                href="/customer/notifications"
                className="relative p-2 rounded-xl text-dark-500 hover:text-dark-900 hover:bg-dark-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="View notifications (2 unread)"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-600 ring-2 ring-surface" />
              </Link>

              {/* Customer Avatar & Name Widget */}
              <Link
                href="/customer/profile"
                className="flex items-center gap-2.5 p-1 sm:pr-2.5 rounded-full sm:rounded-xl hover:bg-dark-50 transition border border-transparent hover:border-border"
                aria-label="Go to customer profile"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-50 border border-primary-200 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(user?.fullName)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-dark-900 leading-tight truncate max-w-[130px]">
                    {user?.fullName || "Customer"}
                  </p>
                  <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider block">
                    Policyholder
                  </span>
                </div>
              </Link>
            </div>
          </header>

          {/* ================================================== */}
          {/* MAIN CONTENT AREA                                  */}
          {/* ================================================== */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>

        {/* ==================================================== */}
        {/* MOBILE DRAWER (Slide-out menu with backdrop)         */}
        {/* ==================================================== */}
        {mobileDrawerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation drawer"
            className="fixed inset-0 z-50 lg:hidden flex"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-dark-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Panel */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-surface border-r border-border shadow-2xl z-10 animate-in slide-in-from-left duration-200">
              {/* Drawer Header */}
              <div className="h-16 px-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-dark-900 block leading-tight">
                      InsurChain
                    </span>
                    <span className="text-[9px] font-semibold text-primary-600 uppercase tracking-wider block">
                      Customer Portal
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-dark-700 hover:bg-dark-100 transition"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Customer Summary */}
              <div className="p-4 border-b border-border bg-dark-50/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 border border-primary-200 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(user?.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-dark-900 truncate">
                    {user?.fullName || "Customer"}
                  </p>
                  <p className="text-[11px] text-dark-500 truncate">
                    {user?.email || "customer@insurance.com"}
                  </p>
                </div>
              </div>

              {/* Drawer Navigation Links */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {CUSTOMER_NAV.map((item) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                        active
                          ? "bg-primary-600 text-white shadow-xs"
                          : "text-dark-600 hover:bg-dark-100 hover:text-dark-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            active ? "text-white" : "text-dark-400"
                          )}
                        />
                        <span>{item.title}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-primary-50 text-primary-700 border border-primary-200"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Drawer Footer: Logout */}
              <div className="p-4 border-t border-border bg-surface">
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-danger-50 hover:bg-danger-100 text-danger-700 text-xs font-semibold transition border border-danger-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

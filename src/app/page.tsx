"use client";

import React from "react";
import Link from "next/link";
import { useAuth, DEMO_USERS } from "@/lib/auth-context";
import {
  Shield,
  ArrowRight,
  UserCheck,
  Cpu,
  Lock,
  Layers,
  FileCheck,
  CheckCircle2,
} from "lucide-react";
import { getRoleConfig } from "@/lib/formatters";

export default function HomePage() {
  const { user, isAuthenticated, switchRole, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">
                InsurChain
              </span>
              <span className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider">
                Claim Processing System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Logged in as{" "}
                  <strong className="text-white">{user.fullName}</strong>
                </span>
                <Link
                  href={getRoleConfig(user.role).defaultPath}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition"
                >
                  My Portal
                </Link>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Foundation Ready &middot; Next.js App Router &middot; Strict RBAC</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Enterprise Insurance Claim Processing System
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          End-to-end policy management, evidence verification, multi-role review workflows,
          and automated smart contract payouts with dual-layer route guards.
        </p>

        {/* Quick Demo Switcher */}
        <div className="pt-6">
          <div className="p-6 bg-slate-800/80 rounded-2xl border border-slate-700 max-w-3xl mx-auto text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Test Personas & Role Switcher
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any role below to authenticate instantly and explore its dedicated portal and route guards:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DEMO_USERS.map((demo) => {
                const config = getRoleConfig(demo.role);
                const isCurrent = user?.role === demo.role;

                return (
                  <button
                    key={demo.role}
                    onClick={() => switchRole(demo.role)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition group relative ${
                      isCurrent
                        ? "bg-brand-950/60 border-brand-500 shadow-md shadow-brand-500/10"
                        : "bg-slate-900 hover:bg-slate-850 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-2 ${config.badgeClass}`}
                      >
                        {demo.role}
                      </span>
                      <h4 className="text-xs font-bold text-white group-hover:text-brand-300">
                        {demo.label}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {demo.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-brand-400 group-hover:translate-x-0.5 transition">
                      <span>{isCurrent ? "Active Session" : "Enter Portal"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Portals Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Portal Card */}
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 flex flex-col justify-between hover:border-slate-600 transition">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Customer Portal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Register & login, manage active policies, submit insurance claims with evidence files, and track real-time payout disbursements.
              </p>
              <div className="space-y-1.5 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <code>/customer/dashboard</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <code>/customer/policies</code> &amp; <code>:id</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <code>/customer/claims</code>, <code>/new</code>, <code>:id</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <code>/customer/payments</code>, <code>profile</code>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700">
              <Link
                href="/customer/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
              >
                Access Customer Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Staff Desk Card */}
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 flex flex-col justify-between hover:border-slate-600 transition">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Insurance Staff Desk</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dedicated review desk for Claim Reviewers & Finance officers. Assess evidence, approve or reject claims, and schedule payments.
              </p>
              <div className="space-y-1.5 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                  <code>/staff/dashboard</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                  <code>/staff/claims</code> &amp; <code>:id/review</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                  <code>/staff/policies</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                  <code>/staff/customers</code> &amp; <code>payments</code>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700">
              <Link
                href="/staff/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
              >
                Access Staff Desk
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Admin Console Card */}
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700 p-6 flex flex-col justify-between hover:border-slate-600 transition">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Admin Console</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Superuser governance. Manage users & staff rosters, policy configurations, blockchain transactions ledger, and immutable audit logs.
              </p>
              <div className="space-y-1.5 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <code>/admin/dashboard</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <code>/admin/users</code> &amp; <code>staff</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <code>/admin/blockchain</code> &amp; <code>transactions</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <code>/admin/audit-logs</code> &amp; <code>settings</code>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700">
              <Link
                href="/admin/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                Access Admin Console
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Insurance Claim Processing System &copy; 2026 &middot; Built with Next.js App Router, Tailwind CSS, TypeScript &amp; Web3
      </footer>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchAdminDashboard } from "@/lib/api/admin";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Users,
  Shield,
  FileStack,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Cpu,
  Layers,
  Activity,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchAdminDashboard();
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load admin analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const kpis = data?.kpis;
  const charts = data?.charts;
  const recentTransactions = data?.recentTransactions || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block">
            System Administration Console
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Administrator: {user?.fullName || "Admin"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time analytics, user role administration, smart contract transaction telemetry, and audit trail integrity.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/blockchain">
            <Button variant="secondary" size="sm" className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">
              <Cpu className="w-4 h-4 mr-1.5" />
              Blockchain Explorer
            </Button>
          </Link>
          <Link href="/admin/audit-logs">
            <Button variant="primary" size="sm">
              <Activity className="w-4 h-4 mr-1.5" />
              Audit Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadDashboard}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* 8 KPI Cards (FE-21) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Customers
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? "..." : kpis?.totalCustomers}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Active Policies
          </span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {isLoading ? "..." : kpis?.activePolicies}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Claims Filed
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {isLoading ? "..." : kpis?.totalClaims}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Pending Claims
          </span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {isLoading ? "..." : kpis?.pendingClaims}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Approved Claims
          </span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {isLoading ? "..." : kpis?.approvedClaims}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Rejected Claims
          </span>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {isLoading ? "..." : kpis?.rejectedClaims}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Claim Value
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">
            {isLoading ? "..." : formatCurrency(kpis?.totalClaimValue || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Settled & Paid
          </span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
            {isLoading ? "..." : formatCurrency(kpis?.totalPaid || 0)}
          </p>
        </div>
      </div>

      {/* Visual Analytics / Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims By Status Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Claim Status Distribution
          </h2>
          <div className="space-y-3 pt-2">
            {charts?.claimsByStatus?.map((item: any) => {
              const total = kpis?.totalClaims || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.status} className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{item.status}</span>
                    <span className="font-mono text-slate-500">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status.includes("Approved") || item.status.includes("Paid")
                          ? "bg-emerald-500"
                          : item.status.includes("Rejected")
                          ? "bg-red-500"
                          : "bg-brand-500"
                      }`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Claims by Monthly Trend */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Monthly Claims Intake & Volume
          </h2>
          <div className="grid grid-cols-5 gap-2 h-44 items-end pt-4 pb-2 border-b border-slate-200 dark:border-slate-700">
            {charts?.claimsByMonth?.map((m: any) => {
              const maxCount = 35;
              const heightPct = Math.round((m.count / maxCount) * 100);
              return (
                <div key={m.month} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {m.count}
                  </span>
                  <div
                    className="w-full max-w-[36px] bg-brand-500 dark:bg-brand-400 rounded-t-lg transition-all"
                    style={{ height: `${Math.max(15, heightPct)}%` }}
                  />
                  <span className="text-[11px] text-slate-400 font-medium">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2-Column: Recent Blockchain Transactions & System Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-500" />
              Recent Blockchain Transactions
            </h2>
            <Link
              href="/admin/transactions"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
            >
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {recentTransactions.slice(0, 5).map((tx: any) => (
              <div key={tx.id || tx.txHash} className="py-3 flex items-center justify-between text-xs">
                <div className="truncate mr-3">
                  <span className="font-mono text-brand-600 dark:text-brand-400 font-bold truncate block">
                    {tx.txHash ? `${tx.txHash.slice(0, 14)}...${tx.txHash.slice(-6)}` : tx.id}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {tx.action} • Block #{tx.blockNumber}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent System Activity */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Recent Audit Log Events
            </h2>
            <Link
              href="/admin/audit-logs"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
            >
              Full Audit Trail
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {recentActivity.slice(0, 5).map((act: any) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-slate-900 dark:text-white block">
                    {act.actorName} ({act.role})
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {act.action} • {act.entityType} #{act.entityId}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {formatDate(act.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

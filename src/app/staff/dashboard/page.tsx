"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Claim, ClaimStatus } from "@/types";
import { fetchClaims } from "@/lib/api/claims";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  FileCheck,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

function getWaitingDuration(submittedDate: string): string {
  const diffMs = Date.now() - new Date(submittedDate).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "< 1 hour";
  if (diffHours < 24) return `${diffHours} hours`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""}`;
}

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchClaims();
      setClaims(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load staff queue data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingReviewCount = claims.filter((c) => c.status === ClaimStatus.SUBMITTED).length;
  const underReviewCount = claims.filter((c) => c.status === ClaimStatus.UNDER_REVIEW).length;
  const approvedCount = claims.filter((c) => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID).length;
  const rejectedCount = claims.filter((c) => c.status === ClaimStatus.REJECTED).length;

  const attentionClaims = claims.filter(
    (c) => c.status === ClaimStatus.SUBMITTED || c.status === ClaimStatus.UNDER_REVIEW
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 inline-block">
            Staff Underwriting & Operations
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Welcome, {user?.fullName || "Insurance Staff"} ({user?.role || "CLAIM_REVIEWER"})
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Review submitted insurance incidents, verify document integrity, and approve or reject claims with recorded justifications.
          </p>
        </div>

        <Link href="/staff/claims">
          <Button variant="primary" size="md">
            <FileCheck className="w-4 h-4 mr-2" />
            Open Full Claim Queue
          </Button>
        </Link>
      </div>

      {/* 4 Metric Cards (FE-16) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Pending Review
            </span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? "..." : pendingReviewCount}
          </h3>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">
            Newly received claims
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Under Review
            </span>
            <FileCheck className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? "..." : underReviewCount}
          </h3>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
            Active evidence audit
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? "..." : approvedCount}
          </h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            Settled or pending payout
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Rejected
            </span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? "..." : rejectedCount}
          </h3>
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1">
            Outside policy limits
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Claims Requiring Attention */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Claims Requiring Immediate Attention
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Claims awaiting initial assessment or active evidence verification
            </p>
          </div>
          <Link
            href="/staff/claims"
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>View Full Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : attentionClaims.length === 0 ? (
          <EmptyState
            title="Queue is completely clear!"
            description="There are currently no pending or unreviewed claims in the system."
            icon="CheckCircle2"
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {attentionClaims.map((item) => (
              <div
                key={item.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-750/30 rounded-xl px-2 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {item.claimNumber}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                    <span>
                      Applicant: <strong className="text-slate-800 dark:text-slate-200">{item.customerName || "Customer"}</strong>
                    </span>
                    <span>&middot;</span>
                    <span>Policy: {item.policyId}</span>
                    <span>&middot;</span>
                    <span>Submitted: {formatDate(item.createdAt)}</span>
                    <span>&middot;</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Waiting: {getWaitingDuration(item.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block font-medium">
                      Claim Amount
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.requestedAmount)}
                    </span>
                  </div>
                  <Link href={`/staff/claims/${item.id}/review`}>
                    <Button variant="primary" size="sm">
                      <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                      Review Claim
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

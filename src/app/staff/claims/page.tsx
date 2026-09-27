"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Claim, ClaimStatus } from "@/types";
import { fetchClaims } from "@/lib/api/claims";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  FileCheck,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const QUEUE_FILTERS = [
  { label: "All Queue", value: "ALL" },
  { label: "Submitted", value: ClaimStatus.SUBMITTED },
  { label: "Under Review", value: ClaimStatus.UNDER_REVIEW },
  { label: "Approved", value: ClaimStatus.APPROVED },
  { label: "Payment Pending", value: ClaimStatus.PAYMENT_PENDING },
  { label: "Paid", value: ClaimStatus.PAID },
  { label: "Rejected", value: ClaimStatus.REJECTED },
];

export default function StaffClaimsQueuePage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadClaims = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchClaims({
        status: selectedStatus,
        search: searchQuery,
      });
      setClaims(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load claims queue.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadClaims();
  };

  // Metrics
  const submittedCount = claims.filter((c) => c.status === ClaimStatus.SUBMITTED).length;
  const underReviewCount = claims.filter((c) => c.status === ClaimStatus.UNDER_REVIEW).length;
  const approvedCount = claims.filter((c) => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID).length;
  const rejectedCount = claims.filter((c) => c.status === ClaimStatus.REJECTED).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Underwriting & Claims Queue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review submitted claims, cross-reference policy coverage, inspect evidence, and finalize approvals
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Pending Review</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{submittedCount}</p>
          </div>
          <Clock className="w-5 h-5 text-blue-500" />
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Under Review</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{underReviewCount}</p>
          </div>
          <FileCheck className="w-5 h-5 text-amber-500" />
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Approved</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{approvedCount}</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Rejected</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{rejectedCount}</p>
          </div>
          <XCircle className="w-5 h-5 text-red-500" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {QUEUE_FILTERS.map((filter) => {
              const active = selectedStatus === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setSelectedStatus(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    active
                      ? "bg-brand-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Claim ID, Customer, Policy..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadClaims}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Queue Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <EmptyState
          title="No claims matching filters"
          description="Try changing filter criteria or search keyword."
          icon="FileText"
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Policy Reference</th>
                  <th className="py-3 px-4">Requested Amount</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {claims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {claim.claimNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                      {claim.customerName || "Customer"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {claim.policyId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(claim.requestedAmount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {formatDate(claim.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/staff/claims/${claim.id}/review`}>
                        <Button variant="primary" size="xs">
                          <FileCheck className="w-3.5 h-3.5 mr-1" />
                          Review Claim
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {claim.claimNumber}
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      Applicant: {claim.customerName || "Customer"}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Requested
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(claim.requestedAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Date
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatDate(claim.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <Link href={`/staff/claims/${claim.id}/review`}>
                    <Button variant="primary" size="xs" className="w-full">
                      <FileCheck className="w-3.5 h-3.5 mr-1" />
                      Review Claim
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

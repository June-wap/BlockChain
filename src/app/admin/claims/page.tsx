"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Claim, ClaimStatus } from "@/types";
import { fetchClaims } from "@/lib/api/claims";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  FileStack,
  Search,
  Eye,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminClaimsPage() {
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
      setErrorMessage(err.message || "Failed to load claims.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadClaims();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Global Claims Oversight
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          System-wide visibility of all insurance claims across all reviewers, categories, and settlement states
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {["ALL", ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED, ClaimStatus.PAYMENT_PENDING, ClaimStatus.PAID, ClaimStatus.REJECTED].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedStatus === s
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {s === "ALL" ? "All Claims" : s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Claim ID, customer..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Error state */}
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

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <EmptyState
          title="No claims found"
          description="Try changing status filter or search query."
          icon="FileStack"
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Claim ID</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Policy ID</th>
                <th className="py-3 px-4">Requested</th>
                <th className="py-3 px-4">Approved</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {claims.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {c.claimNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {c.customerName || c.customerId}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                    {c.policyId}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(c.requestedAmount)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                    {c.approvedAmount !== undefined ? formatCurrency(c.approvedAmount) : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {c.reviewerId || "Unassigned"}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/staff/claims/${c.id}/review`}>
                      <Button variant="ghost" size="xs">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Inspect
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

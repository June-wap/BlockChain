"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Claim, ClaimStatus } from "@/types";
import { fetchClaims } from "@/lib/api/claims";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  FileText,
  Search,
  PlusCircle,
  Eye,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const CLAIM_FILTERS = [
  { label: "All Claims", value: "ALL" },
  { label: "Submitted", value: ClaimStatus.SUBMITTED },
  { label: "Under Review", value: ClaimStatus.UNDER_REVIEW },
  { label: "Approved", value: ClaimStatus.APPROVED },
  { label: "Payment Pending", value: ClaimStatus.PAYMENT_PENDING },
  { label: "Paid", value: ClaimStatus.PAID },
  { label: "Rejected", value: ClaimStatus.REJECTED },
];

export default function CustomerClaimsPage() {
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
      setErrorMessage(err.message || "Failed to load claims. Please try again.");
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Insurance Claims
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track claims through audit, reviewer approval, and verified smart contract settlement
          </p>
        </div>
        <Link href="/customer/claims/new">
          <Button variant="primary" size="sm" className="w-full sm:w-auto">
            <PlusCircle className="w-4 h-4 mr-2" />
            Submit New Claim
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {CLAIM_FILTERS.map((filter) => {
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
              placeholder="Search Claim ID or Policy..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Error State */}
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

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : claims.length === 0 ? (
        /* Empty State */
        <EmptyState
          title="No claims found"
          description={
            selectedStatus !== "ALL"
              ? `You currently do not have any claims with status '${selectedStatus}'.`
              : "You have not submitted any insurance claims yet."
          }
          icon="FileText"
          actionText={selectedStatus !== "ALL" ? "Clear Filters" : "Submit Your First Claim"}
          actionHref={selectedStatus !== "ALL" ? undefined : "/customer/claims/new"}
          onAction={selectedStatus !== "ALL" ? () => setSelectedStatus("ALL") : undefined}
        />
      ) : (
        /* Claims Content */
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Claim ID</th>
                  <th className="py-3 px-4">Policy Reference</th>
                  <th className="py-3 px-4">Requested Amount</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {claims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      <Link
                        href={`/customer/claims/${claim.id}`}
                        className="hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-500" />
                        <span>{claim.claimNumber}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {claim.policyId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(claim.requestedAmount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {formatDate(claim.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/customer/claims/${claim.id}`}>
                        <Button variant="ghost" size="xs">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View (Zero horizontal overflow) */}
          <div className="lg:hidden space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      {claim.claimNumber}
                    </span>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Policy: {claim.policyId}
                    </p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Requested Amount
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(claim.requestedAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Submitted On
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatDate(claim.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <Link href={`/customer/claims/${claim.id}`}>
                    <Button variant="secondary" size="xs" className="w-full">
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View Claim Details
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

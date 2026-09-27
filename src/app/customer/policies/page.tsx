"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PolicyDetail, PolicyStatus } from "@/types";
import { fetchCustomerPolicies } from "@/lib/api/policies";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Shield,
  Search,
  PlusCircle,
  Eye,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

const STATUS_FILTERS = [
  { label: "All Policies", value: "ALL" },
  { label: "Active", value: PolicyStatus.ACTIVE },
  { label: "Expired", value: PolicyStatus.EXPIRED },
  { label: "Suspended", value: PolicyStatus.SUSPENDED },
  { label: "Cancelled", value: PolicyStatus.CANCELLED },
];

export default function CustomerPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyDetail[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPolicies = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchCustomerPolicies({
        status: selectedStatus,
        search: searchQuery,
      });
      setPolicies(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load policies. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPolicies();
  };

  const getStatusBadge = (status: PolicyStatus) => {
    switch (status) {
      case PolicyStatus.ACTIVE:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case PolicyStatus.EXPIRED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            Expired
          </span>
        );
      case PolicyStatus.SUSPENDED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Suspended
          </span>
        );
      case PolicyStatus.CANCELLED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Insurance Policies
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your registered policies, check coverage limits, and initiate verified claims
          </p>
        </div>
        <Link href="/customer/claims/new">
          <Button variant="primary" size="sm" className="w-full sm:w-auto">
            <PlusCircle className="w-4 h-4 mr-2" />
            File a New Claim
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {STATUS_FILTERS.map((filter) => {
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
              placeholder="Search policy number, type..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Error State */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadPolicies}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20" />
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
      ) : policies.length === 0 ? (
        /* Empty State */
        <EmptyState
          title="No policies found"
          description={
            selectedStatus !== "ALL"
              ? `You currently do not have any policies matching '${selectedStatus}'.`
              : "You have not registered any insurance policies yet."
          }
          icon="Shield"
          actionText={selectedStatus !== "ALL" ? "Reset Filter" : undefined}
          onAction={selectedStatus !== "ALL" ? () => setSelectedStatus("ALL") : undefined}
        />
      ) : (
        /* Policies Content */
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Policy Number</th>
                  <th className="py-3 px-4">Insurance Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Coverage Amount</th>
                  <th className="py-3 px-4">Effective Dates</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {policies.map((policy) => {
                  const isActive = policy.status === PolicyStatus.ACTIVE;
                  return (
                    <tr
                      key={policy.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        <Link
                          href={`/customer/policies/${policy.id}`}
                          className="hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1.5"
                        >
                          <Shield className="w-3.5 h-3.5 text-brand-500" />
                          <span>{policy.policyNumber}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {policy.type}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(policy.status)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(policy.coverageAmount)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {formatDate(policy.startDate)} — {formatDate(policy.endDate)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/customer/policies/${policy.id}`}>
                            <Button variant="ghost" size="xs">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Details
                            </Button>
                          </Link>
                          {isActive ? (
                            <Link href={`/customer/claims/new?policyId=${policy.id}`}>
                              <Button variant="primary" size="xs">
                                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                Submit Claim
                              </Button>
                            </Link>
                          ) : (
                            <Button variant="ghost" size="xs" disabled title="Only ACTIVE policies can submit claims">
                              Submit Claim
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View (Zero horizontal overflow) */}
          <div className="lg:hidden space-y-3">
            {policies.map((policy) => {
              const isActive = policy.status === PolicyStatus.ACTIVE;
              return (
                <div
                  key={policy.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                        {policy.policyNumber}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {policy.type}
                      </h3>
                    </div>
                    {getStatusBadge(policy.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-medium">
                        Coverage Limit
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(policy.coverageAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-medium">
                        Annual Premium
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(policy.premiumAmount)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase font-medium">
                        Coverage Window
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {formatDate(policy.startDate)} to {formatDate(policy.endDate)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-2">
                    <Link href={`/customer/policies/${policy.id}`} className="flex-1">
                      <Button variant="secondary" size="xs" className="w-full">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Details
                      </Button>
                    </Link>
                    {isActive && (
                      <Link href={`/customer/claims/new?policyId=${policy.id}`} className="flex-1">
                        <Button variant="primary" size="xs" className="w-full">
                          <PlusCircle className="w-3.5 h-3.5 mr-1" />
                          Submit Claim
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

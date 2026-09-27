"use client";

import React, { useEffect, useState } from "react";
import { PolicyDetail, PolicyStatus } from "@/types";
import { fetchCustomerPolicies } from "@/lib/api/policies";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  ShieldAlert,
  Search,
  Eye,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyDetail[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Policy Detail Modal
  const [activePolicy, setActivePolicy] = useState<PolicyDetail | null>(null);

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
      setErrorMessage(err.message || "Failed to load policies catalog.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPolicies();
  };

  const getStatusBadge = (status: PolicyStatus) => {
    switch (status) {
      case PolicyStatus.ACTIVE:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            ACTIVE
          </span>
        );
      case PolicyStatus.EXPIRED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
            EXPIRED
          </span>
        );
      case PolicyStatus.SUSPENDED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            SUSPENDED
          </span>
        );
      default:
        return <span className="text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Policy Catalog & Underwriting Portfolio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          System-wide directory of customer insurance policies, coverage limits, and underwriting status
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["ALL", PolicyStatus.ACTIVE, PolicyStatus.EXPIRED, PolicyStatus.SUSPENDED].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedStatus === s
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {s === "ALL" ? "All Policies" : s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative sm:w-72">
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

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3">
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

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          title="No policies found"
          description="Try adjusting your search criteria."
          icon="ShieldAlert"
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Policy ID</th>
                <th className="py-3 px-4">Customer Holder</th>
                <th className="py-3 px-4">Plan Type</th>
                <th className="py-3 px-4">Coverage Cap</th>
                <th className="py-3 px-4">Annual Premium</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {policies.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {p.policyNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                    {p.customerName || p.customerId}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {p.type}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {formatCurrency(p.coverageAmount)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(p.premiumAmount)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {formatDate(p.startDate)} - {formatDate(p.endDate)}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setActivePolicy(p)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Policy Detail Modal */}
      {activePolicy && (
        <Modal
          isOpen={!!activePolicy}
          onClose={() => setActivePolicy(null)}
          title={`Policy Details: ${activePolicy.policyNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Plan Type</span>
              <span className="font-bold text-slate-900 dark:text-white">{activePolicy.type}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Policyholder</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {activePolicy.customerName || activePolicy.customerId}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Coverage Limit</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activePolicy.coverageAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Premium Schedule</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(activePolicy.premiumAmount)} / year
              </span>
            </div>
            {activePolicy.termsUri && (
              <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1">Decentralized IPFS Terms URI</span>
                <span className="font-mono text-brand-600 dark:text-brand-400 break-all bg-slate-100 dark:bg-slate-900 p-2 rounded block">
                  {activePolicy.termsUri}
                </span>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setActivePolicy(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

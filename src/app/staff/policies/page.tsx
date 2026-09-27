"use client";

import React, { useEffect, useState } from "react";
import { PolicyDetail, PolicyStatus } from "@/types";
import { fetchCustomerPolicies } from "@/lib/api/policies";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Shield, Search, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function StaffPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyDetail[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activePolicy, setActivePolicy] = useState<PolicyDetail | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCustomerPolicies({ search });
      setPolicies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Policy Registry & Coverage Boundaries
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Search and verify applicant policy terms, maximum coverage limits, deductibles, and active periods
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData();
          }}
          className="relative sm:w-80"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policy number, applicant, or plan type..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <EmptyState title="No policies found" description="No policies matched your search criteria." icon="Shield" />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Policy ID</th>
                <th className="py-3 px-4">Policyholder</th>
                <th className="py-3 px-4">Plan Type</th>
                <th className="py-3 px-4">Coverage Limit</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    {p.policyNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {p.customerName || p.customerId}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{p.type}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {formatCurrency(p.coverageAmount)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {formatDate(p.startDate)} - {formatDate(p.endDate)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="xs" onClick={() => setActivePolicy(p)}>
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activePolicy && (
        <Modal
          isOpen={!!activePolicy}
          onClose={() => setActivePolicy(null)}
          title={`Policy Terms #${activePolicy.policyNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Plan Type</span>
              <span className="font-bold text-slate-900 dark:text-white">{activePolicy.type}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Coverage Limit</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activePolicy.coverageAmount)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Terms & Conditions</span>
              <p className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                {activePolicy.termsAndConditions || "Standard comprehensive coverage."}
              </p>
            </div>
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

"use client";

import React, { useEffect, useState } from "react";
import { User, UserStatus } from "@/types";
import { fetchAdminUsers } from "@/lib/api/admin";
import { formatDate } from "@/lib/formatters";
import { Users, Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function StaffCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminUsers({ search });
      setCustomers(data);
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
          Customer Directory & Identity Verification
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Look up policyholder accounts, historical claims frequency, and contact records
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
            placeholder="Search by customer name, email..."
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
      ) : customers.length === 0 ? (
        <EmptyState title="No customers found" description="Try a different search keyword." icon="Users" />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Applicant ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Policies</th>
                <th className="py-3 px-4">Claims</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">{c.id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{c.fullName}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{c.email}</td>
                  <td className="py-3 px-4 text-slate-500">{c.phoneNumber || "—"}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{c.policyCount}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{c.claimCount}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="xs" onClick={() => setActiveCustomer(c)}>
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

      {activeCustomer && (
        <Modal
          isOpen={!!activeCustomer}
          onClose={() => setActiveCustomer(null)}
          title={`Customer Summary: ${activeCustomer.fullName}`}
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Email</span>
              <span className="font-semibold text-slate-900 dark:text-white">{activeCustomer.email}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Phone</span>
              <span>{activeCustomer.phoneNumber || "Not provided"}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Registered</span>
              <span>{formatDate(activeCustomer.createdAt)}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Active Policies Count</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{activeCustomer.policyCount}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Historical Claims Count</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{activeCustomer.claimCount}</span>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setActiveCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

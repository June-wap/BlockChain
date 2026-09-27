"use client";

import React, { useEffect, useState } from "react";
import { User, UserStatus } from "@/types";
import { fetchAdminUsers, updateUserStatusApi } from "@/lib/api/admin";
import { formatDate } from "@/lib/formatters";
import {
  Users,
  Search,
  Eye,
  ShieldCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

interface AdminUserItem extends User {
  policyCount: number;
  claimCount: number;
  status: UserStatus;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User Detail Modal
  const [activeUser, setActiveUser] = useState<AdminUserItem | null>(null);

  // Suspend/Activate Modal
  const [actionUser, setActionUser] = useState<AdminUserItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminUsers({
        search: searchQuery,
        status: selectedStatus,
      });
      setUsers(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load customer accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleConfirmStatusChange = async () => {
    if (!actionUser) return;
    setIsProcessing(true);
    try {
      const newStatus =
        actionUser.status === UserStatus.ACTIVE
          ? UserStatus.SUSPENDED
          : UserStatus.ACTIVE;
      await updateUserStatusApi(actionUser.id, newStatus, suspendReason);
      setActionUser(null);
      setSuspendReason("");
      await loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update user status.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Customer Accounts Administration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review customer profiles, monitor policy portfolios, and manage account authorization status
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {["ALL", UserStatus.ACTIVE, UserStatus.SUSPENDED].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedStatus === s
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {s === "ALL" ? "All Customers" : s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or ID..."
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
          <Button variant="secondary" size="sm" onClick={loadUsers}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Table & Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No customer accounts found"
          description="Try modifying search keywords or status filter."
          icon="Users"
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Full Legal Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Policies</th>
                  <th className="py-3 px-4">Claims</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {u.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {u.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {u.email}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {u.policyCount}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {u.claimCount}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.status === UserStatus.ACTIVE
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setActiveUser(u)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                        <Button
                          variant={u.status === UserStatus.ACTIVE ? "danger" : "secondary"}
                          size="xs"
                          onClick={() => setActionUser(u)}
                        >
                          {u.status === UserStatus.ACTIVE ? (
                            <>
                              <UserX className="w-3.5 h-3.5 mr-1" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {u.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === UserStatus.ACTIVE
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Active Policies
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {u.policyCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Total Claims
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {u.claimCount}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    className="flex-1"
                    onClick={() => setActiveUser(u)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Details
                  </Button>
                  <Button
                    variant={u.status === UserStatus.ACTIVE ? "danger" : "secondary"}
                    size="xs"
                    className="flex-1"
                    onClick={() => setActionUser(u)}
                  >
                    {u.status === UserStatus.ACTIVE ? "Suspend" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {activeUser && (
        <Modal
          isOpen={!!activeUser}
          onClose={() => setActiveUser(null)}
          title={`Customer Record #${activeUser.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Legal Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{activeUser.fullName}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Email Address</span>
              <span className="font-medium text-slate-900 dark:text-white">{activeUser.email}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Phone Number</span>
              <span className="text-slate-800 dark:text-slate-200">{activeUser.phoneNumber || "Not provided"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Connected Wallet</span>
              <span className="font-mono text-brand-600 dark:text-brand-400 break-all">
                {activeUser.walletAddress || "None"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Registration Date</span>
              <span className="text-slate-700 dark:text-slate-300">{formatDate(activeUser.createdAt)}</span>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setActiveUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend/Activate Confirmation Modal */}
      {actionUser && (
        <Modal
          isOpen={!!actionUser}
          onClose={() => !isProcessing && setActionUser(null)}
          title={
            actionUser.status === UserStatus.ACTIVE
              ? "Suspend Customer Account"
              : "Reactivate Customer Account"
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Are you sure you want to change the status of <strong>{actionUser.fullName}</strong> ({actionUser.email}) to{" "}
              <strong>
                {actionUser.status === UserStatus.ACTIVE ? "SUSPENDED" : "ACTIVE"}
              </strong>
              ?
            </p>

            {actionUser.status === UserStatus.ACTIVE && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Suspension (recorded in immutable audit log)
                </label>
                <textarea
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Identity verification discrepancy, suspected fraudulent claim..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessing}
                onClick={() => setActionUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant={actionUser.status === UserStatus.ACTIVE ? "danger" : "primary"}
                size="sm"
                disabled={isProcessing}
                onClick={handleConfirmStatusChange}
              >
                {isProcessing
                  ? "Updating Status..."
                  : actionUser.status === UserStatus.ACTIVE
                  ? "Confirm Suspension"
                  : "Confirm Activation"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

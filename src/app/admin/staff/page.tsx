"use client";

import React, { useEffect, useState } from "react";
import { User, UserRole, UserStatus } from "@/types";
import { fetchAdminStaff, updateStaffRoleApi, createStaffApi } from "@/lib/api/admin";
import { formatDate } from "@/lib/formatters";
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

interface StaffItem extends User {
  status: UserStatus;
  lastActivity?: string;
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Staff Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(UserRole.CLAIM_REVIEWER);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Change Role Modal
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>(UserRole.CLAIM_REVIEWER);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const loadStaff = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminStaff();
      setStaffList(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load staff roster.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      await createStaffApi({
        fullName: newFullName,
        email: newEmail,
        phone: newPhone,
        role: newRole,
      });
      setIsCreateModalOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      await loadStaff();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create staff account.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingStaff) return;
    setIsUpdatingRole(true);
    try {
      await updateStaffRoleApi(editingStaff.id, targetRole);
      setEditingStaff(null);
      await loadStaff();
    } catch (err: any) {
      alert(err.message || "Failed to update staff role.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            ADMIN
          </span>
        );
      case UserRole.FINANCE:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            FINANCE
          </span>
        );
      case UserRole.CLAIM_REVIEWER:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
            CLAIM_REVIEWER
          </span>
        );
      default:
        return <span className="text-xs font-semibold">{role}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Staff Roster & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision staff officers, assign underwriting and financial authorization permissions
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Onboard New Staff
        </Button>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadStaff}>
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
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Staff Officer</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role Assignment</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {staffList.map((st) => (
                <tr
                  key={st.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                >
                  <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                    {st.id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {st.fullName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {st.email}
                  </td>
                  <td className="py-3 px-4">{getRoleBadge(st.role)}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      ACTIVE
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {st.lastActivity ? formatDate(st.lastActivity) : "Recent"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setEditingStaff(st);
                        setTargetRole(st.role);
                      }}
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" />
                      Change Role
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Staff Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => !isCreating && setIsCreateModalOpen(false)}
          title="Onboard New Insurance Staff"
        >
          <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
            {createError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                {createError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Le Minh Reviewer"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Staff Corporate Email *
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="officer@insurance.com"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+84 903 000 000"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assigned RBAC Role *
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              >
                <option value={UserRole.CLAIM_REVIEWER}>CLAIM_REVIEWER (Audits claims & evidence)</option>
                <option value={UserRole.FINANCE}>FINANCE (Authorizes and retries payouts)</option>
                <option value={UserRole.ADMIN}>ADMIN (Global system administration)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isCreating}
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isCreating}>
                {isCreating ? "Provisioning..." : "Complete Onboarding"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Role Modal */}
      {editingStaff && (
        <Modal
          isOpen={!!editingStaff}
          onClose={() => !isUpdatingRole && setEditingStaff(null)}
          title={`Update RBAC Privileges: ${editingStaff.fullName}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Select the target security role for <strong>{editingStaff.fullName}</strong> ({editingStaff.email}). Changes take effect immediately across all route guards and backend API authorization boundaries.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                New Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              >
                <option value={UserRole.CLAIM_REVIEWER}>CLAIM_REVIEWER</option>
                <option value={UserRole.FINANCE}>FINANCE</option>
                <option value={UserRole.ADMIN}>ADMIN</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isUpdatingRole}
                onClick={() => setEditingStaff(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isUpdatingRole}
                onClick={handleUpdateRole}
              >
                {isUpdatingRole ? "Updating Role..." : "Confirm Role Update"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

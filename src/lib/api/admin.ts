import { AuditLog, BlockchainTransaction, UserRole, UserStatus } from "@/types";

export async function fetchAdminDashboard() {
  const res = await fetch("/api/admin/dashboard", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load admin dashboard");
  }

  const json = await res.json();
  return json.data;
}

export async function fetchAdminUsers(params?: { search?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);

  const res = await fetch(`/api/admin/users?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load users");
  }

  const json = await res.json();
  return json.data;
}

export async function updateUserStatusApi(userId: string, status: UserStatus, reason?: string) {
  const res = await fetch(`/api/admin/users/${userId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update user status");
  }

  return res.json();
}

export async function fetchAdminStaff() {
  const res = await fetch("/api/admin/staff", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load staff");
  }

  const json = await res.json();
  return json.data;
}

export async function updateStaffRoleApi(staffId: string, newRole: UserRole) {
  const res = await fetch("/api/admin/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "CHANGE_ROLE", staffId, newRole }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update staff role");
  }

  return res.json();
}

export async function createStaffApi(data: { fullName: string; email: string; phone?: string; role: UserRole }) {
  const res = await fetch("/api/admin/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create staff");
  }

  return res.json();
}

export async function fetchAuditLogs(params?: { action?: string; entity?: string; search?: string }): Promise<AuditLog[]> {
  const query = new URLSearchParams();
  if (params?.action) query.set("action", params.action);
  if (params?.entity) query.set("entity", params.entity);
  if (params?.search) query.set("search", params.search);

  const res = await fetch(`/api/admin/audit-logs?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load audit logs");
  }

  const json = await res.json();
  return json.data || [];
}

export async function fetchBlockchainDashboard() {
  const res = await fetch("/api/admin/blockchain/dashboard", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load blockchain dashboard");
  }

  const json = await res.json();
  return json.data;
}

export async function fetchBlockchainTransactions(search?: string): Promise<BlockchainTransaction[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/admin/blockchain/transactions${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load transactions");
  }

  const json = await res.json();
  return json.data || [];
}

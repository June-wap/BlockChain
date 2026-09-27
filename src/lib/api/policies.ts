import { PolicyDetail } from "@/types";

export async function fetchCustomerPolicies(params?: { status?: string; search?: string }): Promise<PolicyDetail[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);

  const res = await fetch(`/api/policies?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load policies");
  }

  const json = await res.json();
  return json.data || [];
}

export async function fetchPolicyById(id: string): Promise<PolicyDetail> {
  const res = await fetch(`/api/policies/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Policy error (${res.status})`);
  }

  const json = await res.json();
  return json.data;
}

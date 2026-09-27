import { Payment } from "@/types";

export async function fetchPayments(status?: string): Promise<Payment[]> {
  const query = status && status !== "ALL" ? `?status=${status}` : "";
  const res = await fetch(`/api/payments${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load payments");
  }

  const json = await res.json();
  return json.data || [];
}

export async function disbursePaymentApi(paymentId: string) {
  const res = await fetch(`/api/payments/${paymentId}/disburse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to disburse payment");
  }

  return res.json();
}

export async function retryPaymentApi(paymentId: string) {
  const res = await fetch(`/api/payments/${paymentId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to retry payment");
  }

  return res.json();
}

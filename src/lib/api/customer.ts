import { CustomerDashboardData } from "@/server/services/dashboard.service";

/**
 * Client service layer to interact with Customer APIs
 * Never calls database directly from frontend
 */
export async function getCustomerDashboard(
  options: { empty?: boolean } = {}
): Promise<CustomerDashboardData> {
  const query = options.empty ? "?empty=true" : "";
  const res = await fetch(`/api/customer/dashboard${query}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson.error || `Failed to fetch customer dashboard (HTTP ${res.status})`
    );
  }

  const json = await res.json();
  return json.data;
}

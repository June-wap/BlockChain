import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function AdminPaymentsPage() {
  return (
    <PlaceholderPage
      title="Payments & Settlements Administration"
      subtitle="Financial reconciliations, liquidity pool reserves for smart contracts, fiat bank gateway telemetry, and dispute resolutions."
      route="/admin/payments"
      metaInfo={[
        { label: "Reserve Pool", value: "$1,500,000" },
        { label: "Settled This Month", value: "$142,800" },
        { label: "Smart Contract Payouts", value: "76%" },
        { label: "Fiat Payouts", value: "24%" },
      ]}
    />
  );
}

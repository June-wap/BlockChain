import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function AdminSettingsPage() {
  return (
    <PlaceholderPage
      title="System & Security Settings"
      subtitle="Global configuration for session timeouts, RBAC enforcement policies, automated smart contract payout thresholds, and notification webhooks."
      route="/admin/settings"
      metaInfo={[
        { label: "Environment", value: "Production / Testnet" },
        { label: "Auto-Payout Cap", value: "$5,000" },
        { label: "Session Expiry", value: "8 Hours" },
        { label: "Webhook Integrations", value: "Active" },
      ]}
    />
  );
}

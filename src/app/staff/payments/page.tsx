import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function StaffPaymentsPage() {
  return (
    <PlaceholderPage
      title="Payout Authorizations (Finance)"
      subtitle="Financial controller review queue for approved claims. Authorize fiat bank transfers or trigger smart contract payment disbursements."
      route="/staff/payments"
      metaInfo={[
        { label: "Queued for Payout", value: "3" },
        { label: "Pending Value", value: "$9,450" },
        { label: "Settled Today", value: "$28,400" },
        { label: "Disbursement Mode", value: "Smart Contract & Fiat" },
      ]}
    />
  );
}

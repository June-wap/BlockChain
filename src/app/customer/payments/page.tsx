import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function CustomerPaymentsPage() {
  return (
    <PlaceholderPage
      title="Payment & Payout History"
      subtitle="View premium receipts and approved claim disbursements via bank transfer or smart contract."
      route="/customer/payments"
      metaInfo={[
        { label: "Total Received", value: "$4,200" },
        { label: "Pending Payout", value: "$1,850" },
        { label: "Disbursement Mode", value: "Smart Contract / Fiat" },
        { label: "Payout Account", value: "Connected" },
      ]}
    />
  );
}

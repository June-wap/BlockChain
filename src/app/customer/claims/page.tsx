import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function CustomerClaimsPage() {
  return (
    <PlaceholderPage
      title="My Insurance Claims"
      subtitle="Track the real-time lifecycle of all your submitted insurance claims from submission to smart contract payout."
      route="/customer/claims"
      actionText="File New Claim"
      actionHref="/customer/claims/new"
      metaInfo={[
        { label: "Total Claims", value: "3" },
        { label: "Under Review", value: "1" },
        { label: "Payment Pending", value: "1" },
        { label: "Settled / Paid", value: "1" },
      ]}
    />
  );
}

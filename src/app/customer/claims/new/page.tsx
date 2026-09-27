import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function CustomerNewClaimPage() {
  return (
    <PlaceholderPage
      title="Submit Insurance Claim"
      subtitle="Select an eligible policy, provide incident details, and upload evidence documents (invoices, photos, medical reports)."
      route="/customer/claims/new"
      backHref="/customer/claims"
      badge="Form Module"
      metaInfo={[
        { label: "Step", value: "1 of 3" },
        { label: "Policy Selection", value: "Required" },
        { label: "Evidence Upload", value: "Required" },
        { label: "Audit Hash", value: "Automated" },
      ]}
    />
  );
}

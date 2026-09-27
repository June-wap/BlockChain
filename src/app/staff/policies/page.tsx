import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function StaffPoliciesPage() {
  return (
    <PlaceholderPage
      title="Policy Registry & Verification"
      subtitle="Search and verify customer policy terms, active coverage limits, deductibles, and validity periods."
      route="/staff/policies"
      metaInfo={[
        { label: "Active Policies", value: "1,240" },
        { label: "Underwriting Pending", value: "14" },
        { label: "Expiring in 30d", value: "38" },
        { label: "Total Exposure", value: "$42.5M" },
      ]}
    />
  );
}

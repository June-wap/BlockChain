import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function CustomerPoliciesPage() {
  return (
    <PlaceholderPage
      title="My Insurance Policies"
      subtitle="View active insurance coverages, policy terms, and renew existing plans."
      route="/customer/policies"
      actionText="Browse Available Policies"
      actionHref="/customer/policies"
      metaInfo={[
        { label: "Active Policies", value: "2" },
        { label: "Total Coverage", value: "$75,000" },
        { label: "Annual Premiums", value: "$1,450" },
        { label: "Status", value: "Fully Covered" },
      ]}
    />
  );
}

import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function AdminPoliciesPage() {
  return (
    <PlaceholderPage
      title="Master Insurance Products & Policies"
      subtitle="Define master policy templates, premium calculation formulas, coverage caps, deductible matrices, and smart contract rule definitions."
      route="/admin/policies"
      actionText="Create Policy Product"
      actionHref="/admin/policies"
      metaInfo={[
        { label: "Product Templates", value: "8" },
        { label: "Active Contracts", value: "3,410" },
        { label: "Global Coverage", value: "$128M" },
        { label: "Underwriting Mode", value: "Hybrid Automated" },
      ]}
    />
  );
}

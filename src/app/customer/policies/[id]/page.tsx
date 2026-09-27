import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function CustomerPolicyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PlaceholderPage
      title={`Policy Details #${params.id}`}
      subtitle="Comprehensive view of policy coverage terms, exclusions, premium schedule, and claim eligibility."
      route={`/customer/policies/${params.id}`}
      backHref="/customer/policies"
      actionText="File Claim Under Policy"
      actionHref="/customer/claims/new"
      metaInfo={[
        { label: "Policy ID", value: params.id },
        { label: "Coverage Limit", value: "$50,000" },
        { label: "Deductible", value: "$500" },
        { label: "Underwriting State", value: "Active" },
      ]}
    />
  );
}

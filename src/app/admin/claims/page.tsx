import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function AdminClaimsPage() {
  return (
    <PlaceholderPage
      title="Global Claims Oversight"
      subtitle="Complete view of all historical and active insurance claims across all reviewers, categories, and payment pipelines."
      route="/admin/claims"
      metaInfo={[
        { label: "Lifetime Claims", value: "482" },
        { label: "Approved Rate", value: "88.2%" },
        { label: "Rejected Rate", value: "11.8%" },
        { label: "Flagged Anomalies", value: "2" },
      ]}
    />
  );
}

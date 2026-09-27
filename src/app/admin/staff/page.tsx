import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function AdminStaffPage() {
  return (
    <PlaceholderPage
      title="Staff Management & Roster"
      subtitle="Provision and manage staff accounts, assign CLAIM_REVIEWER and FINANCE roles, monitor review performance and workload queues."
      route="/admin/staff"
      metaInfo={[
        { label: "Active Staff", value: "24" },
        { label: "Claim Reviewers", value: "18" },
        { label: "Finance Officers", value: "6" },
        { label: "Avg Resolution Rate", value: "96.4%" },
      ]}
    />
  );
}

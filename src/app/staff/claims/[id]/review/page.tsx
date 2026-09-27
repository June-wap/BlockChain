import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function StaffClaimReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PlaceholderPage
      title={`Review Claim Assessment #${params.id}`}
      subtitle="Examine policy coverage boundaries, inspect uploaded evidence files & IPFS hashes, record reviewer notes, and submit formal determination (Approve / Reject)."
      route={`/staff/claims/${params.id}/review`}
      backHref="/staff/claims"
      badge="Decision Workspace"
      metaInfo={[
        { label: "Target Claim", value: params.id },
        { label: "Requested Payout", value: "$1,850" },
        { label: "Evidence Files", value: "3 docs" },
        { label: "Action Pending", value: "Approve / Reject" },
      ]}
    />
  );
}

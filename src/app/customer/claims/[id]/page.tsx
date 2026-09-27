import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function CustomerClaimDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PlaceholderPage
      title={`Claim Details #${params.id}`}
      subtitle="Lifecycle status, uploaded evidence preview, staff assessment notes, and blockchain transaction receipt."
      route={`/customer/claims/${params.id}`}
      backHref="/customer/claims"
      metaInfo={[
        { label: "Claim ID", value: params.id },
        { label: "Current Status", value: "Under Review" },
        { label: "Requested Amount", value: "$1,850" },
        { label: "Evidence Files", value: "3 uploaded" },
      ]}
    />
  );
}

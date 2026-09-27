import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function StaffClaimsQueuePage() {
  return (
    <PlaceholderPage
      title="Claims Assessment Queue"
      subtitle="Examine submitted claims, verify evidence authenticity, coordinate fraud detection, and approve or reject."
      route="/staff/claims"
      actionText="Inspect Priority Claim"
      actionHref="/staff/claims/clm-501/review"
      metaInfo={[
        { label: "Total in Queue", value: "17" },
        { label: "Submitted", value: "12" },
        { label: "Under Review", value: "5" },
        { label: "Avg Review Time", value: "4.2 hrs" },
      ]}
    />
  );
}

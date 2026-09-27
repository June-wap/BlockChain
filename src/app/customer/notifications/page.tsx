import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function CustomerNotificationsPage() {
  return (
    <PlaceholderPage
      title="Notifications & Alerts"
      subtitle="Real-time alerts regarding claim status transitions, reviewer comments, policy renewals, and payments."
      route="/customer/notifications"
      metaInfo={[
        { label: "Unread Alerts", value: "2" },
        { label: "Claim Updates", value: "1 new" },
        { label: "Payment Confirmations", value: "1 new" },
        { label: "Channels", value: "In-App & Email" },
      ]}
    />
  );
}

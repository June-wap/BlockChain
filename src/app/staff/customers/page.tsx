import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function StaffCustomersPage() {
  return (
    <PlaceholderPage
      title="Customer Directory"
      subtitle="Lookup customer accounts, historical claims frequency, risk rating, and verified identity records."
      route="/staff/customers"
      metaInfo={[
        { label: "Total Customers", value: "852" },
        { label: "KYC Verified", value: "810" },
        { label: "Flagged Accounts", value: "3" },
        { label: "High Tier VIPs", value: "48" },
      ]}
    />
  );
}

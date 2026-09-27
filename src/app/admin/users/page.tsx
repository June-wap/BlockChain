import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function AdminUsersPage() {
  return (
    <PlaceholderPage
      title="User Management & RBAC"
      subtitle="Manage registered customer accounts, verify identity credentials, configure 2FA enforcement, and monitor account status."
      route="/admin/users"
      metaInfo={[
        { label: "Total Registered", value: "1,248" },
        { label: "Active Customers", value: "1,190" },
        { label: "Suspended", value: "8" },
        { label: "Pending KYC", value: "50" },
      ]}
    />
  );
}

import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function CustomerProfilePage() {
  return (
    <PlaceholderPage
      title="Customer Profile & KYC"
      subtitle="Manage your personal information, contact methods, identity verification (KYC), and Web3 payout wallet."
      route="/customer/profile"
      metaInfo={[
        { label: "KYC Status", value: "Verified" },
        { label: "Connected Wallet", value: "0x71C...B39a" },
        { label: "Account Tier", value: "Individual Premium" },
        { label: "2FA Security", value: "Enabled" },
      ]}
    />
  );
}

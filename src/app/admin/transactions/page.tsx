import React from "react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export default function AdminTransactionsPage() {
  return (
    <PlaceholderPage
      title="On-Chain Transactions Ledger"
      subtitle="Track claim state hashes, approval events, and smart contract automated disbursement transaction hashes."
      route="/admin/transactions"
      badge="Immutable Ledger"
      metaInfo={[
        { label: "Total On-Chain Tx", value: "894" },
        { label: "Confirmed", value: "892" },
        { label: "Pending Blocks", value: "2" },
        { label: "Avg Gas Used", value: "65,420" },
      ]}
    />
  );
}

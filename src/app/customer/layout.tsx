"use client";

import { PortalShell } from "@/components/layout/PortalShell";
import { CUSTOMER_NAV_ITEMS } from "@/lib/navigation";
import { UserRole } from "@/types";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      portalTitle="Customer Portal"
      portalSubtitle="Manage policies, submit claims & track disbursements"
      navItems={CUSTOMER_NAV_ITEMS}
      allowedRoles={[UserRole.CUSTOMER]}
    >
      {children}
    </PortalShell>
  );
}

"use client";

import { PortalShell } from "@/components/layout/PortalShell";
import { STAFF_NAV_ITEMS } from "@/lib/navigation";
import { UserRole } from "@/types";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      portalTitle="Insurance Staff Desk"
      portalSubtitle="Claim verification, policy review & payout processing"
      navItems={STAFF_NAV_ITEMS}
      allowedRoles={[UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN]}
    >
      {children}
    </PortalShell>
  );
}

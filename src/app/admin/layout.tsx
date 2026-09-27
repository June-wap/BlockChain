"use client";

import { PortalShell } from "@/components/layout/PortalShell";
import { ADMIN_NAV_ITEMS } from "@/lib/navigation";
import { UserRole } from "@/types";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalShell
      portalTitle="Admin Console"
      portalSubtitle="System administration, RBAC, smart contracts & audit trail"
      navItems={ADMIN_NAV_ITEMS}
      allowedRoles={[UserRole.ADMIN]}
    >
      {children}
    </PortalShell>
  );
}

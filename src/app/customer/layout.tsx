"use client";

import { CustomerPortalLayout } from "@/components/layout/CustomerPortalLayout";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerPortalLayout>{children}</CustomerPortalLayout>;
}

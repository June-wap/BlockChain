import { NavItem, UserRole } from "@/types";

export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/customer/dashboard",
    iconName: "LayoutDashboard",
    roles: [UserRole.CUSTOMER],
  },
  {
    title: "My Policies",
    href: "/customer/policies",
    iconName: "ShieldCheck",
    roles: [UserRole.CUSTOMER],
  },
  {
    title: "Claims",
    href: "/customer/claims",
    iconName: "FileText",
    roles: [UserRole.CUSTOMER],
  },
  {
    title: "File New Claim",
    href: "/customer/claims/new",
    iconName: "PlusCircle",
    roles: [UserRole.CUSTOMER],
  },
  {
    title: "Payments",
    href: "/customer/payments",
    iconName: "CreditCard",
    roles: [UserRole.CUSTOMER],
  },
  {
    title: "Notifications",
    href: "/customer/notifications",
    iconName: "Bell",
    roles: [UserRole.CUSTOMER],
  },
  {
    title: "Profile & KYC",
    href: "/customer/profile",
    iconName: "User",
    roles: [UserRole.CUSTOMER],
  },
];

export const STAFF_NAV_ITEMS: NavItem[] = [
  {
    title: "Staff Dashboard",
    href: "/staff/dashboard",
    iconName: "LayoutDashboard",
    roles: [UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN],
  },
  {
    title: "Claims Queue",
    href: "/staff/claims",
    iconName: "FileCheck",
    roles: [UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN],
  },
  {
    title: "Policies Review",
    href: "/staff/policies",
    iconName: "Shield",
    roles: [UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN],
  },
  {
    title: "Customers Directory",
    href: "/staff/customers",
    iconName: "Users",
    roles: [UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN],
  },
  {
    title: "Payment Payouts",
    href: "/staff/payments",
    iconName: "Coins",
    roles: [UserRole.FINANCE, UserRole.ADMIN],
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Admin Dashboard",
    href: "/admin/dashboard",
    iconName: "LayoutDashboard",
    roles: [UserRole.ADMIN],
  },
  {
    title: "User Management",
    href: "/admin/users",
    iconName: "Users",
    roles: [UserRole.ADMIN],
  },
  {
    title: "Staff Management",
    href: "/admin/staff",
    iconName: "UserCheck",
    roles: [UserRole.ADMIN],
  },
  {
    title: "Policy Products",
    href: "/admin/policies",
    iconName: "ShieldAlert",
    roles: [UserRole.ADMIN],
  },
  {
    title: "All Claims Oversight",
    href: "/admin/claims",
    iconName: "FileStack",
    roles: [UserRole.ADMIN],
  },
  {
    title: "Payments & Settlements",
    href: "/admin/payments",
    iconName: "CreditCard",
    roles: [UserRole.ADMIN],
  },
  {
    title: "Blockchain Explorer",
    href: "/admin/blockchain",
    iconName: "Cpu",
    roles: [UserRole.ADMIN],
  },
  {
    title: "Transactions Ledger",
    href: "/admin/transactions",
    iconName: "Layers",
    roles: [UserRole.ADMIN],
  },
  {
    title: "Audit Logs",
    href: "/admin/audit-logs",
    iconName: "Activity",
    roles: [UserRole.ADMIN],
  },
  {
    title: "System Settings",
    href: "/admin/settings",
    iconName: "Settings",
    roles: [UserRole.ADMIN],
  },
];

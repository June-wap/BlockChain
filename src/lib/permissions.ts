import { UserRole } from "@/types";

export interface RouteRule {
  prefix: string;
  allowedRoles: UserRole[];
  exact?: boolean;
}

export const ROUTE_PERMISSIONS: RouteRule[] = [
  {
    prefix: "/customer",
    allowedRoles: [UserRole.CUSTOMER],
  },
  {
    prefix: "/staff",
    allowedRoles: [UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN],
  },
  {
    prefix: "/admin",
    allowedRoles: [UserRole.ADMIN],
  },
];

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/unauthorized",
  "/design-system",
];

/**
 * Check if a path requires authentication
 */
export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  // Static assets and API routes handled separately
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return true;
  }
  return false;
}

/**
 * Determine if a user with a given role can access the specified pathname
 */
export function canAccessRoute(
  pathname: string,
  userRole?: UserRole | null
): { allowed: boolean; redirectUrl?: string; reason?: string } {
  // Public routes are accessible to all
  if (isPublicRoute(pathname)) {
    return { allowed: true };
  }

  // If user is not logged in
  if (!userRole) {
    return {
      allowed: false,
      redirectUrl: `/login?redirect=${encodeURIComponent(pathname)}`,
      reason: "Authentication required",
    };
  }

  // Find matching route rule
  const matchedRule = ROUTE_PERMISSIONS.find((rule) =>
    pathname.startsWith(rule.prefix)
  );

  // If no rule matches, allow by default or protect
  if (!matchedRule) {
    return { allowed: true };
  }

  // Check role authorization
  if (matchedRule.allowedRoles.includes(userRole)) {
    return { allowed: true };
  }

  // Forbidden: User is authenticated but doesn't have the required role
  const defaultDashboard = getDefaultDashboardForRole(userRole);
  return {
    allowed: false,
    redirectUrl: defaultDashboard,
    reason: `Access denied. Role ${userRole} is not permitted to access ${pathname}`,
  };
}

/**
 * Returns default landing dashboard path based on role
 */
export function getDefaultDashboardForRole(role: UserRole): string {
  switch (role) {
    case UserRole.CUSTOMER:
      return "/customer/dashboard";
    case UserRole.CLAIM_REVIEWER:
    case UserRole.FINANCE:
      return "/staff/dashboard";
    case UserRole.ADMIN:
      return "/admin/dashboard";
    default:
      return "/";
  }
}

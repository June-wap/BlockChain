import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read cookies set by auth context
  const authRole = request.cookies.get("auth_role")?.value;
  const authToken = request.cookies.get("auth_token")?.value;
  const isAuthenticated = Boolean(authToken && authRole);

  // 1. If user is already authenticated and visits login/register, redirect to dashboard
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    if (authRole === "CUSTOMER") {
      return NextResponse.redirect(new URL("/customer/dashboard", request.url));
    }
    if (authRole === "CLAIM_REVIEWER" || authRole === "FINANCE") {
      return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    }
    if (authRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  // 2. Customer portal protection
  if (pathname.startsWith("/customer")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (authRole !== "CUSTOMER") {
      // Redirect staff or admin to their respective portal
      if (authRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    }
  }

  // 3. Staff portal protection
  if (pathname.startsWith("/staff")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const staffRoles = ["CLAIM_REVIEWER", "FINANCE", "ADMIN"];
    if (!staffRoles.includes(authRole || "")) {
      // Non-staff (e.g. CUSTOMER) gets redirected to their dashboard
      return NextResponse.redirect(new URL("/customer/dashboard", request.url));
    }
  }

  // 4. Admin portal protection
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (authRole !== "ADMIN") {
      if (authRole === "CUSTOMER") {
        return NextResponse.redirect(new URL("/customer/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/customer/:path*",
    "/staff/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};

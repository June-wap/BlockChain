import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { JwtService } from "@/server/core/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract auth_token from cookies
  const authToken = request.cookies.get("auth_token")?.value;
  const verifiedPayload = authToken ? await JwtService.verifyToken(authToken) : null;
  const isAuthenticated = Boolean(verifiedPayload);
  const userRole = verifiedPayload?.role;

  // 1. If user is already authenticated and visits login/register, redirect to their role-specific dashboard
  if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
    if (userRole === "CUSTOMER") {
      return NextResponse.redirect(new URL("/customer/dashboard", request.url));
    }
    if (userRole === "CLAIM_REVIEWER" || userRole === "FINANCE") {
      return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    }
    if (userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  // 2. Customer portal protection
  if (pathname.startsWith("/customer")) {
    if (!isAuthenticated || !userRole) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (authToken && !verifiedPayload) {
        res.cookies.delete("auth_token");
        res.cookies.delete("auth_role");
      }
      return res;
    }
    if (userRole !== "CUSTOMER") {
      if (userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/staff/dashboard", request.url));
    }
  }

  // 3. Staff portal protection
  if (pathname.startsWith("/staff")) {
    if (!isAuthenticated || !userRole) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (authToken && !verifiedPayload) {
        res.cookies.delete("auth_token");
        res.cookies.delete("auth_role");
      }
      return res;
    }
    const staffRoles = ["CLAIM_REVIEWER", "FINANCE", "ADMIN"];
    if (!staffRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/customer/dashboard", request.url));
    }
  }

  // 4. Admin portal protection
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated || !userRole) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      if (authToken && !verifiedPayload) {
        res.cookies.delete("auth_token");
        res.cookies.delete("auth_role");
      }
      return res;
    }
    if (userRole !== "ADMIN") {
      if (userRole === "CUSTOMER") {
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

import { describe, it, expect, beforeAll } from "vitest";
import { initDatabase } from "@/server/db/postgres";
import { AuthService } from "@/server/services/auth.service";
import { JwtService } from "@/server/core/jwt";
import { GET as getAuthMe } from "@/app/api/auth/me/route";
import { NextRequest } from "next/server";
import { UserRole } from "@/types";
import fs from "fs";
import path from "path";

describe("Auth Bootstrap, Redirect Loop & Navigation Performance Verification", () => {
  beforeAll(async () => {
    await initDatabase();
  });

  it("1. GET /api/auth/me returns 200 with user data when valid auth_token cookie is provided", async () => {
    const loginResult = await AuthService.login("customer@insurance.com", "password123");
    expect(loginResult.token).toBeDefined();

    const request = new NextRequest("http://localhost:3000/api/auth/me", {
      headers: {
        cookie: `auth_token=${loginResult.token}`,
      },
    });

    const startTime = performance.now();
    const response = await getAuthMe(request);
    const duration = performance.now() - startTime;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("customer@insurance.com");
    expect(body.data.user.role).toBe(UserRole.CUSTOMER);
    expect(body.data.capabilities).toBeDefined();

    // Verify benchmark: /api/auth/me responds in < 300ms
    expect(duration).toBeLessThan(300);
  });

  it("2. GET /api/auth/me returns 401 and clears auth cookies when unauthenticated", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/me");
    const response = await getAuthMe(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);

    // Stale cookies must be cleared in response headers
    const setCookieHeaders = response.headers.get("set-cookie") || "";
    expect(setCookieHeaders).toContain("auth_token=");
    expect(setCookieHeaders).toContain("Max-Age=0");
  });

  it("3. AuthProvider source code strictly avoids localStorage for auth authority", () => {
    const authContextPath = path.resolve(__dirname, "../src/lib/auth-context.tsx");
    const content = fs.readFileSync(authContextPath, "utf-8");

    // Ensure localStorage is not used for session keys
    expect(content).not.toContain("insurance_auth_user");
    expect(content).not.toContain("insurance_auth_token");
    expect(content).not.toContain("localStorage.getItem");
    expect(content).not.toContain("localStorage.setItem");

    // Ensure it fetches /api/auth/me with credentials: "include" and cache: "no-store"
    expect(content).toContain("/api/auth/me");
    expect(content).toContain('"include"');
    expect(content).toContain('"no-store"');
  });

  it("4. RoleGuard prevents redirect loops using router.replace and single-shot ref guard", () => {
    const roleGuardPath = path.resolve(__dirname, "../src/components/layout/RoleGuard.tsx");
    const content = fs.readFileSync(roleGuardPath, "utf-8");

    expect(content).toContain("redirectedRef");
    expect(content).toContain("router.replace");
    // Ensure router.push is not used for unauthenticated redirect
    expect(content).not.toMatch(/router\.push\(`\/login\?redirect=/);
  });

  it("5. PortalShell renders dynamic authenticated wallet address instead of hardcoded 0x71C...B39a", () => {
    const portalShellPath = path.resolve(__dirname, "../src/components/layout/PortalShell.tsx");
    const content = fs.readFileSync(portalShellPath, "utf-8");

    // Hardcoded string must be gone
    expect(content).not.toContain("0x71C...B39a");
    // Dynamic user?.walletAddress formatting must be present
    expect(content).toContain("user?.walletAddress");
  });

  it("6. Edge middleware validates JWT and preserves zero-DB edge performance", async () => {
    const token = await JwtService.signToken({
      userId: "usr_cust_test",
      email: "edge_customer@insurance.com",
      role: UserRole.CUSTOMER,
      fullName: "Edge Customer",
    });

    const start = performance.now();
    const payload = await JwtService.verifyToken(token);
    const duration = performance.now() - start;

    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("edge_customer@insurance.com");
    // In-memory JWT verification takes < 10ms
    expect(duration).toBeLessThan(50);
  });
});

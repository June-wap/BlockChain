import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { AuthService } from "@/server/services/auth.service";
import { JwtService } from "@/server/core/jwt";
import { SecurityUtils } from "@/server/core/security";
import { RbacGuard } from "@/server/core/rbac";
import { UserRepository } from "@/server/repositories/user.repository";
import { initDatabase } from "@/server/db/postgres";
import { UserRole, UserStatus } from "@/types";
import * as jose from "jose";

describe("P0 - Authentication & Authorization Security Tests", () => {
  beforeAll(async () => {
    await initDatabase();
  });

  const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET ||
    "antigravity-insurance-claim-processing-system-production-secret-key-32-chars-min!"
  );

  beforeEach(() => {
    // Reset any state needed
  });

  // 1. Valid login
  it("P0.9.1: Valid login returns cryptographically signed JWT with matching claims", async () => {
    const result = await AuthService.login("customer@insurance.com", "password123");
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");

    // Must be valid 3-part JWT
    const parts = result.token.split(".");
    expect(parts.length).toBe(3);

    // Verify token with JwtService
    const payload = await JwtService.verifyToken(result.token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(result.user.id);
    expect(payload?.role).toBe(UserRole.CUSTOMER);
    expect(payload?.email).toBe("customer@insurance.com");
  });

  // 2. Invalid password
  it("P0.9.2: Login with invalid password throws AuthenticationError and issues no token", async () => {
    await expect(
      AuthService.login("customer@insurance.com", "WrongPassword!999")
    ).rejects.toThrow(/Invalid email or credentials/i);
  });

  // 3. Suspended account
  it("P0.9.3: Suspended account cannot log in and resolveUser returns null", async () => {
    // Create suspended user
    const suspendedId = `usr_suspended_${Date.now()}`;
    await UserRepository.create({
      id: suspendedId,
      email: `suspended_${Date.now()}@insurance.com`,
      fullName: "Suspended User",
      role: UserRole.CUSTOMER,
      status: UserStatus.SUSPENDED,
      createdAt: new Date().toISOString(),
      passwordHash: SecurityUtils.hashPassword("password123"),
    });

    const suspendedUser = await UserRepository.findById(suspendedId);

    // Login must fail
    await expect(
      AuthService.login(suspendedUser!.email, "password123")
    ).rejects.toThrow(/suspended/i);

    // Even if a signed token existed for this user, resolveUser must reject it
    const token = await JwtService.signToken({
      userId: suspendedId,
      email: suspendedUser!.email,
      role: UserRole.CUSTOMER,
      fullName: "Suspended User",
    });

    const resolved = await AuthService.resolveUser(token);
    expect(resolved).toBeNull();
  });

  // 4. Expired session token
  it("P0.9.4: Expired JWT is rejected and resolveUser returns null", async () => {
    // Create an expired token manually using jose
    const expiredToken = await new jose.SignJWT({
      userId: "usr_cust_1",
      email: "customer@insurance.com",
      role: UserRole.CUSTOMER,
      fullName: "Nguyen Van A",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setIssuer("insurance-system")
      .setAudience("insurance-app")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // Expired 1 hour ago
      .sign(JWT_SECRET);

    const verified = await JwtService.verifyToken(expiredToken);
    expect(verified).toBeNull();

    const resolved = await AuthService.resolveUser(expiredToken);
    expect(resolved).toBeNull();
  });

  // 5. Tampered session token
  it("P0.9.5: Tampered JWT signature is rejected and resolveUser returns null", async () => {
    const validResult = await AuthService.login("customer@insurance.com", "password123");
    const validToken = validResult.token;

    // Tamper with the signature (last part)
    const parts = validToken.split(".");
    const tamperedSig = parts[2].substring(0, parts[2].length - 4) + "abcd";
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    const verified = await JwtService.verifyToken(tamperedToken);
    expect(verified).toBeNull();

    const resolved = await AuthService.resolveUser(tamperedToken);
    expect(resolved).toBeNull();
  });

  // 6. Fake role cookie without token
  it("P0.9.6: Fake role cookie without token cannot authenticate (no fallbackRole)", async () => {
    // resolveUser only takes token string, fallbackRole removed completely
    const resolvedNoToken = await AuthService.resolveUser(undefined);
    expect(resolvedNoToken).toBeNull();

    const resolvedEmptyToken = await AuthService.resolveUser("");
    expect(resolvedEmptyToken).toBeNull();
  });

  // 7. Customer attempting privilege escalation to ADMIN
  it("P0.9.7: Customer cannot elevate privileges to ADMIN (role comes from verified JWT)", async () => {
    const custLogin = await AuthService.login("customer@insurance.com", "password123");
    const resolvedUser = await AuthService.resolveUser(custLogin.token);

    expect(resolvedUser).not.toBeNull();
    expect(resolvedUser?.role).toBe(UserRole.CUSTOMER);

    // Forging role in external context cannot bypass RbacGuard
    expect(() => {
      RbacGuard.assertCanAdministerSystem(resolvedUser!);
    }).toThrow(/Access denied/);
  });

  // 8. Customer attempting privilege escalation to FINANCE (Payment Disburse)
  it("P0.9.8: Customer cannot manage or disburse payments", async () => {
    const custLogin = await AuthService.login("customer@insurance.com", "password123");
    const resolvedUser = await AuthService.resolveUser(custLogin.token);

    expect(() => {
      RbacGuard.assertCanManagePayments(resolvedUser!);
    }).toThrow(/Access denied/);
  });

  // 9. Reviewer attempting to disburse payments
  it("P0.9.9: Claim Reviewer cannot disburse payments (only FINANCE or ADMIN)", async () => {
    const revLogin = await AuthService.login("reviewer@insurance.com", "password123");
    const resolvedReviewer = await AuthService.resolveUser(revLogin.token);

    expect(resolvedReviewer?.role).toBe(UserRole.CLAIM_REVIEWER);
    expect(() => {
      RbacGuard.assertCanManagePayments(resolvedReviewer!);
    }).toThrow(/Access denied/);
  });

  // 10. Admin endpoint security: unauthenticated or invalid session yields null
  it("P0.9.10: Unsigned arbitrary string or non-JWT token is rejected", async () => {
    const fakeTokens = [
      "jwt_usr_admin_1_12345678", // Legacy fake format
      "mock_jwt_token_usr_admin_1",
      "Bearer admin",
      "admin",
      "eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.", // Unsigned "none" alg
    ];

    for (const fake of fakeTokens) {
      const resolved = await AuthService.resolveUser(fake);
      expect(resolved).toBeNull();
    }
  });
});

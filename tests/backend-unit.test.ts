import { describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "@/server/services/auth.service";
import { ClaimService } from "@/server/services/claim.service";
import { PolicyService } from "@/server/services/policy.service";
import { BlockchainService } from "@/server/services/blockchain.service";
import { SecurityUtils } from "@/server/core/security";
import { ClaimLifecycleEngine } from "@/server/core/lifecycle";
import { RbacGuard } from "@/server/core/rbac";
import { db } from "@/server/db/store";
import { ClaimStatus, PaymentStatus, PolicyStatus, UserRole } from "@/types";

describe("Backend Unit Tests (BE-34)", () => {
  beforeEach(() => {
    // Clean slate or reset rate limiters
  });

  describe("Security & Cryptography (BE-01, BE-03)", () => {
    it("should hash and verify passwords using PBKDF2 with unique salts", () => {
      const password = "SuperSecretPassword123!";
      const hash1 = SecurityUtils.hashPassword(password);
      const hash2 = SecurityUtils.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
      expect(SecurityUtils.verifyPassword(password, hash1)).toBe(true);
      expect(SecurityUtils.verifyPassword("WrongPassword", hash1)).toBe(false);
    });

    it("should sanitize malicious filenames preventing directory traversal", () => {
      const dangerous1 = "../../../etc/passwd";
      const dangerous2 = "malicious\0file.php.jpg";
      const dangerous3 = "..\\..\\windows\\system32\\cmd.exe";

      expect(SecurityUtils.sanitizeFilename(dangerous1)).toBe("passwd");
      expect(SecurityUtils.sanitizeFilename(dangerous2)).not.toContain("\0");
      expect(SecurityUtils.sanitizeFilename(dangerous3)).toBe("cmd.exe");
    });

    it("should sanitize sensitive keys from metadata objects", () => {
      const raw = {
        claimId: "clm-101",
        password: "secretpassword",
        jwt: "eyJhbGciOi...",
        privateKey: "0x123456...",
        user: {
          email: "test@example.com",
          passwordHash: "pbkdf2$...",
        },
      };

      const sanitized = SecurityUtils.sanitizeMetadata(raw) as any;
      expect(sanitized.claimId).toBe("clm-101");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.jwt).toBe("[REDACTED]");
      expect(sanitized.privateKey).toBe("[REDACTED]");
      expect(sanitized.user.passwordHash).toBe("[REDACTED]");
      expect(sanitized.user.email).toBe("test@example.com");
    });
  });

  describe("Authentication & RBAC Rules (BE-03, BE-04)", () => {
    it("should strictly enforce that register ONLY creates CUSTOMER accounts", async () => {
      const uniqueEmail = `test_customer_${Date.now()}@example.com`;
      const result = await AuthService.register({
        fullName: "Test Customer",
        email: uniqueEmail,
        password: "Password123!",
      });

      expect(result.user.role).toBe(UserRole.CUSTOMER);
      expect(result.token).toBeDefined();
    });

    it("should block login when user account is suspended", async () => {
      const suspendedUser = Array.from(db.getUsers().values()).find((u) => u.email === "customer@example.com");
      if (suspendedUser) {
        suspendedUser.status = "SUSPENDED" as any;
      }

      await expect(
        AuthService.login("customer@example.com", "password123")
      ).rejects.toThrow(/suspended/i);

      // Revert status
      if (suspendedUser) {
        suspendedUser.status = "ACTIVE" as any;
      }
    });

    it("should enforce RBAC guard role assertions", () => {
      const customer = { id: "c1", email: "c@e.com", name: "C", role: UserRole.CUSTOMER };
      const reviewer = { id: "r1", email: "r@e.com", name: "R", role: UserRole.CLAIM_REVIEWER };

      expect(() => RbacGuard.assertRole(customer, [UserRole.CUSTOMER])).not.toThrow();
      expect(() => RbacGuard.assertRole(customer, [UserRole.ADMIN])).toThrow(/Access denied/);
      expect(() => RbacGuard.assertRole(reviewer, [UserRole.CLAIM_REVIEWER, UserRole.ADMIN])).not.toThrow();
    });
  });

  describe("Claim Lifecycle Engine (BE-09)", () => {
    it("should allow valid state transitions", () => {
      expect(() =>
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW)
      ).not.toThrow();

      expect(() =>
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED)
      ).not.toThrow();

      expect(() =>
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.APPROVED, ClaimStatus.PAYMENT_PENDING)
      ).not.toThrow();

      expect(() =>
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.PAYMENT_PENDING, ClaimStatus.PAID)
      ).not.toThrow();
    });

    it("should strictly reject invalid lifecycle state transitions", () => {
      // Cannot jump from REJECTED to PAID
      expect(() =>
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.REJECTED, ClaimStatus.PAID)
      ).toThrow(/Invalid claim state transition/);

      // Cannot jump from PAID back to APPROVED
      expect(() =>
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.PAID, ClaimStatus.APPROVED)
      ).toThrow(/Invalid claim state transition/);

      // Cannot jump directly from SUBMITTED to PAID
      expect(() =>
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.SUBMITTED, ClaimStatus.PAID)
      ).toThrow(/Invalid claim state transition/);
    });

    it("should reject concurrent conflicting version mutations", () => {
      const currentVersion = 2;
      const expectedVersion = 1;

      expect(() =>
        ClaimLifecycleEngine.assertVersionMatch(currentVersion, expectedVersion)
      ).toThrow(/Concurrency conflict/);

      expect(() =>
        ClaimLifecycleEngine.assertVersionMatch(2, 2)
      ).not.toThrow();
    });
  });

  describe("Claim Creation & Business Rules (BE-06, BE-07)", () => {
    it("should reject claim when requested amount exceeds policy coverage", async () => {
      await expect(
        ClaimService.submitClaim("usr_customer_default", "Nguyen Van A", {
          policyId: "pol-101", // Coverage: 50,000
          incidentDate: "2026-06-15",
          incidentType: "Medical",
          location: "Hospital",
          requestedAmount: 999999, // Exceeds 50,000
          description: "Major surgery exceeding all policy coverage limits.",
        })
      ).rejects.toThrow(/exceeds the maximum policy coverage limit/);
    });

    it("should reject claim when incident date is in the future", async () => {
      const futureDate = "2029-01-01";
      await expect(
        ClaimService.submitClaim("usr_customer_default", "Nguyen Van A", {
          policyId: "pol-101",
          incidentDate: futureDate,
          incidentType: "Medical",
          location: "Clinic",
          requestedAmount: 500,
          description: "Routine scheduled examination in future.",
        })
      ).rejects.toThrow(/future/i);
    });

    it("should reject claim when policy is not ACTIVE", async () => {
      // pol-103 is EXPIRED
      await expect(
        ClaimService.submitClaim("usr_customer_default", "Nguyen Van A", {
          policyId: "pol-103",
          incidentDate: "2026-01-01",
          incidentType: "Fire",
          location: "Home",
          requestedAmount: 1000,
          description: "Residential fire damage claim under expired policy.",
        })
      ).rejects.toThrow(/Only ACTIVE policies are eligible/);
    });
  });

  describe("Blockchain Service & Payment Safeguards (BE-15, BE-27)", () => {
    it("should prevent double payouts for the same claim", async () => {
      const paymentId = `pay-test-${Date.now()}`;
      const claimId = `clm-double-${Date.now()}`;

      // First disbursement succeeds
      const first = await BlockchainService.recordPaymentDisbursement(
        paymentId,
        claimId,
        1000,
        "0x71C8366453AB548A31D08f237B855D282126B39a"
      );
      expect(first.status).toBe("CONFIRMED");

      // Second disbursement attempt on the same claim must be blocked
      await expect(
        BlockchainService.recordPaymentDisbursement(
          `pay-second-${Date.now()}`,
          claimId,
          1000,
          "0x71C8366453AB548A31D08f237B855D282126B39a"
        )
      ).rejects.toThrow(/Double-payment prevented/);
    });
  });
});

import { describe, it, expect } from "vitest";
import { PolicyService } from "@/server/services/policy.service";
import { ClaimService } from "@/server/services/claim.service";
import { RbacGuard } from "@/server/core/rbac";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

describe("Backend Integration & Security Tests (BE-35)", () => {
  const customerA = {
    id: "usr_customer_default",
    name: "Nguyen Van A",
    email: "customer@example.com",
    role: UserRole.CUSTOMER,
  };

  const customerB = {
    id: "usr_customer_2",
    name: "Tran Thi B",
    email: "customer2@example.com",
    role: UserRole.CUSTOMER,
  };

  const reviewer = {
    id: "usr_reviewer_1",
    name: "Le Minh Reviewer",
    email: "reviewer@insurance.com",
    role: UserRole.CLAIM_REVIEWER,
  };

  const finance = {
    id: "usr_finance_1",
    name: "Pham Thi Finance",
    email: "finance@insurance.com",
    role: UserRole.FINANCE,
  };

  const admin = {
    id: "usr_admin_1",
    name: "Admin Hoang Vu",
    email: "admin@insurance.com",
    role: UserRole.ADMIN,
  };

  describe("IDOR Protection (BE-04)", () => {
    it("should prevent Customer A from viewing Customer B's policy", () => {
      // pol-104 belongs to customerB (usr_customer_2)
      const result = PolicyService.getPolicyById("pol-104", customerA);
      expect(result.status).toBe(403);
      expect(result.error).toContain("Forbidden");
    });

    it("should allow Customer B to view their own policy", () => {
      const result = PolicyService.getPolicyById("pol-104", customerB);
      expect(result.status).toBe(200);
      expect(result.policy?.id).toBe("pol-104");
    });

    it("should prevent Customer A from viewing Customer B's claim", () => {
      // clm-506 belongs to customerB (usr_customer_2)
      const result = ClaimService.getClaimById("clm-506", customerA);
      expect(result.status).toBe(403);
      expect(result.error).toContain("Forbidden");
    });

    it("should prevent Customer A from submitting a claim against Customer B's policy", async () => {
      await expect(
        ClaimService.submitClaim(customerA.id, customerA.name, {
          policyId: "pol-104", // Owned by Customer B
          incidentDate: "2026-04-10",
          incidentType: "Auto Collision",
          location: "Hanoi Highway",
          requestedAmount: 1200,
          description: "Collision attempt under unauthorized policy.",
        })
      ).rejects.toThrow(/You do not own this insurance policy/);
    });

    it("should enforce ownership asserting helper RbacGuard.assertOwnership", () => {
      expect(() =>
        RbacGuard.assertOwnership(customerB.id, customerA as any)
      ).toThrow(/Forbidden/);

      expect(() =>
        RbacGuard.assertOwnership(customerA.id, customerA as any)
      ).not.toThrow();

      // Staff and Admin are permitted
      expect(() =>
        RbacGuard.assertOwnership(customerB.id, reviewer as any)
      ).not.toThrow();
      expect(() =>
        RbacGuard.assertOwnership(customerB.id, admin as any)
      ).not.toThrow();
    });
  });

  describe("RBAC Role Scoping (BE-04, BE-10, BE-16)", () => {
    it("should block Reviewer from administering system/staff", () => {
      expect(() =>
        RbacGuard.assertCanAdministerSystem(reviewer as any)
      ).toThrow(/Access denied/);
    });

    it("should block Finance from approving or rejecting claims", async () => {
      await expect(
        ClaimService.approveClaim("clm-501", finance as any, 1000)
      ).rejects.toThrow(/Forbidden/);

      await expect(
        ClaimService.rejectClaim("clm-501", finance as any, "Reason")
      ).rejects.toThrow(/Forbidden/);
    });

    it("should block Customer from disbursing payments", () => {
      expect(() =>
        RbacGuard.assertCanManagePayments(customerA as any)
      ).toThrow(/Access denied/);
    });

    it("should allow Finance and Admin to manage payments", () => {
      expect(() =>
        RbacGuard.assertCanManagePayments(finance as any)
      ).not.toThrow();
      expect(() =>
        RbacGuard.assertCanManagePayments(admin as any)
      ).not.toThrow();
    });
  });

  describe("Idempotency & Concurrency (BE-12, BE-14, BE-15)", () => {
    it("should handle duplicate approval requests idempotently without double-creation", async () => {
      const claim = await ClaimService.submitClaim(customerA.id, customerA.name, {
        policyId: "pol-101",
        incidentDate: "2026-07-01",
        incidentType: "Medical",
        location: "Clinic",
        requestedAmount: 800,
        description: "Standard outpatient consultation and medication.",
      });

      const firstApproval = await ClaimService.approveClaim(
        claim.claim.id,
        reviewer as any,
        800,
        "Verified bills",
        "idem_test_key_1"
      );

      // Second identical approval returns existing result safely
      const secondApproval = await ClaimService.approveClaim(
        claim.claim.id,
        reviewer as any,
        800,
        "Verified bills",
        "idem_test_key_1"
      );

      expect(secondApproval.claim.id).toBe(firstApproval.claim.id);
      expect(secondApproval.txHash).toBe(firstApproval.txHash);
    });
  });
});

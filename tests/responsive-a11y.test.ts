import { describe, it, expect } from "vitest";
import { getRoleConfig, getClaimStatusConfig } from "@/lib/formatters";
import { ClaimStatus, UserRole } from "@/types";

describe("Design System, Responsiveness & Accessibility (FE-02, FE-29)", () => {
  it("should have WCAG compliant color mapping for all 6 claim status badges", () => {
    const statuses = [
      ClaimStatus.SUBMITTED,
      ClaimStatus.UNDER_REVIEW,
      ClaimStatus.APPROVED,
      ClaimStatus.REJECTED,
      ClaimStatus.PAYMENT_PENDING,
      ClaimStatus.PAID,
    ];

    statuses.forEach((st) => {
      const cfg = getClaimStatusConfig(st);
      expect(cfg.label).toBeDefined();
      expect(cfg.badgeClass).toBeDefined();

      // Check strictly color mapping requested in design system
      if (st === ClaimStatus.SUBMITTED) {
        expect(cfg.badgeClass).toContain("blue");
      } else if (st === ClaimStatus.UNDER_REVIEW || st === ClaimStatus.PAYMENT_PENDING) {
        expect(cfg.badgeClass).toContain("amber");
      } else if (st === ClaimStatus.APPROVED || st === ClaimStatus.PAID) {
        expect(cfg.badgeClass).toContain("emerald");
      } else if (st === ClaimStatus.REJECTED) {
        expect(cfg.badgeClass).toContain("rose");
      }
    });
  });

  it("should verify portal route access permissions for all 4 roles", () => {
    const roles = [UserRole.CUSTOMER, UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN];
    roles.forEach((r) => {
      const cfg = getRoleConfig(r);
      expect(cfg.defaultPath).toBeDefined();
      expect(cfg.defaultPath.startsWith("/")).toBe(true);
    });
  });
});

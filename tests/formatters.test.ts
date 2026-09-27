import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getClaimStatusConfig,
  getPolicyStatusConfig,
  getPaymentStatusConfig,
  getRoleConfig,
} from "../src/lib/formatters";
import { ClaimStatus, PolicyStatus, PaymentStatus, UserRole } from "../src/types";

describe("Formatting Utilities", () => {
  describe("formatCurrency", () => {
    it("formats USD currency by default", () => {
      const result = formatCurrency(1250);
      expect(result).toContain("$1,250.00");
    });

    it("formats ETH currency correctly", () => {
      const result = formatCurrency(2.5, "ETH");
      expect(result).toBe("2.50 ETH");
    });

    it("formats USDC currency correctly", () => {
      const result = formatCurrency(1500, "USDC");
      expect(result).toBe("1,500.00 USDC");
    });

    it("handles zero and invalid amounts gracefully", () => {
      expect(formatCurrency(0)).toContain("$0.00");
      expect(formatCurrency(NaN)).toBe("0");
    });
  });

  describe("formatDate", () => {
    it("formats standard ISO string date", () => {
      const result = formatDate("2026-09-27T10:00:00Z");
      expect(result).toBeTruthy();
      expect(result).not.toBe("N/A");
      expect(result).not.toBe("Invalid date");
    });

    it("returns N/A for null or undefined dates", () => {
      expect(formatDate(null)).toBe("N/A");
      expect(formatDate(undefined)).toBe("N/A");
    });

    it("returns Invalid date for malformed strings", () => {
      expect(formatDate("not-a-date")).toBe("Invalid date");
    });

    it("includes time when includeTime option is true", () => {
      const result = formatDate("2026-09-27T10:30:00Z", { includeTime: true });
      expect(result).toBeTruthy();
      expect(result).toContain("2026");
    });
  });

  describe("formatRelativeTime", () => {
    it("formats relative time for just now", () => {
      const now = new Date();
      expect(formatRelativeTime(now.toISOString())).toBe("just now");
    });

    it("handles null or undefined input", () => {
      expect(formatRelativeTime(null)).toBe("N/A");
    });
  });

  describe("getClaimStatusConfig", () => {
    it("returns correct configuration for each claim status", () => {
      expect(getClaimStatusConfig(ClaimStatus.SUBMITTED).label).toBe("Submitted");
      expect(getClaimStatusConfig(ClaimStatus.UNDER_REVIEW).label).toBe("Under Review");
      expect(getClaimStatusConfig(ClaimStatus.APPROVED).label).toBe("Approved");
      expect(getClaimStatusConfig(ClaimStatus.REJECTED).label).toBe("Rejected");
      expect(getClaimStatusConfig(ClaimStatus.PAYMENT_PENDING).label).toBe("Payment Pending");
      expect(getClaimStatusConfig(ClaimStatus.PAID).label).toBe("Paid");
    });
  });

  describe("getPolicyStatusConfig", () => {
    it("returns correct configuration for each policy status", () => {
      expect(getPolicyStatusConfig(PolicyStatus.ACTIVE).label).toBe("Active");
      expect(getPolicyStatusConfig(PolicyStatus.PENDING).label).toBe("Pending");
      expect(getPolicyStatusConfig(PolicyStatus.EXPIRED).label).toBe("Expired");
      expect(getPolicyStatusConfig(PolicyStatus.CANCELLED).label).toBe("Cancelled");
      expect(getPolicyStatusConfig(PolicyStatus.SUSPENDED).label).toBe("Suspended");
    });
  });

  describe("getPaymentStatusConfig", () => {
    it("returns correct configuration for each payment status", () => {
      expect(getPaymentStatusConfig(PaymentStatus.PENDING).label).toBe("Pending");
      expect(getPaymentStatusConfig(PaymentStatus.PROCESSING).label).toBe("Processing");
      expect(getPaymentStatusConfig(PaymentStatus.SUCCESS).label).toBe("Success");
      expect(getPaymentStatusConfig(PaymentStatus.FAILED).label).toBe("Failed");
      expect(getPaymentStatusConfig(PaymentStatus.REJECTED).label).toBe("Rejected");
    });
  });

  describe("getRoleConfig", () => {
    it("returns proper labels and default paths for all roles", () => {
      expect(getRoleConfig(UserRole.CUSTOMER).defaultPath).toBe("/customer/dashboard");
      expect(getRoleConfig(UserRole.CLAIM_REVIEWER).defaultPath).toBe("/staff/dashboard");
      expect(getRoleConfig(UserRole.FINANCE).defaultPath).toBe("/staff/dashboard");
      expect(getRoleConfig(UserRole.ADMIN).defaultPath).toBe("/admin/dashboard");
    });
  });
});

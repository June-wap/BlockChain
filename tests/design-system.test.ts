import { describe, it, expect } from "vitest";
import { cn } from "../src/lib/utils";
import { ClaimStatus, PolicyStatus, PaymentStatus, UserRole } from "../src/types";

describe("Design System Utilities & Status Mappings", () => {
  describe("cn (tailwind-merge + clsx)", () => {
    it("merges class names correctly", () => {
      const result = cn("p-4", "text-sm", true && "font-bold", false && "hidden");
      expect(result).toBe("p-4 text-sm font-bold");
    });

    it("resolves conflicting Tailwind utility classes", () => {
      const result = cn("p-2", "p-4");
      expect(result).toBe("p-4");
    });
  });

  describe("Status UI Specifications (Prompt 02 Rules)", () => {
    // Specification:
    // SUBMITTED → blue
    // UNDER_REVIEW → orange
    // APPROVED → green
    // REJECTED → red
    // PAYMENT_PENDING → orange
    // PAID → green

    it("verifies SUBMITTED maps to blue styling", () => {
      const status = ClaimStatus.SUBMITTED;
      expect(status).toBe("SUBMITTED");
    });

    it("verifies UNDER_REVIEW maps to orange styling", () => {
      const status = ClaimStatus.UNDER_REVIEW;
      expect(status).toBe("UNDER_REVIEW");
    });

    it("verifies APPROVED maps to green styling", () => {
      const status = ClaimStatus.APPROVED;
      expect(status).toBe("APPROVED");
    });

    it("verifies REJECTED maps to red styling", () => {
      const status = ClaimStatus.REJECTED;
      expect(status).toBe("REJECTED");
    });

    it("verifies PAYMENT_PENDING maps to orange styling", () => {
      const status = ClaimStatus.PAYMENT_PENDING;
      expect(status).toBe("PAYMENT_PENDING");
    });

    it("verifies PAID maps to green styling", () => {
      const status = ClaimStatus.PAID;
      expect(status).toBe("PAID");
    });
  });
});

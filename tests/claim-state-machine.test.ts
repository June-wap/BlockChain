import { describe, it, expect } from "vitest";
import { ClaimLifecycleEngine } from "@/server/core/lifecycle";
import { BusinessRuleError } from "@/server/core/errors";
import { ClaimStatus } from "@/types";

describe("P3 — Claim State Machine Hardening & Transition Matrix", () => {
  describe("Valid Lifecycle Transitions", () => {
    it("allows SUBMITTED -> UNDER_REVIEW", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW);
      }).not.toThrow();
    });

    it("allows UNDER_REVIEW -> APPROVED", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED);
      }).not.toThrow();
    });

    it("allows UNDER_REVIEW -> REJECTED", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.UNDER_REVIEW, ClaimStatus.REJECTED);
      }).not.toThrow();
    });

    it("allows APPROVED -> PAYMENT_PENDING", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.APPROVED, ClaimStatus.PAYMENT_PENDING);
      }).not.toThrow();
    });

    it("allows PAYMENT_PENDING -> PAID", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.PAYMENT_PENDING, ClaimStatus.PAID);
      }).not.toThrow();
    });

    it("allows idempotent self-transitions (no-op)", () => {
      for (const status of Object.values(ClaimStatus)) {
        expect(() => {
          ClaimLifecycleEngine.assertValidClaimTransition(status, status);
        }).not.toThrow();
      }
    });
  });

  describe("Invalid & Disallowed Transitions Matrix", () => {
    it("BLOCKS SUBMITTED -> APPROVED (must undergo review first)", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.SUBMITTED, ClaimStatus.APPROVED);
      }).toThrow(BusinessRuleError);
    });

    it("BLOCKS SUBMITTED -> REJECTED (must undergo review first)", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.SUBMITTED, ClaimStatus.REJECTED);
      }).toThrow(BusinessRuleError);
    });

    it("BLOCKS SUBMITTED -> PAID", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.SUBMITTED, ClaimStatus.PAID);
      }).toThrow(BusinessRuleError);
    });

    it("BLOCKS UNDER_REVIEW -> PAID directly without approval and payment pending", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.UNDER_REVIEW, ClaimStatus.PAID);
      }).toThrow(BusinessRuleError);
    });

    it("BLOCKS UNDER_REVIEW -> SUBMITTED (backward rewind prohibited)", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.UNDER_REVIEW, ClaimStatus.SUBMITTED);
      }).toThrow(BusinessRuleError);
    });

    it("BLOCKS APPROVED -> REJECTED", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.APPROVED, ClaimStatus.REJECTED);
      }).toThrow(BusinessRuleError);
    });

    it("BLOCKS APPROVED -> PAID directly (must transition through PAYMENT_PENDING)", () => {
      expect(() => {
        ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.APPROVED, ClaimStatus.PAID);
      }).toThrow(BusinessRuleError);
    });

    it("BLOCKS REJECTED -> any other state (REJECTED is terminal)", () => {
      const targets = [
        ClaimStatus.SUBMITTED,
        ClaimStatus.UNDER_REVIEW,
        ClaimStatus.APPROVED,
        ClaimStatus.PAYMENT_PENDING,
        ClaimStatus.PAID,
      ];
      for (const target of targets) {
        expect(() => {
          ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.REJECTED, target);
        }).toThrow(BusinessRuleError);
      }
    });

    it("BLOCKS PAID -> any other state (PAID is terminal)", () => {
      const targets = [
        ClaimStatus.SUBMITTED,
        ClaimStatus.UNDER_REVIEW,
        ClaimStatus.APPROVED,
        ClaimStatus.REJECTED,
        ClaimStatus.PAYMENT_PENDING,
      ];
      for (const target of targets) {
        expect(() => {
          ClaimLifecycleEngine.assertValidClaimTransition(ClaimStatus.PAID, target);
        }).toThrow(BusinessRuleError);
      }
    });
  });
});

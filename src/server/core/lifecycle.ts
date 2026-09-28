import { ClaimStatus, PaymentStatus } from "@/types";
import { BusinessRuleError, ConflictError } from "./errors";

export class ClaimLifecycleEngine {
  /**
   * Allowed state transitions for insurance claim processing
   */
  private static readonly VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
    [ClaimStatus.SUBMITTED]: [ClaimStatus.UNDER_REVIEW],
    [ClaimStatus.UNDER_REVIEW]: [ClaimStatus.APPROVED, ClaimStatus.REJECTED],
    [ClaimStatus.APPROVED]: [ClaimStatus.PAYMENT_PENDING],
    [ClaimStatus.PAYMENT_PENDING]: [ClaimStatus.PAID],
    [ClaimStatus.REJECTED]: [], // Terminal state
    [ClaimStatus.PAID]: [],     // Terminal state
  };

  /**
   * Validate lifecycle state transition
   */
  public static assertValidClaimTransition(current: ClaimStatus, target: ClaimStatus): void {
    if (current === target) {
      return; // No-op idempotent transition
    }

    const allowed = this.VALID_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new BusinessRuleError(
        `Invalid claim state transition: Cannot change status from '${current}' to '${target}'. Allowed transitions: ${allowed.join(", ") || "None (Terminal State)"}`
      );
    }
  }

  /**
   * Allowed payment state transitions
   */
  private static readonly VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.REJECTED],
    [PaymentStatus.PROCESSING]: [PaymentStatus.SUCCESS, PaymentStatus.FAILED],
    [PaymentStatus.FAILED]: [PaymentStatus.PROCESSING], // Safe retry after reconciliation
    [PaymentStatus.SUCCESS]: [],                       // Terminal state
    [PaymentStatus.REJECTED]: [],                      // Terminal state
  };

  /**
   * Validate payment lifecycle transition
   */
  public static assertValidPaymentTransition(current: PaymentStatus, target: PaymentStatus): void {
    if (current === target) {
      return;
    }

    const allowed = this.VALID_PAYMENT_TRANSITIONS[current] || [];
    if (!allowed.includes(target)) {
      throw new BusinessRuleError(
        `Invalid payment state transition: Cannot change status from '${current}' to '${target}'. Allowed transitions: ${allowed.join(", ") || "None (Terminal State)"}`
      );
    }
  }

  /**
   * Optimistic Concurrency Control
   */
  public static assertVersionMatch(
    currentVersion: number | undefined,
    expectedVersion: number | undefined
  ): void {
    if (expectedVersion !== undefined && currentVersion !== undefined) {
      if (currentVersion !== expectedVersion) {
        throw new ConflictError(
          "Concurrency conflict: This record has been modified or reviewed concurrently by another user. Please refresh and review the updated record."
        );
      }
    }
  }
}

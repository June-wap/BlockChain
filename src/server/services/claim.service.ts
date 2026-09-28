import {
  AuditAction,
  Claim,
  ClaimReview,
  ClaimStatus,
  EvidenceItem,
  NotificationType,
  Payment,
  PaymentStatus,
  PolicyStatus,
  UserRole,
} from "@/types";
import { dbConnection } from "../db/postgres";
import { BlockchainService } from "./blockchain.service";
import { SecurityUtils } from "../core/security";
import { ClaimLifecycleEngine } from "../core/lifecycle";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  BusinessRuleError,
} from "../core/errors";
import { PolicyRepository } from "../repositories/policy.repository";
import { ClaimRepository } from "../repositories/claim.repository";
import { ReviewRepository } from "../repositories/review.repository";
import { PaymentRepository } from "../repositories/payment.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import { AuditRepository } from "../repositories/audit.repository";
import { OutboxRepository } from "../repositories/outbox.repository";
import { IdempotencyRepository } from "../repositories/idempotency.repository";

export interface CreateClaimInput {
  policyId: string;
  incidentDate: string;
  incidentType: string;
  location: string;
  requestedAmount: number;
  description: string;
  evidenceFiles?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    fileHash?: string;
  }>;
  idempotencyKey?: string;
}

export class ClaimService {
  /**
   * Submit a new claim with full business validation & atomic persistence in PostgreSQL
   */
  public static async submitClaim(
    customerId: string,
    customerName: string,
    input: CreateClaimInput
  ): Promise<{ claim: Claim; code?: string }> {
    // 0. Idempotency Check
    if (input.idempotencyKey) {
      const existingClaimId = await IdempotencyRepository.findTargetId(input.idempotencyKey);
      if (existingClaimId) {
        const existingClaim = await ClaimRepository.findById(existingClaimId);
        if (existingClaim) {
          return { claim: existingClaim };
        }
      }
    }

    // 1. Policy Validation against authoritative PostgreSQL
    const policy = await PolicyRepository.findById(input.policyId);
    if (!policy) {
      throw new NotFoundError("Insurance Policy", input.policyId);
    }

    // Customer ownership validation
    if (policy.customerId !== customerId) {
      throw new ForbiddenError("Forbidden: You do not own this insurance policy.");
    }

    // Policy status validation: Must be ACTIVE
    if (policy.status !== PolicyStatus.ACTIVE) {
      throw new BusinessRuleError(
        `Cannot submit claim: Policy is currently ${policy.status}. Only ACTIVE policies are eligible.`
      );
    }

    // 2. Incident Date Validation
    const incDate = new Date(input.incidentDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(incDate.getTime())) {
      throw new ValidationError("Invalid incident date provided.");
    }

    if (incDate > today) {
      throw new ValidationError("Incident date cannot be in the future.");
    }

    const polStartDate = new Date(policy.startDate);
    const polEndDate = new Date(policy.endDate);
    if (incDate < polStartDate || incDate > polEndDate) {
      throw new BusinessRuleError(
        `Incident date must fall within policy coverage period (${policy.startDate} to ${policy.endDate}).`
      );
    }

    // 3. Requested Amount Validation
    if (typeof input.requestedAmount !== "number" || input.requestedAmount <= 0) {
      throw new ValidationError("Requested amount must be greater than 0.");
    }

    if (input.requestedAmount > policy.coverageAmount) {
      throw new BusinessRuleError(
        `Requested amount ($${input.requestedAmount.toLocaleString()}) exceeds the maximum policy coverage limit ($${policy.coverageAmount.toLocaleString()}).`
      );
    }

    // 4. Description Validation
    if (!input.description || input.description.trim().length < 15) {
      throw new ValidationError("Description must contain at least 15 characters detailing the incident.");
    }

    // 5. Evidence Validation & Sanitization (BE-07)
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    const maxFileSize = 10 * 1024 * 1024; // 10MB limit

    if (input.evidenceFiles && input.evidenceFiles.length > 5) {
      throw new ValidationError("Maximum 5 evidence documents are permitted per claim.");
    }

    const evidenceItems: EvidenceItem[] = [];
    if (input.evidenceFiles && input.evidenceFiles.length > 0) {
      for (const file of input.evidenceFiles) {
        if (!allowedMimeTypes.includes(file.mimeType)) {
          throw new ValidationError(
            `Invalid file type (${file.mimeType}). Only PDF and JPG/PNG/WEBP images are permitted.`
          );
        }
        if (file.fileSize > maxFileSize) {
          throw new ValidationError(`File ${file.fileName} exceeds the 10MB file size limit.`);
        }

        const sanitizedFileName = SecurityUtils.sanitizeFilename(file.fileName);

        const evItem: EvidenceItem = {
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          claimId: "", // populated below
          fileName: sanitizedFileName,
          fileUrl: file.fileUrl,
          fileHash: file.fileHash || SecurityUtils.sha256(sanitizedFileName + Date.now()),
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: new Date().toISOString(),
        };
        evidenceItems.push(evItem);
      }
    }

    // 6. Build Claim Entity
    const claimId = `clm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const claimNumber = `CLM-2026-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    evidenceItems.forEach((ev) => {
      ev.claimId = claimId;
    });

    const newClaim: Claim = {
      id: claimId,
      claimNumber,
      policyId: policy.id,
      customerId,
      customerName,
      requestedAmount: input.requestedAmount,
      description: input.description.trim(),
      incidentDate: input.incidentDate,
      incidentType: input.incidentType || "GENERAL",
      location: input.location || "UNKNOWN",
      status: ClaimStatus.SUBMITTED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: evidenceItems,
      version: 1,
    };

    // 7. Atomic Transaction: Persist Claim, Outbox, Audit, Notification
    await dbConnection.transaction(async (client) => {
      await ClaimRepository.create(newClaim, client);

      await OutboxRepository.create(
        {
          aggregateType: "CLAIM",
          aggregateId: claimId,
          eventType: "CLAIM_SUBMITTED",
          payload: {
            claimId,
            claimNumber,
            requestedAmount: input.requestedAmount,
            policyId: policy.id,
            claimantWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
          },
        },
        client
      );

      await AuditRepository.create(
        {
          id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorId: customerId,
          actorName: customerName,
          role: UserRole.CUSTOMER,
          action: AuditAction.CLAIM_CREATED,
          entityType: "CLAIM",
          entityId: claimId,
          metadata: { claimNumber, requestedAmount: input.requestedAmount, policyId: policy.id },
        },
        client
      );

      await NotificationRepository.create(
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: customerId,
          title: `Tiếp nhận hồ sơ mới ${claimNumber}`,
          message: `Yêu cầu bồi thường ${claimNumber} đã được tiếp nhận thành công và sẽ được nhân viên thẩm định xử lý.`,
          type: NotificationType.CLAIM_SUBMITTED,
          read: false,
          linkUrl: `/customer/claims/${claimId}`,
          createdAt: new Date().toISOString(),
        },
        client
      );

      if (input.idempotencyKey) {
        await IdempotencyRepository.recordKey(input.idempotencyKey, claimId, client);
      }
    });

    return { claim: newClaim };
  }

  /**
   * Transition claim from SUBMITTED to UNDER_REVIEW within single SQL transaction
   */
  public static async startReview(
    claimId: string,
    reviewer: { id: string; name: string; role: UserRole }
  ): Promise<Claim> {
    if (reviewer.role !== UserRole.CLAIM_REVIEWER && reviewer.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Forbidden: Only authorized claim reviewers or administrators can review claims.");
    }

    return await dbConnection.transaction(async (client) => {
      const claim = await ClaimRepository.findById(claimId, client);
      if (!claim) {
        throw new NotFoundError("Claim", claimId);
      }

      ClaimLifecycleEngine.assertValidClaimTransition(claim.status, ClaimStatus.UNDER_REVIEW);

      const prevVersion = claim.version || 1;
      const updatedClaim = await ClaimRepository.updateStatusWithOptimisticLock(
        claimId,
        ClaimStatus.UNDER_REVIEW,
        prevVersion,
        { reviewerId: reviewer.id, reviewNotes: "Under review by staff" },
        client
      );

      await AuditRepository.create(
        {
          id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorId: reviewer.id,
          actorName: reviewer.name,
          role: reviewer.role,
          action: AuditAction.CLAIM_UPDATED,
          entityType: "CLAIM",
          entityId: claimId,
          metadata: { action: "START_REVIEW", newStatus: ClaimStatus.UNDER_REVIEW },
        },
        client
      );

      return updatedClaim;
    });
  }

  /**
   * Get single claim by ID with role & ownership check from PostgreSQL
   */
  public static async getClaimById(
    claimId: string,
    requestUser: { id: string; role: UserRole }
  ): Promise<{ claim?: Claim; error?: string; status: number }> {
    const claim = await ClaimRepository.findById(claimId);
    if (!claim) {
      return { error: "Claim not found", status: 404 };
    }

    // Ownership check for customer
    if (requestUser.role === UserRole.CUSTOMER && claim.customerId !== requestUser.id) {
      return {
        error: "Forbidden: You do not have permission to access this claim record.",
        status: 403,
      };
    }

    return { claim, status: 200 };
  }

  /**
   * Staff approve claim flow:
   * 1. Atomic SQL transaction: update claim (APPROVED), insert review, insert payment (PENDING), insert outbox (CLAIM_APPROVED), audit, notification.
   * 2. Immediate outbox dispatch / background sync to record on-chain.
   */
  public static async approveClaim(
    claimId: string,
    reviewer: { id: string; name: string; role: UserRole },
    approvedAmount: number,
    notes?: string,
    idempotencyKey?: string,
    expectedVersion?: number
  ): Promise<{ claim: Claim; txHash?: string }> {
    if (reviewer.role !== UserRole.CLAIM_REVIEWER && reviewer.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Forbidden: Only authorized claim reviewers or administrators can approve claims.");
    }

    if (typeof approvedAmount !== "number" || approvedAmount <= 0) {
      throw new ValidationError("Approved amount must be greater than 0.");
    }

    let updatedClaim!: Claim;
    let outboxEventId: string | undefined;

    // 1. Atomic SQL transaction
    await dbConnection.transaction(async (client) => {
      const claim = await ClaimRepository.findById(claimId, client);
      if (!claim) {
        throw new NotFoundError("Claim", claimId);
      }

      // Idempotency: Don't re-approve if already approved
      if (claim.status === ClaimStatus.APPROVED || claim.status === ClaimStatus.PAID) {
        updatedClaim = claim;
        return;
      }

      // Concurrency protection check (BE-14)
      ClaimLifecycleEngine.assertVersionMatch(claim.version, expectedVersion);

      // State transition check via Central Lifecycle Engine (BE-09)
      ClaimLifecycleEngine.assertValidClaimTransition(claim.status, ClaimStatus.APPROVED);

      if (approvedAmount > claim.requestedAmount) {
        throw new BusinessRuleError(
          `Approved amount ($${approvedAmount}) cannot exceed requested amount ($${claim.requestedAmount}).`
        );
      }

      const reviewNotes = notes || "Approved after review of evidence and policy terms.";
      const currentVersion = expectedVersion !== undefined ? expectedVersion : (claim.version || 1);

      // A. Update claim status to APPROVED with optimistic lock
      updatedClaim = await ClaimRepository.updateStatusWithOptimisticLock(
        claimId,
        ClaimStatus.APPROVED,
        currentVersion,
        {
          approvedAmount,
          reviewerId: reviewer.id,
          reviewNotes,
        },
        client
      );

      // B. Insert Review record
      const reviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const review: ClaimReview = {
        id: reviewId,
        claimId,
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
        decision: "APPROVED",
        approvedAmount,
        notes: reviewNotes,
        createdAt: new Date().toISOString(),
      };
      await ReviewRepository.create(review, client);

      // C. Insert Pending Payment record
      const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const payment: Payment = {
        id: paymentId,
        claimId,
        policyId: claim.policyId,
        customerId: claim.customerId,
        amount: approvedAmount,
        status: PaymentStatus.PENDING,
        paymentMethod: "CRYPTO_SMART_CONTRACT",
        recipientWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
        createdAt: new Date().toISOString(),
      };
      await PaymentRepository.create(payment, client);

      // D. Insert Outbox Event
      outboxEventId = await OutboxRepository.create(
        {
          aggregateType: "CLAIM",
          aggregateId: claimId,
          eventType: "CLAIM_APPROVED",
          payload: {
            claimId,
            approvedAmount,
            policyId: claim.policyId,
            requestedAmount: claim.requestedAmount,
            claimantWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
          },
        },
        client
      );

      // E. Audit Log
      await AuditRepository.create(
        {
          id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorId: reviewer.id,
          actorName: reviewer.name,
          role: reviewer.role,
          action: AuditAction.CLAIM_APPROVED,
          entityType: "CLAIM",
          entityId: claimId,
          metadata: { approvedAmount, reviewNotes: notes },
        },
        client
      );

      // F. Notify Customer
      await NotificationRepository.create(
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: claim.customerId,
          title: `Hồ sơ ${claim.claimNumber} đã được phê duyệt`,
          message: `Hồ sơ bồi thường trị giá $${approvedAmount.toLocaleString()} đã được chấp thuận và chuyển sang bộ phận giải ngân.`,
          type: NotificationType.CLAIM_APPROVED,
          read: false,
          linkUrl: `/customer/claims/${claimId}`,
          createdAt: new Date().toISOString(),
        },
        client
      );
    });

    // 2. Immediate outbox dispatch: Synchronize on-chain (EVM)
    let txHash: string | undefined = updatedClaim.blockchainTxHash;
    try {
      const bcResult = await BlockchainService.recordClaimApproval(
        claimId,
        approvedAmount,
        idempotencyKey,
        {
          policyId: updatedClaim.policyId,
          requestedAmount: updatedClaim.requestedAmount,
          claimantWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
        }
      );
      txHash = bcResult.txHash;
      updatedClaim.blockchainTxHash = txHash;
      await ClaimRepository.updateBlockchainTx(claimId, txHash).catch(() => {});
      if (outboxEventId) {
        await OutboxRepository.markProcessed(outboxEventId, txHash).catch(() => {});
      }
    } catch {
      // If blockchain execution fails, database state remains APPROVED and outbox event is left for retry
    }

    return { claim: updatedClaim, txHash };
  }

  /**
   * Staff reject claim flow: Atomic SQL transaction in PostgreSQL
   */
  public static async rejectClaim(
    claimId: string,
    reviewer: { id: string; name: string; role: UserRole },
    reason: string,
    notes?: string,
    expectedVersion?: number
  ): Promise<Claim> {
    if (reviewer.role !== UserRole.CLAIM_REVIEWER && reviewer.role !== UserRole.ADMIN) {
      throw new ForbiddenError("Forbidden: Only authorized claim reviewers or administrators can reject claims.");
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError("A specific rejection reason is mandatory.");
    }

    return await dbConnection.transaction(async (client) => {
      const claim = await ClaimRepository.findById(claimId, client);
      if (!claim) {
        throw new NotFoundError("Claim", claimId);
      }

      // Concurrency protection check (BE-14)
      ClaimLifecycleEngine.assertVersionMatch(claim.version, expectedVersion);

      // State transition check via Central Lifecycle Engine (BE-09)
      ClaimLifecycleEngine.assertValidClaimTransition(claim.status, ClaimStatus.REJECTED);

      const reviewNotes = `Rejection: ${reason}. ${notes || ""}`.trim();
      const currentVersion = expectedVersion !== undefined ? expectedVersion : (claim.version || 1);

      // A. Update claim status to REJECTED with optimistic lock
      const updatedClaim = await ClaimRepository.updateStatusWithOptimisticLock(
        claimId,
        ClaimStatus.REJECTED,
        currentVersion,
        {
          reviewerId: reviewer.id,
          reviewNotes,
        },
        client
      );

      // B. Insert Review Record
      const reviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const review: ClaimReview = {
        id: reviewId,
        claimId,
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
        decision: "REJECTED",
        reason,
        notes,
        createdAt: new Date().toISOString(),
      };
      await ReviewRepository.create(review, client);

      // C. Insert Outbox Event
      await OutboxRepository.create(
        {
          aggregateType: "CLAIM",
          aggregateId: claimId,
          eventType: "CLAIM_REJECTED",
          payload: { claimId, reason, notes },
        },
        client
      );

      // D. Audit Log
      await AuditRepository.create(
        {
          id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorId: reviewer.id,
          actorName: reviewer.name,
          role: reviewer.role,
          action: AuditAction.CLAIM_REJECTED,
          entityType: "CLAIM",
          entityId: claimId,
          metadata: { reason, notes },
        },
        client
      );

      // E. Notify Customer
      await NotificationRepository.create(
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: claim.customerId,
          title: `Hồ sơ ${claim.claimNumber} bị từ chối`,
          message: `Hồ sơ bồi thường của bạn đã bị từ chối với lý do: "${reason}". Bấm để xem chi tiết phản hồi.`,
          type: NotificationType.CLAIM_REJECTED,
          read: false,
          linkUrl: `/customer/claims/${claimId}`,
          createdAt: new Date().toISOString(),
        },
        client
      );

      return updatedClaim;
    });
  }
}

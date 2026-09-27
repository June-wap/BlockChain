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
import { db } from "../db/store";
import { BlockchainService } from "./blockchain.service";

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
   * Submit a new claim with full business validation & idempotency
   */
  public static async submitClaim(
    customerId: string,
    customerName: string,
    input: CreateClaimInput
  ): Promise<{ claim: Claim; code?: string }> {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existingClaimId = db.getState().idempotencyKeys.get(input.idempotencyKey);
      if (existingClaimId) {
        const existing = db.getClaims().get(existingClaimId);
        if (existing) {
          return { claim: existing };
        }
      }
    }

    // 2. Policy Validation
    const policy = db.getPolicies().get(input.policyId);
    if (!policy) {
      throw new Error("Specified policy does not exist.");
    }

    // Customer ownership validation
    if (policy.customerId !== customerId) {
      throw new Error("Forbidden: You do not own this insurance policy.");
    }

    // Policy status validation: Must be ACTIVE
    if (policy.status !== PolicyStatus.ACTIVE) {
      throw new Error(`Cannot submit claim: Policy is currently ${policy.status}. Only ACTIVE policies are eligible.`);
    }

    // 3. Incident Date Validation
    const incDate = new Date(input.incidentDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isNaN(incDate.getTime())) {
      throw new Error("Invalid incident date provided.");
    }

    if (incDate > today) {
      throw new Error("Incident date cannot be in the future.");
    }

    const polStartDate = new Date(policy.startDate);
    const polEndDate = new Date(policy.endDate);
    if (incDate < polStartDate || incDate > polEndDate) {
      throw new Error(`Incident date must fall within policy coverage period (${policy.startDate} to ${policy.endDate}).`);
    }

    // 4. Requested Amount Validation
    if (typeof input.requestedAmount !== "number" || input.requestedAmount <= 0) {
      throw new Error("Requested amount must be greater than 0.");
    }

    if (input.requestedAmount > policy.coverageAmount) {
      throw new Error(
        `Requested amount ($${input.requestedAmount.toLocaleString()}) exceeds the maximum policy coverage limit ($${policy.coverageAmount.toLocaleString()}).`
      );
    }

    // 5. Description Validation
    if (!input.description || input.description.trim().length < 15) {
      throw new Error("Description must contain at least 15 characters detailing the incident.");
    }

    // 6. Evidence Validation
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    const maxFileSize = 10 * 1024 * 1024; // 10MB limit

    const evidenceItems: EvidenceItem[] = [];
    if (input.evidenceFiles && input.evidenceFiles.length > 0) {
      for (const file of input.evidenceFiles) {
        if (!allowedMimeTypes.includes(file.mimeType)) {
          throw new Error(`Invalid file type (${file.mimeType}). Only PDF and JPG/PNG/WEBP images are permitted.`);
        }
        if (file.fileSize > maxFileSize) {
          throw new Error(`File ${file.fileName} exceeds the 10MB file size limit.`);
        }

        const evItem: EvidenceItem = {
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          claimId: "", // filled below
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileHash: file.fileHash || BlockchainService.hashIdentifier(file.fileName + Date.now()),
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadedAt: new Date().toISOString(),
        };
        evidenceItems.push(evItem);
      }
    }

    // 7. Persist Claim
    const claimId = `clm-${Date.now()}`;
    const claimNumber = `CLM-2026-${Math.floor(100 + Math.random() * 900)}`;

    evidenceItems.forEach((ev) => {
      ev.claimId = claimId;
      db.getState().claimDocuments.set(ev.id, ev);
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
      status: ClaimStatus.SUBMITTED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: evidenceItems,
    };

    db.getClaims().set(claimId, newClaim);

    if (input.idempotencyKey) {
      db.getState().idempotencyKeys.set(input.idempotencyKey, claimId);
    }

    // 8. Audit and Notification
    db.logAudit({
      actorId: customerId,
      actorName: customerName,
      role: UserRole.CUSTOMER,
      action: AuditAction.CLAIM_CREATED,
      entityType: "CLAIM",
      entityId: claimId,
      metadata: { claimNumber, requestedAmount: input.requestedAmount, policyId: policy.id },
    });

    const notifId = `notif-${Date.now()}`;
    db.getNotifications().set(notifId, {
      id: notifId,
      userId: customerId,
      title: `Tiếp nhận hồ sơ mới ${claimNumber}`,
      message: `Yêu cầu bồi thường ${claimNumber} đã được tiếp nhận thành công và sẽ được nhân viên thẩm định xử lý.`,
      type: NotificationType.CLAIM_SUBMITTED,
      read: false,
      linkUrl: `/customer/claims/${claimId}`,
      createdAt: new Date().toISOString(),
    });

    return { claim: newClaim };
  }

  /**
   * Get single claim by ID with role & ownership check
   */
  public static getClaimById(
    claimId: string,
    requestUser: { id: string; role: UserRole }
  ): { claim?: Claim; error?: string; status: number } {
    const claim = db.getClaims().get(claimId);
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
   * Staff approve claim flow with validation, audit, notifications and blockchain sync
   */
  public static async approveClaim(
    claimId: string,
    reviewer: { id: string; name: string; role: UserRole },
    approvedAmount: number,
    notes?: string,
    idempotencyKey?: string
  ): Promise<{ claim: Claim; txHash?: string }> {
    if (reviewer.role !== UserRole.CLAIM_REVIEWER && reviewer.role !== UserRole.ADMIN) {
      throw new Error("Forbidden: Only authorized claim reviewers or administrators can approve claims.");
    }

    const claim = db.getClaims().get(claimId);
    if (!claim) {
      throw new Error("Claim not found.");
    }

    // Idempotency: Don't re-approve if already approved
    if ((claim.status as ClaimStatus) === ClaimStatus.APPROVED || (claim.status as ClaimStatus) === ClaimStatus.PAID) {
      return { claim, txHash: claim.blockchainTxHash };
    }

    // State transition check: Can only approve from SUBMITTED or UNDER_REVIEW
    if (claim.status !== ClaimStatus.UNDER_REVIEW && claim.status !== ClaimStatus.SUBMITTED) {
      throw new Error(`Invalid state transition: Cannot approve claim currently in '${claim.status}' state.`);
    }

    // Approved amount check
    if (typeof approvedAmount !== "number" || approvedAmount <= 0) {
      throw new Error("Approved amount must be greater than 0.");
    }

    if (approvedAmount > claim.requestedAmount) {
      throw new Error(`Approved amount ($${approvedAmount}) cannot exceed requested amount ($${claim.requestedAmount}).`);
    }

    // 1. Submit on-chain record
    const bcResult = await BlockchainService.recordClaimApproval(claimId, approvedAmount, idempotencyKey);

    // 2. Update claim state
    claim.status = ClaimStatus.APPROVED;
    claim.approvedAmount = approvedAmount;
    claim.reviewerId = reviewer.id;
    claim.reviewNotes = notes || "Approved after review of evidence and policy terms.";
    claim.blockchainTxHash = bcResult.txHash;
    claim.updatedAt = new Date().toISOString();
    db.getClaims().set(claimId, claim);

    // 3. Create review record
    const reviewId = `rev-${Date.now()}`;
    const review: ClaimReview = {
      id: reviewId,
      claimId,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      decision: "APPROVED",
      approvedAmount,
      notes: claim.reviewNotes,
      createdAt: new Date().toISOString(),
    };
    db.getState().claimReviews.set(reviewId, review);

    // 4. Create pending payment record
    const paymentId = `pay-${Date.now()}`;
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
    db.getPayments().set(paymentId, payment);

    // 5. Audit Log
    db.logAudit({
      actorId: reviewer.id,
      actorName: reviewer.name,
      role: reviewer.role,
      action: AuditAction.CLAIM_APPROVED,
      entityType: "CLAIM",
      entityId: claimId,
      metadata: { approvedAmount, txHash: bcResult.txHash, reviewNotes: notes },
    });

    // 6. Notify Customer
    const notifId = `notif-${Date.now()}`;
    db.getNotifications().set(notifId, {
      id: notifId,
      userId: claim.customerId,
      title: `Hồ sơ ${claim.claimNumber} đã được phê duyệt`,
      message: `Hồ sơ bồi thường trị giá $${approvedAmount.toLocaleString()} đã được chấp thuận và chuyển sang bộ phận giải ngân.`,
      type: NotificationType.CLAIM_APPROVED,
      read: false,
      linkUrl: `/customer/claims/${claimId}`,
      createdAt: new Date().toISOString(),
    });

    return { claim, txHash: bcResult.txHash };
  }

  /**
   * Staff reject claim flow
   */
  public static async rejectClaim(
    claimId: string,
    reviewer: { id: string; name: string; role: UserRole },
    reason: string,
    notes?: string
  ): Promise<Claim> {
    if (reviewer.role !== UserRole.CLAIM_REVIEWER && reviewer.role !== UserRole.ADMIN) {
      throw new Error("Forbidden: Only authorized claim reviewers or administrators can reject claims.");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("A specific rejection reason is mandatory.");
    }

    const claim = db.getClaims().get(claimId);
    if (!claim) {
      throw new Error("Claim not found.");
    }

    if (claim.status !== ClaimStatus.UNDER_REVIEW && claim.status !== ClaimStatus.SUBMITTED) {
      throw new Error(`Invalid state transition: Cannot reject claim currently in '${claim.status}' state.`);
    }

    // Update claim
    claim.status = ClaimStatus.REJECTED;
    claim.reviewerId = reviewer.id;
    claim.reviewNotes = `Rejection: ${reason}. ${notes || ""}`.trim();
    claim.updatedAt = new Date().toISOString();
    db.getClaims().set(claimId, claim);

    // Create review record
    const reviewId = `rev-${Date.now()}`;
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
    db.getState().claimReviews.set(reviewId, review);

    // Audit Log
    db.logAudit({
      actorId: reviewer.id,
      actorName: reviewer.name,
      role: reviewer.role,
      action: AuditAction.CLAIM_REJECTED,
      entityType: "CLAIM",
      entityId: claimId,
      metadata: { reason, notes },
    });

    // Notify Customer
    const notifId = `notif-${Date.now()}`;
    db.getNotifications().set(notifId, {
      id: notifId,
      userId: claim.customerId,
      title: `Hồ sơ ${claim.claimNumber} bị từ chối`,
      message: `Hồ sơ bồi thường của bạn đã bị từ chối với lý do: "${reason}". Bấm để xem chi tiết phản hồi.`,
      type: NotificationType.CLAIM_REJECTED,
      read: false,
      linkUrl: `/customer/claims/${claimId}`,
      createdAt: new Date().toISOString(),
    });

    return claim;
  }
}

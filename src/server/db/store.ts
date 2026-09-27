import {
  AuditAction,
  AuditLog,
  BlockchainTransaction,
  BlockchainTxStatus,
  Claim,
  ClaimReview,
  ClaimStatus,
  EvidenceItem,
  NotificationType,
  Payment,
  PaymentStatus,
  PolicyDetail,
  PolicyStatus,
  SystemNotification,
  User,
  UserRole,
  UserStatus,
} from "@/types";
import { SecurityUtils } from "../core/security";

export interface DatabaseState {
  users: Map<string, User & { passwordHash: string; status: UserStatus }>;
  policies: Map<string, PolicyDetail>;
  claims: Map<string, Claim>;
  claimDocuments: Map<string, EvidenceItem>;
  claimReviews: Map<string, ClaimReview>;
  payments: Map<string, Payment>;
  blockchainTransactions: Map<string, BlockchainTransaction>;
  notifications: Map<string, SystemNotification>;
  auditLogs: AuditLog[];
  idempotencyKeys: Map<string, string>;
}

class InDatabaseStore {
  private state: DatabaseState;

  constructor() {
    this.state = {
      users: new Map(),
      policies: new Map(),
      claims: new Map(),
      claimDocuments: new Map(),
      claimReviews: new Map(),
      payments: new Map(),
      blockchainTransactions: new Map(),
      notifications: new Map(),
      auditLogs: [],
      idempotencyKeys: new Map(),
    };
    this.seed();
  }

  private seed() {
    // 1. Seed Users
    const users: (User & { passwordHash: string; status: UserStatus })[] = [
      {
        id: "usr_customer_default",
        email: "customer@example.com",
        fullName: "Nguyen Van A",
        role: UserRole.CUSTOMER,
        phoneNumber: "+84 912 345 678",
        walletAddress: "0x71C8366453AB548A31D08f237B855D282126B39a",
        status: UserStatus.ACTIVE,
        createdAt: "2026-01-01T00:00:00Z",
        passwordHash: "pbkdf2$10000$mockhashedpassword$secure",
      },
      {
        id: "usr_customer_2",
        email: "customer2@example.com",
        fullName: "Tran Thi B",
        role: UserRole.CUSTOMER,
        phoneNumber: "+84 987 654 321",
        walletAddress: "0x2B420C7bE753d0e2e283B4628d05541eE5540356",
        status: UserStatus.ACTIVE,
        createdAt: "2026-01-15T00:00:00Z",
        passwordHash: "pbkdf2$10000$mockhashedpassword$secure",
      },
      {
        id: "usr_reviewer_1",
        email: "reviewer@insurance.com",
        fullName: "Le Minh Reviewer",
        role: UserRole.CLAIM_REVIEWER,
        phoneNumber: "+84 903 111 222",
        status: UserStatus.ACTIVE,
        createdAt: "2025-11-01T00:00:00Z",
        passwordHash: "pbkdf2$10000$mockhashedpassword$secure",
      },
      {
        id: "usr_finance_1",
        email: "finance@insurance.com",
        fullName: "Pham Thi Finance",
        role: UserRole.FINANCE,
        phoneNumber: "+84 905 333 444",
        status: UserStatus.ACTIVE,
        createdAt: "2025-11-01T00:00:00Z",
        passwordHash: "pbkdf2$10000$mockhashedpassword$secure",
      },
      {
        id: "usr_admin_1",
        email: "admin@insurance.com",
        fullName: "Admin Hoang Vu",
        role: UserRole.ADMIN,
        phoneNumber: "+84 909 999 888",
        status: UserStatus.ACTIVE,
        createdAt: "2025-01-01T00:00:00Z",
        passwordHash: "pbkdf2$10000$mockhashedpassword$secure",
      },
    ];

    users.forEach((u) => this.state.users.set(u.id, u));

    // 2. Seed Policies with Coverages
    const policies: PolicyDetail[] = [
      {
        id: "pol-101",
        policyNumber: "POL-HLTH-2026-001",
        customerId: "usr_customer_default",
        customerName: "Nguyen Van A",
        policyHolder: "Nguyen Van A",
        type: "Comprehensive Health",
        coverageAmount: 50000,
        premiumAmount: 1200,
        deductible: 100,
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        status: PolicyStatus.ACTIVE,
        termsUri: "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
        termsAndConditions:
          "Full coverage for inpatient and outpatient hospitalizations, prescription drugs, and authorized surgical procedures subject to standard limits.",
        coverages: [
          {
            name: "Inpatient Hospitalization",
            maxAmount: 30000,
            description: "Room & board, intensive care, and surgical treatments at accredited hospitals.",
          },
          {
            name: "Outpatient Medical",
            maxAmount: 12000,
            description: "Doctor consultations, emergency visits, lab tests, and diagnostics.",
          },
          {
            name: "Prescription Drugs",
            maxAmount: 8000,
            description: "Medically necessary medications prescribed by licensed physicians.",
          },
        ],
      },
      {
        id: "pol-102",
        policyNumber: "POL-AUTO-2026-042",
        customerId: "usr_customer_default",
        customerName: "Nguyen Van A",
        policyHolder: "Nguyen Van A",
        type: "Motor Vehicle Premium",
        coverageAmount: 25000,
        premiumAmount: 850,
        deductible: 250,
        startDate: "2026-03-15",
        endDate: "2027-03-15",
        status: PolicyStatus.ACTIVE,
        termsUri: "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2hLDFPWcmXM7P2K",
        termsAndConditions:
          "Covers accidental vehicle collision, fire damage, third-party civil liability, and personal accident for driver and passengers.",
        coverages: [
          {
            name: "Vehicle Collision & Damage",
            maxAmount: 15000,
            description: "Direct physical loss or collision repair costs up to vehicle market value.",
          },
          {
            name: "Third-Party Liability",
            maxAmount: 8000,
            description: "Bodily injury and property damage caused to third parties.",
          },
          {
            name: "Driver & Passenger Injury",
            maxAmount: 2000,
            description: "Emergency medical treatment for insured occupants inside the vehicle.",
          },
        ],
      },
      {
        id: "pol-103",
        policyNumber: "POL-PROP-2025-019",
        customerId: "usr_customer_default",
        customerName: "Nguyen Van A",
        policyHolder: "Nguyen Van A",
        type: "Property & Fire",
        coverageAmount: 100000,
        premiumAmount: 2400,
        deductible: 1000,
        startDate: "2025-06-01",
        endDate: "2026-06-01",
        status: PolicyStatus.EXPIRED,
        termsAndConditions: "Standard residential property fire, storm, and water ingress protection.",
        coverages: [
          {
            name: "Structural Fire Damage",
            maxAmount: 70000,
            description: "Reconstruction of physical dwelling premises.",
          },
          {
            name: "Contents & Furniture",
            maxAmount: 30000,
            description: "Replacement of home appliances and interior belongings.",
          },
        ],
      },
      {
        id: "pol-104",
        policyNumber: "POL-AUTO-2026-099",
        customerId: "usr_customer_2",
        customerName: "Tran Thi B",
        policyHolder: "Tran Thi B",
        type: "Motor Vehicle Standard",
        coverageAmount: 20000,
        premiumAmount: 700,
        deductible: 200,
        startDate: "2026-02-01",
        endDate: "2027-02-01",
        status: PolicyStatus.ACTIVE,
        termsAndConditions: "Standard vehicle damage and legal liability coverage.",
        coverages: [
          {
            name: "Vehicle Damage",
            maxAmount: 12000,
            description: "Collision and repair reimbursement.",
          },
          {
            name: "Third-Party Liability",
            maxAmount: 8000,
            description: "Legal third-party indemnity.",
          },
        ],
      },
    ];

    policies.forEach((p) => this.state.policies.set(p.id, p));

    // 3. Seed Claims across all lifecycle stages
    const claims: Claim[] = [
      {
        id: "clm-501",
        claimNumber: "CLM-2026-881",
        policyId: "pol-101",
        customerId: "usr_customer_default",
        customerName: "Nguyen Van A",
        requestedAmount: 1850,
        description: "Emergency inpatient hospitalization following acute viral infection at Central Medical Hospital.",
        incidentDate: "2026-09-15",
        status: ClaimStatus.UNDER_REVIEW,
        reviewNotes: "Initial evidence documents received. Reviewing medical discharge summary and room charge limits.",
        reviewerId: "usr_reviewer_1",
        createdAt: "2026-09-16T08:30:00Z",
        updatedAt: "2026-09-17T14:20:00Z",
        evidence: [
          {
            id: "ev-1",
            claimId: "clm-501",
            fileName: "hospital_invoice_sept2026.pdf",
            fileUrl: "/api/evidence/hospital_invoice_sept2026.pdf",
            fileHash: "0x7a8f9c2e4b105d33a6e8721c4df19932a4e8d35667104b2a8f89e210cd4e510a",
            fileSize: 1024 * 340,
            mimeType: "application/pdf",
            uploadedAt: "2026-09-16T08:30:00Z",
          },
          {
            id: "ev-2",
            claimId: "clm-501",
            fileName: "discharge_summary.pdf",
            fileUrl: "/api/evidence/discharge_summary.pdf",
            fileHash: "0x11029abcefa883921049281a8b38102d8471c9472bfa381928018274921cba10",
            fileSize: 1024 * 512,
            mimeType: "application/pdf",
            uploadedAt: "2026-09-16T08:32:00Z",
          },
        ],
      },
      {
        id: "clm-502",
        claimNumber: "CLM-2026-724",
        policyId: "pol-102",
        customerId: "usr_customer_default",
        customerName: "Nguyen Van A",
        requestedAmount: 4200,
        approvedAmount: 4200,
        description: "Front vehicle collision on Highway 1A. Repaired at authorized garage workshop.",
        incidentDate: "2026-08-20",
        status: ClaimStatus.PAYMENT_PENDING,
        reviewNotes: "Damage appraisal confirmed. Approved full deductible reimbursement. Scheduled for smart contract payout.",
        reviewerId: "usr_reviewer_1",
        createdAt: "2026-08-21T10:15:00Z",
        updatedAt: "2026-08-24T16:00:00Z",
        evidence: [
          {
            id: "ev-3",
            claimId: "clm-502",
            fileName: "collision_damage_photo.jpg",
            fileUrl: "/api/evidence/collision_damage_photo.jpg",
            fileHash: "0x4b78912cefa883921049281a8b38102d8471c9472bfa381928018274921ca991",
            fileSize: 1024 * 1200,
            mimeType: "image/jpeg",
            uploadedAt: "2026-08-21T10:15:00Z",
          },
        ],
      },
      {
        id: "clm-503",
        claimNumber: "CLM-2026-419",
        policyId: "pol-101",
        customerId: "usr_customer_default",
        customerName: "Nguyen Van A",
        requestedAmount: 800,
        approvedAmount: 800,
        description: "Outpatient dental surgery and prescription pharmaceuticals.",
        incidentDate: "2026-07-10",
        status: ClaimStatus.PAID,
        reviewNotes: "Claim approved and disbursed via smart contract escrow.",
        reviewerId: "usr_reviewer_1",
        blockchainTxHash: "0x89e2f491c107bcda049281a8b38102d8471c947210293847561029384756a1b2",
        createdAt: "2026-07-11T09:00:00Z",
        updatedAt: "2026-07-13T11:45:00Z",
        evidence: [
          {
            id: "ev-4",
            claimId: "clm-503",
            fileName: "dental_clinic_receipt.pdf",
            fileUrl: "/api/evidence/dental_clinic_receipt.pdf",
            fileHash: "0x9812739182390192381293812938192839182938192839182938192839182938",
            fileSize: 1024 * 180,
            mimeType: "application/pdf",
            uploadedAt: "2026-07-11T09:00:00Z",
          },
        ],
      },
      {
        id: "clm-504",
        claimNumber: "CLM-2026-902",
        policyId: "pol-102",
        customerId: "usr_customer_default",
        customerName: "Nguyen Van A",
        requestedAmount: 500,
        description: "Minor windshield glass crack due to loose highway gravel stone.",
        incidentDate: "2026-09-25",
        status: ClaimStatus.SUBMITTED,
        createdAt: "2026-09-26T14:10:00Z",
        updatedAt: "2026-09-26T14:10:00Z",
        evidence: [
          {
            id: "ev-5",
            claimId: "clm-504",
            fileName: "windshield_crack.png",
            fileUrl: "/api/evidence/windshield_crack.png",
            fileHash: "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
            fileSize: 1024 * 420,
            mimeType: "image/png",
            uploadedAt: "2026-09-26T14:10:00Z",
          },
        ],
      },
      {
        id: "clm-505",
        claimNumber: "CLM-2026-112",
        policyId: "pol-103",
        customerId: "usr_customer_default",
        customerName: "Nguyen Van A",
        requestedAmount: 6000,
        description: "Water pipe rupture causing floor damage during storm.",
        incidentDate: "2026-06-15",
        status: ClaimStatus.REJECTED,
        reviewNotes: "Rejection: Incident occurred outside policy coverage active window.",
        reviewerId: "usr_reviewer_1",
        createdAt: "2026-06-20T11:00:00Z",
        updatedAt: "2026-06-22T09:30:00Z",
      },
      {
        id: "clm-506",
        claimNumber: "CLM-2026-301",
        policyId: "pol-104",
        customerId: "usr_customer_2",
        customerName: "Tran Thi B",
        requestedAmount: 2100,
        description: "Rear bumper scratch and tail light replacement.",
        incidentDate: "2026-09-02",
        status: ClaimStatus.UNDER_REVIEW,
        reviewerId: "usr_reviewer_1",
        createdAt: "2026-09-03T16:00:00Z",
        updatedAt: "2026-09-04T10:00:00Z",
      },
    ];

    claims.forEach((c) => {
      this.state.claims.set(c.id, c);
      c.evidence?.forEach((ev) => this.state.claimDocuments.set(ev.id, ev));
    });

    // 4. Seed Reviews
    const reviews: ClaimReview[] = [
      {
        id: "rev-1",
        claimId: "clm-503",
        reviewerId: "usr_reviewer_1",
        reviewerName: "Le Minh Reviewer",
        decision: "APPROVED",
        approvedAmount: 800,
        notes: "Dental surgery bills verified against policy coverage limit. Approved for instant payout.",
        createdAt: "2026-07-13T10:00:00Z",
      },
      {
        id: "rev-2",
        claimId: "clm-502",
        reviewerId: "usr_reviewer_1",
        reviewerName: "Le Minh Reviewer",
        decision: "APPROVED",
        approvedAmount: 4200,
        notes: "Collision damage appraisal verified by partner mechanic.",
        createdAt: "2026-08-24T15:30:00Z",
      },
      {
        id: "rev-3",
        claimId: "clm-505",
        reviewerId: "usr_reviewer_1",
        reviewerName: "Le Minh Reviewer",
        decision: "REJECTED",
        reason: "Policy expired",
        notes: "Incident occurred after policy expiration date (2026-06-01).",
        createdAt: "2026-06-22T09:30:00Z",
      },
    ];

    reviews.forEach((r) => this.state.claimReviews.set(r.id, r));

    // 5. Seed Payments
    const payments: Payment[] = [
      {
        id: "pay-101",
        claimId: "clm-503",
        policyId: "pol-101",
        customerId: "usr_customer_default",
        amount: 800,
        status: PaymentStatus.SUCCESS,
        paymentMethod: "CRYPTO_SMART_CONTRACT",
        recipientWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
        blockchainTxHash: "0x89e2f491c107bcda049281a8b38102d8471c947210293847561029384756a1b2",
        processedAt: "2026-07-13T11:45:00Z",
        createdAt: "2026-07-13T11:40:00Z",
      },
      {
        id: "pay-102",
        claimId: "clm-502",
        policyId: "pol-102",
        customerId: "usr_customer_default",
        amount: 4200,
        status: PaymentStatus.PENDING,
        paymentMethod: "CRYPTO_SMART_CONTRACT",
        recipientWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
        createdAt: "2026-08-24T16:00:00Z",
      },
    ];

    payments.forEach((p) => this.state.payments.set(p.id, p));

    // 6. Seed Blockchain Transactions
    const bctx: BlockchainTransaction[] = [
      {
        id: "bctx-1",
        txHash: "0x89e2f491c107bcda049281a8b38102d8471c947210293847561029384756a1b2",
        network: "Sepolia Testnet (EVM)",
        action: "PAYMENT_DISBURSED",
        claimId: "clm-503",
        paymentId: "pay-101",
        fromAddress: "0x0A9213894b91819c9e8310d2918e91823901b891",
        contractAddress: "0x3918a10982301982b81092830192839182390182",
        blockNumber: 6294102,
        gasUsed: 48210,
        status: BlockchainTxStatus.CONFIRMED,
        confirmationCount: 48,
        timestamp: "2026-07-13T11:45:00Z",
      },
      {
        id: "bctx-2",
        txHash: "0x331049281a8b38102d8471c9472bfa381928018274921cba101029384756c3d4",
        network: "Sepolia Testnet (EVM)",
        action: "CLAIM_APPROVED",
        claimId: "clm-502",
        fromAddress: "0x0A9213894b91819c9e8310d2918e91823901b891",
        contractAddress: "0x3918a10982301982b81092830192839182390182",
        blockNumber: 6410291,
        gasUsed: 35120,
        status: BlockchainTxStatus.CONFIRMED,
        confirmationCount: 32,
        timestamp: "2026-08-24T15:35:00Z",
      },
    ];

    bctx.forEach((tx) => this.state.blockchainTransactions.set(tx.txHash, tx));

    // 7. Seed Notifications
    const notifications: SystemNotification[] = [
      {
        id: "notif-1",
        userId: "usr_customer_default",
        title: "Hồ sơ bồi thường CLM-2026-724 đã được phê duyệt",
        message: "Hồ sơ bồi thường 4.200 USD cho hợp đồng POL-AUTO-2026-042 đã được phê duyệt và chuyển sang bước giải ngân thanh toán.",
        type: NotificationType.CLAIM_APPROVED,
        read: false,
        linkUrl: "/customer/claims/clm-502",
        createdAt: "2026-08-24T16:05:00Z",
      },
      {
        id: "notif-2",
        userId: "usr_customer_default",
        title: "Thanh toán thành công qua Smart Contract",
        message: "Khoản chi trả 800 USD cho hồ sơ CLM-2026-419 đã được giải ngân thành công tới ví 0x71C...B39a.",
        type: NotificationType.PAYMENT_SUCCESS,
        read: true,
        linkUrl: "/customer/payments",
        createdAt: "2026-07-13T11:46:00Z",
      },
      {
        id: "notif-3",
        userId: "usr_customer_default",
        title: "Tiếp nhận hồ sơ mới CLM-2026-902",
        message: "Yêu cầu bồi thường CLM-2026-902 của bạn đã được ghi nhận vào hệ thống thành công.",
        type: NotificationType.CLAIM_SUBMITTED,
        read: true,
        linkUrl: "/customer/claims/clm-504",
        createdAt: "2026-09-26T14:11:00Z",
      },
    ];

    notifications.forEach((n) => this.state.notifications.set(n.id, n));

    // 8. Seed Audit Logs
    this.state.auditLogs = [
      {
        id: "aud-001",
        timestamp: "2026-09-26T14:10:00Z",
        actorId: "usr_customer_default",
        actorName: "Nguyen Van A",
        role: UserRole.CUSTOMER,
        action: AuditAction.CLAIM_CREATED,
        entityType: "CLAIM",
        entityId: "clm-504",
        ipAddress: "113.161.42.19",
        metadata: { requestedAmount: 500, policyId: "pol-102" },
      },
      {
        id: "aud-002",
        timestamp: "2026-08-24T15:30:00Z",
        actorId: "usr_reviewer_1",
        actorName: "Le Minh Reviewer",
        role: UserRole.CLAIM_REVIEWER,
        action: AuditAction.CLAIM_APPROVED,
        entityType: "CLAIM",
        entityId: "clm-502",
        ipAddress: "14.161.88.2",
        metadata: { approvedAmount: 4200, statusBefore: "UNDER_REVIEW", statusAfter: "PAYMENT_PENDING" },
      },
      {
        id: "aud-003",
        timestamp: "2026-07-13T11:45:00Z",
        actorId: "usr_finance_1",
        actorName: "Pham Thi Finance",
        role: UserRole.FINANCE,
        action: AuditAction.PAYMENT_COMPLETED,
        entityType: "PAYMENT",
        entityId: "pay-101",
        ipAddress: "14.161.88.2",
        metadata: { amount: 800, txHash: "0x89e2f491c107bcda049281a8b38102d8471c947210293847561029384756a1b2" },
      },
    ];
  }

  // --- ACCESSORS ---
  public getState(): DatabaseState {
    return this.state;
  }

  public getUsers() {
    return this.state.users;
  }

  public getPolicies() {
    return this.state.policies;
  }

  public getClaims() {
    return this.state.claims;
  }

  public getPayments() {
    return this.state.payments;
  }

  public getBlockchainTransactions() {
    return this.state.blockchainTransactions;
  }

  public getNotifications() {
    return this.state.notifications;
  }

  public getAuditLogs() {
    return this.state.auditLogs;
  }

  public logAudit(entry: Omit<AuditLog, "id" | "timestamp">) {
    const sanitizedMetadata = entry.metadata ? SecurityUtils.sanitizeMetadata(entry.metadata) : undefined;
    const log: AuditLog = {
      ...entry,
      metadata: sanitizedMetadata,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    return log;
  }
}

// Global persistent instance across Next.js dev server reloads
const globalForDb = globalThis as unknown as { __app_database_store?: InDatabaseStore };
export const db = globalForDb.__app_database_store || new InDatabaseStore();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__app_database_store = db;
}

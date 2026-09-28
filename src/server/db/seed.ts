import { UserRepository } from "../repositories/user.repository";
import { PolicyRepository } from "../repositories/policy.repository";
import { ClaimRepository } from "../repositories/claim.repository";
import { PaymentRepository } from "../repositories/payment.repository";
import { BlockchainTransactionRepository } from "../repositories/blockchain-tx.repository";
import { ReviewRepository } from "../repositories/review.repository";
import { NotificationRepository } from "../repositories/notification.repository";
import { AuditRepository } from "../repositories/audit.repository";
import { SecurityUtils } from "../core/security";
import {
  AuditAction,
  AuditLog,
  BlockchainTxStatus,
  ClaimStatus,
  NotificationType,
  PaymentStatus,
  PolicyStatus,
  UserRole,
  UserStatus,
} from "@/types";

export async function seedDatabaseIfEmpty(): Promise<void> {
  const demoHash = SecurityUtils.hashPassword("password123");

  // 1. Seed Users if usr_customer_default is not found
  const defaultUser = await UserRepository.findById("usr_customer_default");
  if (!defaultUser) {
    const users = [
      {
        id: "usr_customer_default",
        email: "customer@example.com",
        fullName: "Nguyen Van A",
        role: UserRole.CUSTOMER,
        phoneNumber: "+84 912 345 678",
        walletAddress: "0x71C8366453AB548A31D08f237B855D282126B39a",
        status: UserStatus.ACTIVE,
        createdAt: "2026-01-01T00:00:00Z",
        passwordHash: demoHash,
      },
      {
        id: "usr_customer_insurance",
        email: "customer@insurance.com",
        fullName: "Nguyen Van A",
        role: UserRole.CUSTOMER,
        phoneNumber: "+84 912 345 678",
        walletAddress: "0x71C8366453AB548A31D08f237B855D282126B39a",
        status: UserStatus.ACTIVE,
        createdAt: "2026-01-01T00:00:00Z",
        passwordHash: demoHash,
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
        passwordHash: demoHash,
      },
      {
        id: "usr_reviewer_1",
        email: "reviewer@insurance.com",
        fullName: "Le Minh Reviewer",
        role: UserRole.CLAIM_REVIEWER,
        phoneNumber: "+84 903 111 222",
        status: UserStatus.ACTIVE,
        createdAt: "2025-11-01T00:00:00Z",
        passwordHash: demoHash,
      },
      {
        id: "usr_finance_1",
        email: "finance@insurance.com",
        fullName: "Pham Thi Finance",
        role: UserRole.FINANCE,
        phoneNumber: "+84 905 333 444",
        status: UserStatus.ACTIVE,
        createdAt: "2025-11-01T00:00:00Z",
        passwordHash: demoHash,
      },
      {
        id: "usr_admin_1",
        email: "admin@insurance.com",
        fullName: "Admin Hoang Vu",
        role: UserRole.ADMIN,
        phoneNumber: "+84 909 999 888",
        status: UserStatus.ACTIVE,
        createdAt: "2025-01-01T00:00:00Z",
        passwordHash: demoHash,
      },
    ];

    for (const u of users) {
      const existing = await UserRepository.findById(u.id);
      if (!existing) {
        await UserRepository.create(u);
      }
    }
  }

  // 2. Seed Policies (pol-101 to pol-104)
  const policies = [
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
      coverages: [
        { name: "Inpatient Hospitalization", maxAmount: 30000, description: "Room & board, intensive care, and surgical treatments." },
        { name: "Outpatient Medical", maxAmount: 12000, description: "Doctor consultations, emergency visits, lab tests." },
        { name: "Prescription Drugs", maxAmount: 8000, description: "Medically necessary prescribed medications." },
      ],
      createdAt: "2026-01-01T00:00:00Z",
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
      coverages: [
        { name: "Vehicle Collision & Damage", maxAmount: 15000, description: "Collision repair costs up to vehicle market value." },
        { name: "Third-Party Liability", maxAmount: 8000, description: "Bodily injury and property damage to third parties." },
      ],
      createdAt: "2026-03-15T00:00:00Z",
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
      coverages: [
        { name: "Structural Fire Damage", maxAmount: 70000, description: "Reconstruction of physical dwelling premises." },
      ],
      createdAt: "2025-06-01T00:00:00Z",
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
      coverages: [
        { name: "Vehicle Damage", maxAmount: 12000, description: "Collision and repair reimbursement." },
        { name: "Third-Party Liability", maxAmount: 8000, description: "Legal third-party indemnity." },
      ],
      createdAt: "2026-02-01T00:00:00Z",
    },
  ];

  for (const pol of policies) {
    const existing = await PolicyRepository.findById(pol.id);
    if (!existing) {
      await PolicyRepository.create(pol);
    }
  }

  // 3. Seed Claims (clm-101, clm-501 to clm-506)
  const claims = [
    {
      id: "clm-101",
      claimNumber: "CLM-2026-001",
      policyId: "pol-101",
      customerId: "usr_customer_default",
      customerName: "Nguyen Van A",
      incidentDate: "2026-03-01",
      incidentType: "Emergency Hospitalization",
      location: "City General Hospital",
      description: "Acute appendicitis surgery and 3-day recovery stay",
      requestedAmount: 4200,
      approvedAmount: 4000,
      status: ClaimStatus.APPROVED,
      reviewerId: "usr_reviewer_1",
      reviewNotes: "Verified hospital admission and operative record.",
      version: 2,
      createdAt: "2026-03-02T10:00:00Z",
      updatedAt: "2026-03-03T14:30:00Z",
      evidence: [],
    },
    {
      id: "clm-501",
      claimNumber: "CLM-2026-881",
      policyId: "pol-101",
      customerId: "usr_customer_default",
      customerName: "Nguyen Van A",
      requestedAmount: 1850,
      description: "Emergency inpatient hospitalization following acute viral infection at Central Medical Hospital.",
      incidentDate: "2026-09-15",
      incidentType: "Medical",
      location: "Central Medical Hospital",
      status: ClaimStatus.UNDER_REVIEW,
      reviewNotes: "Initial evidence documents received. Reviewing medical discharge summary and room charge limits.",
      reviewerId: "usr_reviewer_1",
      version: 1,
      createdAt: "2026-09-16T08:30:00Z",
      updatedAt: "2026-09-17T14:20:00Z",
      evidence: [],
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
      incidentType: "Vehicle Collision",
      location: "Highway 1A",
      status: ClaimStatus.PAYMENT_PENDING,
      reviewNotes: "Damage appraisal confirmed. Approved full deductible reimbursement. Scheduled for smart contract payout.",
      reviewerId: "usr_reviewer_1",
      version: 2,
      createdAt: "2026-08-21T10:15:00Z",
      updatedAt: "2026-08-24T16:00:00Z",
      evidence: [],
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
      incidentType: "Dental",
      location: "City Dental Clinic",
      status: ClaimStatus.PAID,
      reviewNotes: "Claim approved and disbursed via smart contract escrow.",
      reviewerId: "usr_reviewer_1",
      blockchainTxHash: "0x89e2f491c107bcda049281a8b38102d8471c947210293847561029384756a1b2",
      version: 2,
      createdAt: "2026-07-11T09:00:00Z",
      updatedAt: "2026-07-13T11:45:00Z",
      evidence: [],
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
      incidentType: "Windshield Damage",
      location: "Highway 1A",
      status: ClaimStatus.SUBMITTED,
      version: 1,
      createdAt: "2026-09-26T14:10:00Z",
      updatedAt: "2026-09-26T14:10:00Z",
      evidence: [],
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
      incidentType: "Property Water Damage",
      location: "Residential Home",
      status: ClaimStatus.REJECTED,
      reviewNotes: "Rejection: Incident occurred outside policy coverage active window.",
      reviewerId: "usr_reviewer_1",
      version: 2,
      createdAt: "2026-06-20T11:00:00Z",
      updatedAt: "2026-06-22T09:30:00Z",
      evidence: [],
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
      incidentType: "Vehicle Collision",
      location: "Hanoi Highway",
      status: ClaimStatus.UNDER_REVIEW,
      reviewerId: "usr_reviewer_1",
      version: 1,
      createdAt: "2026-09-03T16:00:00Z",
      updatedAt: "2026-09-04T10:00:00Z",
      evidence: [],
    },
  ];

  for (const c of claims) {
    const existing = await ClaimRepository.findById(c.id);
    if (!existing) {
      await ClaimRepository.create(c);
    }
  }

  // 4. Seed Reviews (rev-1, rev-2, rev-3)
  const reviews = [
    {
      id: "rev-1",
      claimId: "clm-503",
      reviewerId: "usr_reviewer_1",
      reviewerName: "Le Minh Reviewer",
      decision: "APPROVED" as const,
      approvedAmount: 800,
      notes: "Dental surgery bills verified against policy coverage limit. Approved for instant payout.",
      createdAt: "2026-07-13T10:00:00Z",
    },
    {
      id: "rev-2",
      claimId: "clm-502",
      reviewerId: "usr_reviewer_1",
      reviewerName: "Le Minh Reviewer",
      decision: "APPROVED" as const,
      approvedAmount: 4200,
      notes: "Collision damage appraisal verified by partner mechanic.",
      createdAt: "2026-08-24T15:30:00Z",
    },
    {
      id: "rev-3",
      claimId: "clm-505",
      reviewerId: "usr_reviewer_1",
      reviewerName: "Le Minh Reviewer",
      decision: "REJECTED" as const,
      reason: "Policy expired",
      notes: "Incident occurred after policy expiration date (2026-06-01).",
      createdAt: "2026-06-22T09:30:00Z",
    },
  ];

  for (const r of reviews) {
    const existing = await ReviewRepository.findById(r.id);
    if (!existing) {
      await ReviewRepository.create(r);
    }
  }

  // 5. Seed Payments (pmt-101, pay-101, pay-102)
  const payments = [
    {
      id: "pmt-101",
      claimId: "clm-101",
      policyId: "pol-101",
      customerId: "usr_customer_default",
      customerName: "Nguyen Van A",
      amount: 4000,
      status: PaymentStatus.PENDING,
      paymentMethod: "CRYPTO_SMART_CONTRACT",
      recipientWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
      createdAt: "2026-03-03T14:30:00Z",
    },
    {
      id: "pay-101",
      claimId: "clm-503",
      policyId: "pol-101",
      customerId: "usr_customer_default",
      customerName: "Nguyen Van A",
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
      customerName: "Nguyen Van A",
      amount: 4200,
      status: PaymentStatus.PENDING,
      paymentMethod: "CRYPTO_SMART_CONTRACT",
      recipientWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
      createdAt: "2026-08-24T16:00:00Z",
    },
  ];

  for (const p of payments) {
    const existing = await PaymentRepository.findById(p.id);
    if (!existing) {
      await PaymentRepository.create(p);
    }
  }

  // 6. Seed Blockchain Transactions (bctx-1, bctx-2)
  const bctxs = [
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

  for (const tx of bctxs) {
    const existing = await BlockchainTransactionRepository.findByTxHash(tx.txHash);
    if (!existing) {
      await BlockchainTransactionRepository.create(tx);
    }
  }

  // 7. Seed Notifications
  const existingNotifs = await NotificationRepository.findByUserId("usr_customer_default");
  if (existingNotifs.length === 0) {
    const notifications = [
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

    for (const notif of notifications) {
      await NotificationRepository.create(notif);
    }
  }

  // 8. Seed Audit Logs
  const auditCount = await AuditRepository.count();
  if (auditCount === 0) {
    const auditLogs: AuditLog[] = [
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

    for (const log of auditLogs) {
      await AuditRepository.create(log);
    }
  }
}

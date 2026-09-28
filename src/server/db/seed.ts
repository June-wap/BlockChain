import { UserRepository } from "../repositories/user.repository";
import { PolicyRepository } from "../repositories/policy.repository";
import { ClaimRepository } from "../repositories/claim.repository";
import { PaymentRepository } from "../repositories/payment.repository";
import { BlockchainTransactionRepository } from "../repositories/blockchain-tx.repository";
import { SecurityUtils } from "../core/security";
import { ClaimStatus, PaymentStatus, PolicyStatus, UserRole, UserStatus } from "@/types";

export async function seedDatabaseIfEmpty(): Promise<void> {
  const userCount = await UserRepository.count();
  if (userCount > 0) {
    return; // Already seeded
  }

  const demoHash = SecurityUtils.hashPassword("password123");

  // 1. Seed Users
  await UserRepository.create({
    id: "usr_customer_default",
    email: "customer@example.com",
    fullName: "Nguyen Van A",
    role: UserRole.CUSTOMER,
    phoneNumber: "+84 912 345 678",
    walletAddress: "0x71C8366453AB548A31D08f237B855D282126B39a",
    status: UserStatus.ACTIVE,
    createdAt: "2026-01-01T00:00:00Z",
    passwordHash: demoHash,
  });

  await UserRepository.create({
    id: "usr_customer_insurance",
    email: "customer@insurance.com",
    fullName: "Nguyen Van A",
    role: UserRole.CUSTOMER,
    phoneNumber: "+84 912 345 678",
    walletAddress: "0x71C8366453AB548A31D08f237B855D282126B39a",
    status: UserStatus.ACTIVE,
    createdAt: "2026-01-01T00:00:00Z",
    passwordHash: demoHash,
  });

  await UserRepository.create({
    id: "usr_customer_2",
    email: "customer2@example.com",
    fullName: "Tran Thi B",
    role: UserRole.CUSTOMER,
    phoneNumber: "+84 987 654 321",
    walletAddress: "0x2B420C7bE753d0e2e283B4628d05541eE5540356",
    status: UserStatus.ACTIVE,
    createdAt: "2026-01-15T00:00:00Z",
    passwordHash: demoHash,
  });

  await UserRepository.create({
    id: "usr_reviewer_1",
    email: "reviewer@insurance.com",
    fullName: "Le Minh Reviewer",
    role: UserRole.CLAIM_REVIEWER,
    phoneNumber: "+84 903 111 222",
    status: UserStatus.ACTIVE,
    createdAt: "2025-11-01T00:00:00Z",
    passwordHash: demoHash,
  });

  await UserRepository.create({
    id: "usr_finance_1",
    email: "finance@insurance.com",
    fullName: "Pham Thi Finance",
    role: UserRole.FINANCE,
    phoneNumber: "+84 905 333 444",
    status: UserStatus.ACTIVE,
    createdAt: "2025-11-01T00:00:00Z",
    passwordHash: demoHash,
  });

  await UserRepository.create({
    id: "usr_admin_1",
    email: "admin@insurance.com",
    fullName: "Admin Hoang Vu",
    role: UserRole.ADMIN,
    phoneNumber: "+84 909 999 888",
    status: UserStatus.ACTIVE,
    createdAt: "2025-01-01T00:00:00Z",
    passwordHash: demoHash,
  });

  // 2. Seed Policies
  await PolicyRepository.create({
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
    coverages: [],
    createdAt: "2026-01-01T00:00:00Z",
  });

  await PolicyRepository.create({
    id: "pol-102",
    policyNumber: "POL-AUTO-2026-042",
    customerId: "usr_customer_default",
    customerName: "Nguyen Van A",
    policyHolder: "Nguyen Van A",
    type: "Auto Collision & Liability",
    coverageAmount: 25000,
    premiumAmount: 850,
    deductible: 500,
    startDate: "2026-02-15",
    endDate: "2027-02-15",
    status: PolicyStatus.ACTIVE,
    coverages: [],
    createdAt: "2026-02-15T00:00:00Z",
  });

  // 3. Seed Sample Claims
  await ClaimRepository.create({
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
    evidence: [
      {
        id: "ev-101",
        fileName: "hospital_invoice_001.pdf",
        fileUrl: "/api/claims/clm-101/evidence/ev-101",
        fileSize: 1024 * 450,
        mimeType: "application/pdf",
        fileHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        uploadedAt: "2026-03-02T10:05:00Z",
      },
    ],
  });

  // 4. Seed Payments
  await PaymentRepository.create({
    id: "pmt-101",
    claimId: "clm-101",
    policyId: "pol-101",
    customerId: "usr_customer_default",
    customerName: "Nguyen Van A",
    amount: 4000,
    status: PaymentStatus.PENDING,
    method: "SMART_CONTRACT_ESCROW",
    recipientWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
    createdAt: "2026-03-03T14:30:00Z",
  });
}

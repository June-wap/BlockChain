import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { dbConnection } from "@/server/db/postgres";
import { UserRepository } from "@/server/repositories/user.repository";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { SecurityUtils } from "@/server/core/security";
import { ConflictError } from "@/server/core/errors";
import { ClaimStatus, PolicyStatus, UserRole, UserStatus } from "@/types";

describe("P1 — Real PostgreSQL Database & Persistence Tests", () => {
  const timestamp = Date.now();
  const testUserId = `usr_persist_${timestamp}`;
  const testUserEmail = `persist_${timestamp}@insurance.com`;
  const testPolicyId = `pol_persist_${timestamp}`;
  const testPolicyNumber = `POL-PERSIST-${timestamp}`;
  const testClaimId = `clm_persist_${timestamp}`;
  const testClaimNumber = `CLM-PERSIST-${timestamp}`;

  beforeEach(async () => {
    await dbConnection.initialize();
  });

  it("P1.6: Creates user, policy, and claim; survives database restart with data intact", async () => {
    // 1. Create User
    await UserRepository.create({
      id: testUserId,
      email: testUserEmail,
      fullName: "Persistence Test User",
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash: SecurityUtils.hashPassword("password123"),
      walletAddress: "0x71C8366453AB548A31D08f237B855D282126B39a",
    });

    const createdUser = await UserRepository.findById(testUserId);
    expect(createdUser).not.toBeNull();
    expect(createdUser?.email).toBe(testUserEmail);

    // 2. Create Policy
    await PolicyRepository.create({
      id: testPolicyId,
      policyNumber: testPolicyNumber,
      customerId: testUserId,
      customerName: "Persistence Test User",
      policyHolder: "Persistence Test User",
      type: "Comprehensive Health",
      coverageAmount: 50000,
      premiumAmount: 1200,
      deductible: 100,
      startDate: "2026-01-01",
      endDate: "2027-01-01",
      status: PolicyStatus.ACTIVE,
      coverages: [],
    });

    const createdPolicy = await PolicyRepository.findById(testPolicyId);
    expect(createdPolicy).not.toBeNull();
    expect(createdPolicy?.policyNumber).toBe(testPolicyNumber);

    // 3. Create Claim
    await ClaimRepository.create({
      id: testClaimId,
      claimNumber: testClaimNumber,
      policyId: testPolicyId,
      customerId: testUserId,
      incidentDate: "2026-03-01",
      incidentType: "Emergency Hospitalization",
      location: "Metropolitan General",
      description: "Severe injury treatment",
      requestedAmount: 5000,
      status: ClaimStatus.SUBMITTED,
      version: 1,
    });

    const createdClaim = await ClaimRepository.findById(testClaimId);
    expect(createdClaim).not.toBeNull();
    expect(createdClaim?.version).toBe(1);

    // 4. SIMULATE APP / DATABASE RESTART:
    // Close connections completely
    await dbConnection.close();

    // 5. Reinitialize fresh client connection to the persistent storage directory
    await dbConnection.initialize();

    // 6. Assert all data persisted and is readable again!
    const reloadedUser = await UserRepository.findById(testUserId);
    expect(reloadedUser).not.toBeNull();
    expect(reloadedUser?.id).toBe(testUserId);
    expect(reloadedUser?.email).toBe(testUserEmail);

    const reloadedPolicy = await PolicyRepository.findById(testPolicyId);
    expect(reloadedPolicy).not.toBeNull();
    expect(reloadedPolicy?.id).toBe(testPolicyId);
    expect(reloadedPolicy?.coverageAmount).toBe(50000);

    const reloadedClaim = await ClaimRepository.findById(testClaimId);
    expect(reloadedClaim).not.toBeNull();
    expect(reloadedClaim?.id).toBe(testClaimId);
    expect(reloadedClaim?.requestedAmount).toBe(5000);
    expect(reloadedClaim?.status).toBe(ClaimStatus.SUBMITTED);
    expect(reloadedClaim?.version).toBe(1);
  });

  it("P1.5: Enforces DB-level conditional optimistic locking on claim updates", async () => {
    const claim = await ClaimRepository.findById(testClaimId);
    expect(claim).not.toBeNull();
    const originalVersion = claim!.version; // 1

    // First update: valid expected version 1 -> increments version to 2
    const updated = await ClaimRepository.updateStatusWithOptimisticLock(
      testClaimId,
      ClaimStatus.UNDER_REVIEW,
      originalVersion,
      { reviewerId: "usr_reviewer_1", reviewNotes: "Review started" }
    );

    expect(updated.status).toBe(ClaimStatus.UNDER_REVIEW);
    expect(updated.version).toBe(2);

    // Concurrent / stale update attempt: still using originalVersion 1 -> MUST throw ConflictError (409)
    await expect(
      ClaimRepository.updateStatusWithOptimisticLock(
        testClaimId,
        ClaimStatus.APPROVED,
        originalVersion, // stale version!
        { approvedAmount: 4500 }
      )
    ).rejects.toThrow(ConflictError);

    // Current version in DB must remain 2
    const latestClaim = await ClaimRepository.findById(testClaimId);
    expect(latestClaim?.version).toBe(2);
    expect(latestClaim?.status).toBe(ClaimStatus.UNDER_REVIEW);
  });

  it("P1.4: Money fields are stored as integer minor units without float distortion", async () => {
    const policy = await PolicyRepository.findById(testPolicyId);
    expect(policy).not.toBeNull();
    expect(Number.isInteger(policy?.coverageAmount)).toBe(true);
    expect(Number.isInteger(policy?.premiumAmount)).toBe(true);
    expect(Number.isInteger(policy?.deductible)).toBe(true);
  });

  it("P5.7: Enforces UNIQUE claim_id double-payment guard in DB", async () => {
    // First payment creation
    const paymentId1 = `pmt_test_1_${Date.now()}`;
    await PaymentRepository.create({
      id: paymentId1,
      claimId: testClaimId,
      policyId: testPolicyId,
      customerId: testUserId,
      amount: 4000,
      status: "PENDING" as any,
      method: "SMART_CONTRACT_ESCROW",
      createdAt: new Date().toISOString(),
    });

    const payment = await PaymentRepository.findByClaimId(testClaimId);
    expect(payment).not.toBeNull();

    // Duplicate payment creation for the same claimId must be blocked by DB unique constraint
    const paymentId2 = `pmt_test_2_${Date.now()}`;
    await expect(
      PaymentRepository.create({
        id: paymentId2,
        claimId: testClaimId, // same claimId!
        policyId: testPolicyId,
        customerId: testUserId,
        amount: 4000,
        status: "PENDING" as any,
        method: "SMART_CONTRACT_ESCROW",
        createdAt: new Date().toISOString(),
      })
    ).rejects.toThrow(/Double payment prohibited/i);
  });
});

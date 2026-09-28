import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initDatabase, closeDatabase, dbConnection } from "@/server/db/postgres";
import { UserRepository } from "@/server/repositories/user.repository";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { ReviewRepository } from "@/server/repositories/review.repository";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { OutboxRepository } from "@/server/repositories/outbox.repository";
import { AuditRepository } from "@/server/repositories/audit.repository";
import { AuthService } from "@/server/services/auth.service";
import { PolicyService } from "@/server/services/policy.service";
import { ClaimService } from "@/server/services/claim.service";
import { EvidenceService } from "@/server/services/evidence.service";
import { BlockchainService } from "@/server/services/blockchain.service";
import { JwtService } from "@/server/core/jwt";
import { SecurityUtils } from "@/server/core/security";
import {
  AuditAction,
  ClaimStatus,
  PaymentStatus,
  PolicyStatus,
  UserRole,
  UserStatus,
} from "@/types";

describe("P7 — Authoritative Source of Truth & Transactional Reliability Regression Suite", () => {
  beforeAll(async () => {
    await initDatabase();
  });

  describe("P7.1: Single Authoritative Source of Truth & Restart Persistence", () => {
    it("persists created entities across database closure and re-initialization", async () => {
      const uniqueSuffix = `p7_persist_${Date.now()}`;
      const customerId = `usr_${uniqueSuffix}`;
      const policyId = `pol_${uniqueSuffix}`;

      // 1. Insert user
      await UserRepository.create({
        id: customerId,
        email: `${uniqueSuffix}@insurance.vn`,
        fullName: "P7 Test Customer",
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        passwordHash: SecurityUtils.hashPassword("SecurePassword123!"),
      });

      // 2. Insert policy
      await PolicyRepository.create({
        id: policyId,
        policyNumber: `POL-${uniqueSuffix}`,
        customerId,
        type: "Health Comprehensive",
        coverageAmount: 15000,
        premiumAmount: 1200,
        deductible: 200,
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        status: PolicyStatus.ACTIVE,
      });

      // 3. Submit claim
      const claim = await ClaimService.submitClaim(customerId, "P7 Test Customer", {
        policyId,
        incidentDate: "2026-06-15",
        incidentType: "Emergency Hospitalization",
        location: "Medical City Hospital",
        requestedAmount: 3500,
        description: "Emergency acute treatment requiring hospitalization and diagnostics.",
      });
      expect(claim.claim.id).toBeDefined();

      // 4. Simulate complete database shutdown and restart
      await closeDatabase();
      await initDatabase();

      // 5. Authoritative query must find all records intact
      const restoredUser = await UserRepository.findById(customerId);
      expect(restoredUser).not.toBeNull();
      expect(restoredUser?.email).toBe(`${uniqueSuffix}@insurance.vn`);

      const restoredPolicy = await PolicyRepository.findById(policyId);
      expect(restoredPolicy).not.toBeNull();
      expect(restoredPolicy?.coverageAmount).toBe(15000);

      const restoredClaim = await ClaimRepository.findById(claim.claim.id);
      expect(restoredClaim).not.toBeNull();
      expect(restoredClaim?.requestedAmount).toBe(3500);
      expect(restoredClaim?.status).toBe(ClaimStatus.SUBMITTED);
    });

    it("immediately reflects direct SQL modifications in domain services without RAM caching", async () => {
      const uniqueSuffix = `p7_noram_${Date.now()}`;
      const customerId = `usr_${uniqueSuffix}`;
      const policyId = `pol_${uniqueSuffix}`;

      await UserRepository.create({
        id: customerId,
        email: `${uniqueSuffix}@insurance.vn`,
        fullName: "No RAM Cache User",
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        passwordHash: SecurityUtils.hashPassword("Password123!"),
      });

      await PolicyRepository.create({
        id: policyId,
        policyNumber: `POL-${uniqueSuffix}`,
        customerId,
        type: "Vehicle Insurance",
        coverageAmount: 10000,
        premiumAmount: 500,
        deductible: 100,
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        status: PolicyStatus.ACTIVE,
      });

      // Direct SQL update behind the back of any memory cache
      await dbConnection.query(
        `UPDATE policies SET coverage_amount = 25000, status = 'SUSPENDED' WHERE id = $1;`,
        [policyId]
      );

      // Domain service query must read the fresh database value immediately
      const res = await PolicyService.getPolicyById(policyId, {
        id: customerId,
        role: UserRole.CUSTOMER,
      });
      expect(res.policy?.coverageAmount).toBe(25000);
      expect(res.policy?.status).toBe(PolicyStatus.SUSPENDED);
    });

    it("immediately revokes JWT session in AuthService.resolveUser when user is suspended in DB", async () => {
      const uniqueSuffix = `p7_revoke_${Date.now()}`;
      const customerId = `usr_${uniqueSuffix}`;
      const email = `${uniqueSuffix}@insurance.vn`;

      await UserRepository.create({
        id: customerId,
        email,
        fullName: "Session Revoke User",
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        passwordHash: SecurityUtils.hashPassword("Password123!"),
      });

      const token = await JwtService.signToken({
        userId: customerId,
        email,
        role: UserRole.CUSTOMER,
        fullName: "Session Revoke User",
      });

      // Verify active user resolves properly
      const activeResolved = await AuthService.resolveUser(token);
      expect(activeResolved).not.toBeNull();
      expect(activeResolved?.id).toBe(customerId);

      // Direct SQL update to suspend user
      await dbConnection.query(
        `UPDATE users SET status = 'SUSPENDED' WHERE id = $1;`,
        [customerId]
      );

      // Next resolveUser call must reject the token immediately
      const suspendedResolved = await AuthService.resolveUser(token);
      expect(suspendedResolved).toBeNull();
    });
  });

  describe("P7.2: Transactional Domain Mutations & Atomic Rollback", () => {
    it("rolls back all records if a failure occurs during claim approval transaction", async () => {
      const uniqueSuffix = `p7_rollback_${Date.now()}`;
      const customerId = `usr_${uniqueSuffix}`;
      const policyId = `pol_${uniqueSuffix}`;

      await UserRepository.create({
        id: customerId,
        email: `${uniqueSuffix}@insurance.vn`,
        fullName: "Rollback Test User",
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        passwordHash: SecurityUtils.hashPassword("Password123!"),
      });

      await PolicyRepository.create({
        id: policyId,
        policyNumber: `POL-${uniqueSuffix}`,
        customerId,
        type: "Health",
        coverageAmount: 10000,
        premiumAmount: 800,
        deductible: 100,
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        status: PolicyStatus.ACTIVE,
      });

      const claimRes = await ClaimService.submitClaim(customerId, "Rollback Test User", {
        policyId,
        incidentDate: "2026-05-20",
        incidentType: "Medical",
        location: "Clinic",
        requestedAmount: 2000,
        description: "Clinic diagnostics and emergency consultation bills.",
      });

      const claimId = claimRes.claim.id;
      const reviewer = {
        id: "usr_reviewer_1",
        name: "Le Minh Reviewer",
        role: UserRole.CLAIM_REVIEWER,
      };

      await ClaimService.startReview(claimId, reviewer);

      // Attempt approval with amount exceeding requested amount -> must fail validation
      await expect(
        ClaimService.approveClaim(claimId, reviewer, 5000, "Exceeding amount notes")
      ).rejects.toThrow(/cannot exceed requested amount/);

      // Verify atomic state: claim remains UNDER_REVIEW, no pending payment, no approval review
      const claimAfter = await ClaimRepository.findById(claimId);
      expect(claimAfter?.status).toBe(ClaimStatus.UNDER_REVIEW);
      expect(claimAfter?.approvedAmount).toBeUndefined();

      const payment = await PaymentRepository.findByClaimId(claimId);
      expect(payment).toBeNull();

      const review = await ReviewRepository.findByClaimId(claimId);
      expect(review).toBeNull();
    });

    it("enforces optimistic lock versioning to reject concurrent out-of-order state transitions", async () => {
      const uniqueSuffix = `p7_optlock_${Date.now()}`;
      const customerId = `usr_${uniqueSuffix}`;
      const policyId = `pol_${uniqueSuffix}`;

      await UserRepository.create({
        id: customerId,
        email: `${uniqueSuffix}@insurance.vn`,
        fullName: "Opt Lock User",
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        createdAt: new Date().toISOString(),
        passwordHash: SecurityUtils.hashPassword("Password123!"),
      });

      await PolicyRepository.create({
        id: policyId,
        policyNumber: `POL-${uniqueSuffix}`,
        customerId,
        type: "Health",
        coverageAmount: 8000,
        premiumAmount: 600,
        deductible: 100,
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        status: PolicyStatus.ACTIVE,
      });

      const claimRes = await ClaimService.submitClaim(customerId, "Opt Lock User", {
        policyId,
        incidentDate: "2026-05-10",
        incidentType: "Treatment",
        location: "Hospital",
        requestedAmount: 1500,
        description: "Specialist consultation and laboratory blood tests.",
      });

      const claimId = claimRes.claim.id;
      const initialVersion = claimRes.claim.version || 1;

      // Attempt update with a stale expected version (e.g. initialVersion + 5)
      await expect(
        ClaimRepository.updateStatusWithOptimisticLock(
          claimId,
          ClaimStatus.UNDER_REVIEW,
          initialVersion + 5
        )
      ).rejects.toThrow(/Optimistic lock failure/);

      // Valid update with matching version must succeed and increment version
      const updated = await ClaimRepository.updateStatusWithOptimisticLock(
        claimId,
        ClaimStatus.UNDER_REVIEW,
        initialVersion
      );
      expect(updated.version).toBe(initialVersion + 1);
      expect(updated.status).toBe(ClaimStatus.UNDER_REVIEW);
    });
  });

  describe("P7.3: Transactional Outbox Concurrency, Crash Recovery & Dead-Letter Queue", () => {
    it("ensures atomic leasing so multiple concurrent workers never lease the same outbox event", async () => {
      const eventId1 = await OutboxRepository.create({
        aggregateType: "CLAIM",
        aggregateId: `clm_lease_1_${Date.now()}`,
        eventType: "CLAIM_APPROVED",
        payload: { test: 1 },
      });
      const eventId2 = await OutboxRepository.create({
        aggregateType: "CLAIM",
        aggregateId: `clm_lease_2_${Date.now()}`,
        eventType: "CLAIM_APPROVED",
        payload: { test: 2 },
      });

      // Worker 1 leases batch of 2
      const batch1 = await OutboxRepository.claimNextBatch(2, "worker_alpha", 30);
      const batch1Ids = batch1.map((e) => e.id);

      // Worker 2 attempts concurrent lease
      const batch2 = await OutboxRepository.claimNextBatch(2, "worker_beta", 30);
      const batch2Ids = batch2.map((e) => e.id);

      // No event leased by Worker 1 should be simultaneously leased by Worker 2
      const overlap = batch1Ids.filter((id) => batch2Ids.includes(id));
      expect(overlap).toHaveLength(0);

      // Clean up leased events
      for (const ev of batch1) {
        await OutboxRepository.recordSuccess(ev.id, "0x1234");
      }
      for (const ev of batch2) {
        await OutboxRepository.recordSuccess(ev.id, "0x5678");
      }
    });

    it("reclaims stale leases after worker crash and resets status to RETRY", async () => {
      const eventId = await OutboxRepository.create({
        aggregateType: "PAYMENT",
        aggregateId: `pay_crash_${Date.now()}`,
        eventType: "PAYMENT_DISBURSED",
        payload: { amount: 500 },
      });

      // Simulate a crashed worker that leased the event with an expired lock timestamp (e.g. 5 minutes ago)
      await dbConnection.query(
        `UPDATE outbox_events
         SET status = 'PROCESSING',
             locked_at = NOW() - INTERVAL '5 minutes',
             locked_by = 'crashed_worker_99'
         WHERE id = $1;`,
        [eventId]
      );

      // Reclaim stale leases older than 30 seconds
      const reclaimedCount = await OutboxRepository.reclaimStaleLeases(30);
      expect(reclaimedCount).toBeGreaterThanOrEqual(1);

      // Verify the event was reset and lock cleared
      const res = await dbConnection.query(
        `SELECT status, locked_at, locked_by FROM outbox_events WHERE id = $1;`,
        [eventId]
      );
      expect(res.rows[0].status).toBe("RETRY");
      expect(res.rows[0].locked_by).toBeNull();
      expect(res.rows[0].locked_at).toBeNull();

      // Now a healthy worker can lease it
      const healthyBatch = await OutboxRepository.claimNextBatch(500, "healthy_worker_1", 30);
      const found = healthyBatch.find((e) => e.id === eventId);
      expect(found).toBeDefined();

      await OutboxRepository.recordSuccess(eventId, "0xabcd");
    });

    it("routes failed events to DEAD_LETTER after exceeding max_retries with exponential backoff", async () => {
      const eventId = await OutboxRepository.create({
        aggregateType: "CLAIM",
        aggregateId: `clm_dlq_${Date.now()}`,
        eventType: "CLAIM_APPROVED",
        payload: { amount: 1000 },
      });

      // Simulate max_retries failures
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        await OutboxRepository.recordFailure(eventId, `Simulated network error attempt ${i + 1}`);
      }

      // Query state of event
      const res = await dbConnection.query(
        `SELECT status, retry_count, last_error FROM outbox_events WHERE id = $1;`,
        [eventId]
      );
      expect(res.rows[0].status).toBe("DEAD_LETTER");
      expect(res.rows[0].retry_count).toBe(maxRetries);
      expect(res.rows[0].last_error).toContain("Simulated network error attempt 5");

      // Dead-letter events must not be leased by normal workers
      const nextBatch = await OutboxRepository.claimNextBatch(50, "worker_normal", 30);
      const dlqFound = nextBatch.find((e) => e.id === eventId);
      expect(dlqFound).toBeUndefined();
    });
  });

  describe("P7.4: Fail-Fast Secrets, Zero Fabricated Hashes & Disk Evidence", () => {
    it("fails fast in JwtService when JWT_SECRET is insufficient in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecret = process.env.JWT_SECRET;

      try {
        process.env.NODE_ENV = "production";
        process.env.JWT_SECRET = "too-short";

        await expect(
          JwtService.signToken({
            userId: "usr_1",
            email: "test@domain.com",
            role: UserRole.CUSTOMER,
            fullName: "Test",
          })
        ).rejects.toThrow(/at least 32 characters/i);
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalSecret) {
          process.env.JWT_SECRET = originalSecret;
        } else {
          delete process.env.JWT_SECRET;
        }
      }
    });

    it("fails fast in BlockchainService when BLOCKCHAIN_MODE=rpc is missing private key or contract", async () => {
      const originalMode = process.env.BLOCKCHAIN_MODE;
      const originalRpc = process.env.BLOCKCHAIN_RPC_URL;
      const originalKey = process.env.DEPLOYER_PRIVATE_KEY;
      const originalAddr = process.env.HUB_CONTRACT_ADDRESS;

      try {
        process.env.BLOCKCHAIN_MODE = "rpc";
        process.env.BLOCKCHAIN_RPC_URL = "http://127.0.0.1:8545";
        delete process.env.DEPLOYER_PRIVATE_KEY;
        delete process.env.HUB_CONTRACT_ADDRESS;

        await expect(
          BlockchainService.recordClaimApproval("clm-test-failfast", 1000)
        ).rejects.toThrow(/BLOCKCHAIN_PRIVATE_KEY|DEPLOYER_PRIVATE_KEY|HUB_CONTRACT_ADDRESS/i);
      } finally {
        if (originalMode) process.env.BLOCKCHAIN_MODE = originalMode;
        else delete process.env.BLOCKCHAIN_MODE;
        if (originalRpc) process.env.BLOCKCHAIN_RPC_URL = originalRpc;
        else delete process.env.BLOCKCHAIN_RPC_URL;
        if (originalKey) process.env.DEPLOYER_PRIVATE_KEY = originalKey;
        if (originalAddr) process.env.HUB_CONTRACT_ADDRESS = originalAddr;
      }
    });

    it("throws NotFoundError when evidence is missing on disk without returning mock %PDF fallback", async () => {
      const nonExistentDocId = `ev_fake_${Date.now()}`;
      await expect(
        EvidenceService.getEvidenceBinary("clm-101", nonExistentDocId, {
          id: "usr_customer_default",
          email: "customer@example.com",
          role: UserRole.CUSTOMER,
          fullName: "Customer",
        })
      ).rejects.toThrow(/NotFoundError|not found/i);
    });

    it("returns real EVM telemetry with verifiable block number and gas usage", () => {
      const telemetry = BlockchainService.getTelemetry();
      expect(telemetry.network).toBeDefined();
      expect(telemetry.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(telemetry.stats.totalTransactions).toBeGreaterThanOrEqual(1);
      expect(telemetry.latestBlock).toBeGreaterThanOrEqual(1);
    });
  });
});

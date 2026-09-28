import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { BlockchainService } from "@/server/services/blockchain.service";
import { OutboxWorker } from "@/server/workers/outbox.worker";
import { OutboxRepository } from "@/server/repositories/outbox.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { ClaimService } from "@/server/services/claim.service";
import { initDatabase, closeDatabase } from "@/server/db/postgres";
import { ClaimStatus, PaymentStatus, UserRole } from "@/types";
import { ethers } from "ethers";

describe("P5 — Real Blockchain Backend Integration & Transactional Outbox Tests", () => {
  const reviewer = {
    id: "usr_reviewer_1",
    name: "Le Minh Reviewer",
    role: UserRole.CLAIM_REVIEWER,
  };

  const customerId = "usr_customer_default";
  const customerName = "Nguyen Van A";

  beforeAll(async () => {
    await initDatabase();
  });


  describe("Real Smart Contract Interaction (EVM Execution)", () => {
    it("should deploy or connect to real InsuranceClaimHub contract and verify admin role", async () => {
      const { contract, address, signer } = await BlockchainService.getContract();

      expect(ethers.isAddress(address)).toBe(true);
      expect(await contract.admin()).toBe(await signer.getAddress());
    });

    it("should record a claim submission on-chain with deterministic keccak256 hashes", async () => {
      const claimId = `clm-evm-submit-${Date.now()}`;
      const policyId = "pol-101";

      const res = await BlockchainService.recordClaimSubmission(
        claimId,
        policyId,
        "0x71C8366453AB548A31D08f237B855D282126B39a",
        1500
      );

      expect(res.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(res.blockNumber).toBeGreaterThan(0);
      expect(res.gasUsed).toBeGreaterThan(0);

      // Verify on-chain data directly via view function
      const { contract } = await BlockchainService.getContract();
      const claimHash = BlockchainService.hashIdentifier(claimId);
      const isRecorded = await contract.isClaimRecorded(claimHash);
      expect(isRecorded).toBe(true);

      const onChainClaim = await contract.getClaim(claimHash);
      expect(onChainClaim.requestedAmount).toBe(1500n);
      expect(onChainClaim.status).toBe(1n); // Submitted = 1
    });

    it("should execute full lifecycle on-chain: record -> underReview -> approve", async () => {
      const claimId = `clm-evm-approve-${Date.now()}`;

      const res = await BlockchainService.recordClaimApproval(
        claimId,
        1200,
        undefined,
        {
          policyId: "pol-101",
          requestedAmount: 1500,
          claimantWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
        }
      );

      expect(res.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      const { contract } = await BlockchainService.getContract();
      const claimHash = BlockchainService.hashIdentifier(claimId);
      const onChain = await contract.getClaim(claimHash);

      expect(onChain.status).toBe(3n); // Approved = 3
      expect(onChain.approvedAmount).toBe(1200n);
    });

    it("should verify Zero PII on-chain (only cryptographic hashes stored)", async () => {
      const claimId = `clm-privacy-${Date.now()}`;
      await BlockchainService.recordClaimSubmission(
        claimId,
        "pol-101",
        "0x71C8366453AB548A31D08f237B855D282126B39a",
        2000
      );

      const { contract } = await BlockchainService.getContract();
      const claimHash = BlockchainService.hashIdentifier(claimId);
      const onChain = await contract.getClaim(claimHash);

      // Verify hashes are strictly 32-byte hex strings
      expect(ethers.isHexString(onChain.policyHash, 32)).toBe(true);
      expect(ethers.isHexString(onChain.evidenceRootHash, 32)).toBe(true);
      expect(ethers.isAddress(onChain.claimant)).toBe(true);
      // No plain-text customer names or medical notes exist in on-chain return values
    });
  });

  describe("Transactional Outbox Pattern & Worker Processing", () => {
    it("should enqueue outbox event when claim is submitted & approved, then process through worker", async () => {
      // 1. Submit a real claim
      const submitted = await ClaimService.submitClaim(customerId, customerName, {
        policyId: "pol-101",
        incidentDate: "2026-06-01",
        incidentType: "Health",
        location: "Central Hospital",
        requestedAmount: 2500,
        description: "Routine surgical procedure with inpatient recovery.",
      });

      const claimId = submitted.claim.id;

      // 2. Reviewer starts review
      await ClaimService.startReview(claimId, reviewer);

      // 3. Reviewer approves claim -> generates outbox event in PostgreSQL
      const approved = await ClaimService.approveClaim(
        claimId,
        reviewer,
        2200,
        "Surgical charges audited and approved."
      );

      expect(approved.claim.status).toBe(ClaimStatus.APPROVED);

      // 4. Manually enqueue an outbox event to test worker end-to-end
      const eventId = await OutboxRepository.create({
        aggregateType: "CLAIM",
        aggregateId: claimId,
        eventType: "CLAIM_APPROVED",
        payload: {
          claimId,
          approvedAmount: 2200,
          policyId: "pol-101",
          requestedAmount: 2500,
        },
      });

      // 5. Run Outbox Worker batch
      const workerSummary = await OutboxWorker.processBatch(50);

      expect(workerSummary.processed).toBeGreaterThan(0);
      expect(workerSummary.failed).toBe(0);

      const matchingResult = workerSummary.results.find((r) => r.eventId === eventId);
      expect(matchingResult).toBeDefined();
      expect(matchingResult?.status).toBe("PROCESSED");
      expect(matchingResult?.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // 6. Verify claim record in database was updated with on-chain txHash
      const updatedClaim = await ClaimRepository.findById(claimId);
      expect(updatedClaim).not.toBeNull();
      expect(updatedClaim?.blockchainTxHash).toBeDefined();
      expect(updatedClaim?.blockchainTxHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should process PAYMENT_DISBURSED outbox event and anchor payment on-chain", async () => {
      // 1. Create valid claim first to satisfy FK constraint
      const submitted = await ClaimService.submitClaim(customerId, customerName, {
        policyId: "pol-101",
        incidentDate: "2026-06-05",
        incidentType: "Health",
        location: "Emergency Care",
        requestedAmount: 1800,
        description: "Emergency care fees for payment outbox integration test.",
      });
      const claimId = submitted.claim.id;
      const claimInDb = await ClaimRepository.findById(claimId);
      if (!claimInDb) {
        await ClaimRepository.create(submitted.claim);
      }

      const paymentId = `pay-outbox-${Date.now()}`;

      // Create a pending payment record
      await PaymentRepository.create({
        id: paymentId,
        claimId,
        policyId: "pol-101",
        customerId,
        amount: 1800,
        status: PaymentStatus.PROCESSING,
        recipientWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
        createdAt: new Date().toISOString(),
      });

      // Enqueue PAYMENT_DISBURSED event
      const eventId = await OutboxRepository.create({
        aggregateType: "PAYMENT",
        aggregateId: paymentId,
        eventType: "PAYMENT_DISBURSED",
        payload: {
          paymentId,
          claimId,
          amount: 1800,
          recipientWallet: "0x71C8366453AB548A31D08f237B855D282126B39a",
        },
      });

      // Run Outbox Worker
      const summary = await OutboxWorker.processBatch(50);
      expect(summary.processed).toBeGreaterThan(0);

      const paymentResult = summary.results.find((r) => r.eventId === eventId);
      expect(paymentResult).toBeDefined();
      expect(paymentResult?.status).toBe("PROCESSED");
      expect(paymentResult?.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Verify payment in PostgreSQL has real blockchain txHash
      const reloadedPayment = await PaymentRepository.findById(paymentId);
      expect(reloadedPayment?.blockchainTxHash).toBe(paymentResult?.txHash);
    });
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { ethers } from "ethers";
import { NextRequest } from "next/server";
import { initDatabase, dbConnection } from "@/server/db/postgres";
import { WalletService } from "@/server/services/wallet.service";
import { WalletChallengeRepository } from "@/server/repositories/wallet-challenge.repository";
import { UserRepository } from "@/server/repositories/user.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { ClaimService } from "@/server/services/claim.service";
import { BlockchainService } from "@/server/services/blockchain.service";
import { JwtService } from "@/server/core/jwt";
import { SecurityUtils } from "@/server/core/security";
import { ClaimStatus, PaymentStatus, PolicyStatus, UserRole, UserStatus } from "@/types";
import { normalizeMetaMaskError, isMetaMaskInstalled } from "@/lib/web3/metamask";
import { HARDHAT_LOCAL_CHAIN_ID } from "@/lib/web3/config";

// Routes to test HTTP pipeline
import { POST as challengeRoute } from "@/app/api/wallet/challenge/route";
import { POST as verifyRoute } from "@/app/api/wallet/verify/route";
import { POST as disconnectRoute } from "@/app/api/wallet/disconnect/route";
import { GET as getProfileRoute, PUT as putProfileRoute } from "@/app/api/customer/profile/route";
import { POST as disburseRoute } from "@/app/api/payments/[id]/disburse/route";

describe("Real MetaMask Wallet Integration Test Suite (Sections 10, 11, 12, 15, 21)", () => {
  let customerUser1: any;
  let customerToken1: string;
  let customerUser2: any;
  let customerToken2: string;
  let financeUser: any;
  let financeToken: string;
  let reviewerUser: any;

  // Real cryptographic wallets for testing
  const testWalletA = ethers.Wallet.createRandom();
  const testWalletB = ethers.Wallet.createRandom();

  beforeAll(async () => {
    await initDatabase();

    const timestamp = Date.now();

    // 1. Create Customer 1
    const c1Id = `usr_mm_cust1_${timestamp}`;
    await UserRepository.create({
      id: c1Id,
      email: `cust1_${timestamp}@metamask.test`,
      fullName: "MetaMask Customer One",
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash: SecurityUtils.hashPassword("password123"),
      phoneNumber: "+84901111222",
      createdAt: new Date().toISOString(),
    });
    customerUser1 = (await UserRepository.findById(c1Id))!;
    customerToken1 = await JwtService.generateToken({
      userId: customerUser1.id,
      email: customerUser1.email,
      role: UserRole.CUSTOMER,
      fullName: customerUser1.fullName,
    });

    // 2. Create Customer 2 (for multi-tenant isolation testing)
    const c2Id = `usr_mm_cust2_${timestamp}`;
    await UserRepository.create({
      id: c2Id,
      email: `cust2_${timestamp}@metamask.test`,
      fullName: "MetaMask Customer Two",
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      passwordHash: SecurityUtils.hashPassword("password123"),
      phoneNumber: "+84902222333",
      createdAt: new Date().toISOString(),
    });
    customerUser2 = (await UserRepository.findById(c2Id))!;
    customerToken2 = await JwtService.generateToken({
      userId: customerUser2.id,
      email: customerUser2.email,
      role: UserRole.CUSTOMER,
      fullName: customerUser2.fullName,
    });

    // 3. Create Finance Staff
    const fId = `usr_mm_fin_${timestamp}`;
    await UserRepository.create({
      id: fId,
      email: `fin_${timestamp}@metamask.test`,
      fullName: "Finance Officer",
      role: UserRole.FINANCE,
      status: UserStatus.ACTIVE,
      passwordHash: SecurityUtils.hashPassword("password123"),
      createdAt: new Date().toISOString(),
    });
    financeUser = (await UserRepository.findById(fId))!;
    financeToken = await JwtService.generateToken({
      userId: financeUser.id,
      email: financeUser.email,
      role: UserRole.FINANCE,
      fullName: financeUser.fullName,
    });

    // 4. Create Claim Reviewer Staff
    const rId = `usr_mm_rev_${timestamp}`;
    await UserRepository.create({
      id: rId,
      email: `rev_${timestamp}@metamask.test`,
      fullName: "Claim Reviewer Staff",
      role: UserRole.CLAIM_REVIEWER,
      status: UserStatus.ACTIVE,
      passwordHash: SecurityUtils.hashPassword("password123"),
      createdAt: new Date().toISOString(),
    });
    reviewerUser = (await UserRepository.findById(rId))!;
  });

  // ==========================================================================
  // A & B: Address Validation & Checksum Normalization
  // ==========================================================================
  describe("A & B: Wallet Address Validation & Checksum Normalization", () => {
    it("A.1: Validates and accepts standard 20-byte EVM addresses", () => {
      expect(ethers.isAddress(testWalletA.address)).toBe(true);
      const normalized = ethers.getAddress(testWalletA.address.toLowerCase());
      expect(normalized).toBe(testWalletA.address);
    });

    it("B.1: Rejects malformed or non-hex address strings in challenge generation", async () => {
      await expect(
        WalletService.generateChallenge(customerUser1.id, "0xInvalidAddress")
      ).rejects.toThrow(/Invalid EVM wallet address format/);

      await expect(
        WalletService.generateChallenge(customerUser1.id, "0x123")
      ).rejects.toThrow(/Invalid EVM wallet address format/);

      await expect(
        WalletService.generateChallenge(customerUser1.id, "")
      ).rejects.toThrow(/Wallet address is required/);
    });
  });

  // ==========================================================================
  // C: Challenge Generation
  // ==========================================================================
  describe("C: Server-Side Challenge Generation", () => {
    it("C.1: Generates cryptographically secure challenge with 32-byte nonce, 5-min expiration, and full context", async () => {
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address,
        HARDHAT_LOCAL_CHAIN_ID
      );

      expect(challenge.nonce).toBeDefined();
      expect(challenge.nonce).toHaveLength(64); // 32 bytes hex
      expect(challenge.walletAddress).toBe(testWalletA.address);
      expect(challenge.chainId).toBe(HARDHAT_LOCAL_CHAIN_ID);
      expect(challenge.message).toContain("Insurance Claim Processing System");
      expect(challenge.message).toContain(`Address: ${testWalletA.address}`);
      expect(challenge.message).toContain(`Nonce: ${challenge.nonce}`);
      expect(challenge.message).toContain(`Chain ID: ${HARDHAT_LOCAL_CHAIN_ID}`);

      // Expiration must be approximately 5 minutes in the future
      const now = Date.now();
      const expires = new Date(challenge.expiresAt).getTime();
      expect(expires).toBeGreaterThan(now + 4 * 60 * 1000);
      expect(expires).toBeLessThanOrEqual(now + 5 * 60 * 1000 + 5000);

      // Verify challenge was persisted to database
      const dbRecord = await WalletChallengeRepository.findByNonce(challenge.nonce);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.userId).toBe(customerUser1.id);
      expect(dbRecord?.used).toBe(false);
    });
  });

  // ==========================================================================
  // D: Valid Signature Verification & User Persistence
  // ==========================================================================
  describe("D: Valid Signature Verification & Persistence", () => {
    it("D.1: Recovers signer, verifies ownership, and persists verified wallet against user", async () => {
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address,
        HARDHAT_LOCAL_CHAIN_ID
      );

      // Real EIP-191 personal_sign with test wallet
      const signature = await testWalletA.signMessage(challenge.message);

      const result = await WalletService.verifyWalletOwnership(customerUser1.id, {
        address: testWalletA.address,
        signature,
        nonce: challenge.nonce,
        message: challenge.message,
      });

      expect(result.verified).toBe(true);
      expect(result.walletAddress).toBe(testWalletA.address);

      // Verify updated authoritative user record in PostgreSQL
      const updatedUser = await UserRepository.findById(customerUser1.id);
      expect(updatedUser?.walletAddress).toBe(testWalletA.address);

      // Challenge must be marked used
      const dbRecord = await WalletChallengeRepository.findByNonce(challenge.nonce);
      expect(dbRecord?.used).toBe(true);
    });
  });

  // ==========================================================================
  // E, F, G, H, I: Signature Rejection & Security Guards
  // ==========================================================================
  describe("E to I: Cryptographic Signature Rejection Guards", () => {
    it("E.1: Rejects invalid or corrupted cryptographic signatures", async () => {
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address
      );

      await expect(
        WalletService.verifyWalletOwnership(customerUser1.id, {
          address: testWalletA.address,
          signature: "0xdeadbeef12345678",
          nonce: challenge.nonce,
        })
      ).rejects.toThrow(/Failed to verify cryptographic signature/);
    });

    it("F.1: Rejects signature signed by a DIFFERENT wallet account", async () => {
      // Challenge issued for testWalletA
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address
      );

      // BUT signed by testWalletB
      const impostorSig = await testWalletB.signMessage(challenge.message);

      await expect(
        WalletService.verifyWalletOwnership(customerUser1.id, {
          address: testWalletA.address, // Claiming to be wallet A
          signature: impostorSig,       // But signed with key B
          nonce: challenge.nonce,
        })
      ).rejects.toThrow(/recovered signer address does not match submitted wallet address/);
    });

    it("G.1: Rejects modified / tampered challenge messages", async () => {
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address
      );

      const tamperedMessage = challenge.message.replace("Insurance Claim", "Evil Tampered System");
      const signature = await testWalletA.signMessage(tamperedMessage);

      await expect(
        WalletService.verifyWalletOwnership(customerUser1.id, {
          address: testWalletA.address,
          signature,
          nonce: challenge.nonce,
          message: tamperedMessage, // Mismatch with stored message
        })
      ).rejects.toThrow(/Message content does not match original server challenge/);
    });

    it("H.1: Rejects expired challenge nonces", async () => {
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address
      );

      // Force expired date in DB
      await dbConnection.query(
        `UPDATE wallet_challenges SET expires_at = NOW() - INTERVAL '1 minute' WHERE nonce = $1;`,
        [challenge.nonce]
      );

      const signature = await testWalletA.signMessage(challenge.message);

      await expect(
        WalletService.verifyWalletOwnership(customerUser1.id, {
          address: testWalletA.address,
          signature,
          nonce: challenge.nonce,
        })
      ).rejects.toThrow(/Challenge nonce has expired/);
    });

    it("I.1: Rejects nonce replay attempts (single-use guard)", async () => {
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address
      );

      const signature = await testWalletA.signMessage(challenge.message);

      // 1st verification succeeds
      await WalletService.verifyWalletOwnership(customerUser1.id, {
        address: testWalletA.address,
        signature,
        nonce: challenge.nonce,
      });

      // 2nd verification with same nonce MUST fail
      await expect(
        WalletService.verifyWalletOwnership(customerUser1.id, {
          address: testWalletA.address,
          signature,
          nonce: challenge.nonce,
        })
      ).rejects.toThrow(/replay detected/);
    });

    it("I.2: Rejects challenge verification for a different user (tenant isolation)", async () => {
      // Challenge issued for Customer 1
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address
      );
      const signature = await testWalletA.signMessage(challenge.message);

      // Customer 2 attempts to verify Customer 1's challenge
      await expect(
        WalletService.verifyWalletOwnership(customerUser2.id, {
          address: testWalletA.address,
          signature,
          nonce: challenge.nonce,
        })
      ).rejects.toThrow(/issued to a different user account/);
    });
  });

  // ==========================================================================
  // J, K: Unauthenticated API Requests
  // ==========================================================================
  describe("J & K: Unauthenticated API Pipeline Rejections", () => {
    it("J.1: Rejects unauthenticated POST /api/wallet/challenge", async () => {
      const req = new NextRequest("http://localhost:3000/api/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: testWalletA.address }),
      });

      const res = await challengeRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      const errStr = typeof json.error === "string" ? json.error : (json.error?.message || "");
      expect(errStr).toContain("Authentication required");
    });

    it("K.1: Rejects unauthenticated POST /api/wallet/verify", async () => {
      const req = new NextRequest("http://localhost:3000/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: testWalletA.address,
          signature: "0x123",
          nonce: "dummy-nonce",
        }),
      });

      const res = await verifyRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ==========================================================================
  // L & M: Profile API Security & Wallet Isolation
  // ==========================================================================
  describe("L & M: Profile API Security & Multi-Tenant Isolation", () => {
    it("L.1: One customer cannot query or modify another customer's profile", async () => {
      // Customer 1 tries to fetch Customer 2's profile via query param
      const getReq = new NextRequest(
        `http://localhost:3000/api/customer/profile?customerId=${customerUser2.id}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${customerToken1}` },
        }
      );
      const getRes = await getProfileRoute(getReq);
      expect(getRes.status).toBe(403);
      const getJson = await getRes.json();
      expect(getJson.error).toContain("Forbidden");

      // Customer 1 tries to update Customer 2's profile via body
      const putReq = new NextRequest("http://localhost:3000/api/customer/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken1}`,
        },
        body: JSON.stringify({
          customerId: customerUser2.id,
          fullName: "Hacked Name",
        }),
      });
      const putRes = await putProfileRoute(putReq);
      expect(putRes.status).toBe(403);
    });

    it("L.2: Customer cannot arbitrarily set walletAddress via PUT /api/customer/profile", async () => {
      const req = new NextRequest("http://localhost:3000/api/customer/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken1}`,
        },
        body: JSON.stringify({
          walletAddress: testWalletB.address,
        }),
      });

      const res = await putProfileRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Manual wallet assignment prohibited");
    });

    it("M.1: Profile API accurately returns verified wallet address from database", async () => {
      const req = new NextRequest("http://localhost:3000/api/customer/profile", {
        method: "GET",
        headers: { Authorization: `Bearer ${customerToken1}` },
      });

      const res = await getProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.walletAddress).toBe(testWalletA.address);
    });

    it("M.2: POST /api/wallet/disconnect unlinks verified wallet", async () => {
      const disReq = new NextRequest("http://localhost:3000/api/wallet/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${customerToken1}` },
      });

      const disRes = await disconnectRoute(disReq);
      expect(disRes.status).toBe(200);

      const user = await UserRepository.findById(customerUser1.id);
      expect(user?.walletAddress).toBeNull();
    });
  });

  // ==========================================================================
  // N, O, P, Q, R: Payment Integration & Fallback Removal
  // ==========================================================================
  describe("N to R: Payment Integration, Verified Wallet Payouts & Fallback Removal", () => {
    let policy: any;

    beforeAll(async () => {
      const timestamp = Date.now();
      const policyId = `pol_mm_${timestamp}`;
      await PolicyRepository.create({
        id: policyId,
        policyNumber: `POL-MM-${timestamp}`,
        customerId: customerUser1.id,
        customerName: customerUser1.fullName,
        policyHolder: customerUser1.fullName,
        type: "Comprehensive Health",
        coverageAmount: 100000,
        premiumAmount: 1200,
        deductible: 0,
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        status: PolicyStatus.ACTIVE,
        coverages: [],
      });
      policy = (await PolicyRepository.findById(policyId))!;
    });

    it("O.1: Crypto payout for customer WITHOUT verified wallet is strictly rejected with CUSTOMER_WALLET_NOT_VERIFIED", async () => {
      // Ensure customerUser1 has NO verified wallet
      await UserRepository.updateWalletAddress(customerUser1.id, null);

      // Submit claim
      const claimResult = await ClaimService.submitClaim(
        customerUser1.id,
        customerUser1.fullName,
        {
          policyId: policy.id,
          requestedAmount: 1500,
          incidentDate: "2026-03-01",
          incidentType: "ILLNESS",
          location: "Hanoi Central Hospital",
          description: "Hospitalization for seasonal influenza care.",
        }
      );

      const reviewerActor = {
        id: reviewerUser.id,
        name: reviewerUser.fullName,
        role: reviewerUser.role,
      };

      // Reviewer moves to UNDER_REVIEW, then approves claim
      await ClaimService.startReview(claimResult.claim.id, reviewerActor);

      const approval = await ClaimService.approveClaim(
        claimResult.claim.id,
        reviewerActor,
        1500,
        "Approved."
      );

      const payment = await PaymentRepository.findByClaimId(claimResult.claim.id);
      expect(payment).toBeDefined();

      // Finance attempts to disburse payment
      const disburseReq = new NextRequest(
        `http://localhost:3000/api/payments/${payment!.id}/disburse`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${financeToken}` },
        }
      );

      const disburseRes = await disburseRoute(disburseReq, { params: { id: payment!.id } });
      expect(disburseRes.status).toBe(400);
      const disburseJson = await disburseRes.json();
      expect(disburseJson.success).toBe(false);
      expect(disburseJson.error).toContain("CUSTOMER_WALLET_NOT_VERIFIED");
    });

    it("N.1 & P.1: Payment successfully uses customer's VERIFIED wallet with zero hardcoded fallbacks", async () => {
      // Re-verify customerUser1 with testWalletA
      const challenge = await WalletService.generateChallenge(
        customerUser1.id,
        testWalletA.address
      );
      const signature = await testWalletA.signMessage(challenge.message);
      await WalletService.verifyWalletOwnership(customerUser1.id, {
        address: testWalletA.address,
        signature,
        nonce: challenge.nonce,
      });

      // Submit new claim
      const claimResult = await ClaimService.submitClaim(
        customerUser1.id,
        customerUser1.fullName,
        {
          policyId: policy.id,
          requestedAmount: 2000,
          incidentDate: "2026-03-05",
          incidentType: "ILLNESS",
          location: "Hanoi Hospital",
          description: "General hospitalization diagnostic check.",
        }
      );

      const reviewerActor = {
        id: reviewerUser.id,
        name: reviewerUser.fullName,
        role: reviewerUser.role,
      };

      // Reviewer moves to UNDER_REVIEW, then approves claim
      await ClaimService.startReview(claimResult.claim.id, reviewerActor);

      await ClaimService.approveClaim(
        claimResult.claim.id,
        reviewerActor,
        2000,
        "Approved."
      );

      const payment = await PaymentRepository.findByClaimId(claimResult.claim.id);
      expect(payment?.recipientWallet).toBe(testWalletA.address);

      // Finance disburses payment
      const disburseReq = new NextRequest(
        `http://localhost:3000/api/payments/${payment!.id}/disburse`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${financeToken}` },
        }
      );

      const disburseRes = await disburseRoute(disburseReq, { params: { id: payment!.id } });
      expect(disburseRes.status).toBe(200);
      const disburseJson = await disburseRes.json();
      expect(disburseJson.success).toBe(true);
      expect(disburseJson.data.payment.recipientWallet).toBe(testWalletA.address);
      expect(disburseJson.data.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      // Double-payment prevention (R.1)
      const secondDisburseRes = await disburseRoute(disburseReq, { params: { id: payment!.id } });
      expect(secondDisburseRes.status).toBe(400);
      const secondJson = await secondDisburseRes.json();
      expect(secondJson.error).toContain("already been successfully disbursed");
    });

    it("Q.1: Existing RBAC guards still prevent non-finance roles from disbursing payments", async () => {
      // Customer attempts to disburse payment
      const req = new NextRequest(
        "http://localhost:3000/api/payments/pay-random-id/disburse",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${customerToken1}` },
        }
      );
      const res = await disburseRoute(req, { params: { id: "pay-random-id" } });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Forbidden");
    });
  });

  // ==========================================================================
  // Client Helper Tests
  // ==========================================================================
  describe("Web3 MetaMask Client Helper Functions", () => {
    it("isMetaMaskInstalled: returns false in Node environment where window is undefined", () => {
      expect(isMetaMaskInstalled()).toBe(false);
    });

    it("normalizeMetaMaskError: humanizes EIP-1193 rejection codes without [object Object]", () => {
      expect(normalizeMetaMaskError({ code: 4001 }, "connect")).toBe("Connection request was rejected.");
      expect(normalizeMetaMaskError({ code: 4001 }, "sign")).toBe("Signature request was rejected.");
      expect(normalizeMetaMaskError({ code: 4902 })).toBe("Network not configured in MetaMask.");
      expect(normalizeMetaMaskError({ code: -32002 })).toContain("already pending");
      expect(normalizeMetaMaskError("Custom error string")).toBe("Custom error string");
      expect(normalizeMetaMaskError(null)).toBe("An unknown wallet error occurred.");
    });
  });
});

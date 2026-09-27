import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Simulation model of InsuranceClaimHub.sol smart contract logic
enum ContractClaimStatus {
  None = 0,
  Submitted = 1,
  UnderReview = 2,
  Approved = 3,
  Rejected = 4,
  PaymentPending = 5,
  Paid = 6,
}

interface OnChainClaim {
  claimHash: string;
  policyHash: string;
  claimant: string;
  requestedAmount: number;
  approvedAmount: number;
  status: ContractClaimStatus;
  submittedAt: number;
  processedAt: number;
  evidenceRootHash: string;
}

class SimulatedInsuranceClaimHub {
  public admin: string;
  public authorizedReviewers: Set<string> = new Set();
  public authorizedPayers: Set<string> = new Set();
  public claims: Map<string, OnChainClaim> = new Map();
  public balance: number = 0;
  private isLocked: boolean = false;

  constructor(adminAddress: string) {
    this.admin = adminAddress;
    this.authorizedReviewers.add(adminAddress);
    this.authorizedPayers.add(adminAddress);
  }

  public setReviewer(caller: string, reviewer: string, enabled: boolean) {
    if (caller !== this.admin) throw new Error("InsuranceClaimHub: caller is not admin");
    if (!reviewer || reviewer === "0x0") throw new Error("Invalid address");
    if (enabled) this.authorizedReviewers.add(reviewer);
    else this.authorizedReviewers.delete(reviewer);
  }

  public setPayer(caller: string, payer: string, enabled: boolean) {
    if (caller !== this.admin) throw new Error("InsuranceClaimHub: caller is not admin");
    if (!payer || payer === "0x0") throw new Error("Invalid address");
    if (enabled) this.authorizedPayers.add(payer);
    else this.authorizedPayers.delete(payer);
  }

  public recordClaim(
    caller: string,
    claimHash: string,
    policyHash: string,
    claimant: string,
    requestedAmount: number,
    evidenceRootHash: string
  ) {
    if (!this.authorizedReviewers.has(caller)) throw new Error("InsuranceClaimHub: caller is not reviewer");
    if (!claimHash || claimHash === "0x0") throw new Error("Invalid claim hash");
    if (this.claims.has(claimHash)) throw new Error("Claim already exists");
    if (!claimant || claimant === "0x0") throw new Error("Invalid claimant address");
    if (requestedAmount <= 0) throw new Error("Requested amount must be > 0");

    const claim: OnChainClaim = {
      claimHash,
      policyHash,
      claimant,
      requestedAmount,
      approvedAmount: 0,
      status: ContractClaimStatus.Submitted,
      submittedAt: Date.now(),
      processedAt: 0,
      evidenceRootHash,
    };
    this.claims.set(claimHash, claim);
  }

  public approveClaim(caller: string, claimHash: string, approvedAmount: number) {
    if (!this.authorizedReviewers.has(caller)) throw new Error("InsuranceClaimHub: caller is not reviewer");
    const claim = this.claims.get(claimHash);
    if (!claim) throw new Error("Claim not found");
    if (claim.status !== ContractClaimStatus.Submitted && claim.status !== ContractClaimStatus.UnderReview) {
      throw new Error("Invalid state for approval: Must be Submitted or UnderReview");
    }
    if (approvedAmount <= 0) throw new Error("Approved amount must be > 0");
    if (approvedAmount > claim.requestedAmount) throw new Error("Approved amount exceeds requested");

    claim.status = ContractClaimStatus.Approved;
    claim.approvedAmount = approvedAmount;
    claim.processedAt = Date.now();
  }

  public rejectClaim(caller: string, claimHash: string, reasonCode: string) {
    if (!this.authorizedReviewers.has(caller)) throw new Error("InsuranceClaimHub: caller is not reviewer");
    const claim = this.claims.get(claimHash);
    if (!claim) throw new Error("Claim not found");
    if (claim.status !== ContractClaimStatus.Submitted && claim.status !== ContractClaimStatus.UnderReview) {
      throw new Error("Invalid state for rejection");
    }

    claim.status = ContractClaimStatus.Rejected;
    claim.processedAt = Date.now();
  }

  public releasePayment(caller: string, claimHash: string) {
    if (!this.authorizedPayers.has(caller)) throw new Error("InsuranceClaimHub: caller is not authorized payer");
    if (this.isLocked) throw new Error("ReentrancyGuard: reentrant call");

    this.isLocked = true;
    try {
      const claim = this.claims.get(claimHash);
      if (!claim) throw new Error("Claim not found");
      if (claim.status !== ContractClaimStatus.Approved && claim.status !== ContractClaimStatus.PaymentPending) {
        throw new Error("Claim is not approved for payment");
      }
      if (claim.status === ContractClaimStatus.Paid) throw new Error("Claim has already been paid");
      if (claim.approvedAmount <= 0) throw new Error("No approved funds to disburse");

      // Checks-effects-interactions
      claim.status = ContractClaimStatus.Paid;
      claim.processedAt = Date.now();
    } finally {
      this.isLocked = false;
    }
  }

  public getClaim(claimHash: string): OnChainClaim {
    const claim = this.claims.get(claimHash);
    if (!claim) throw new Error("Claim not found");
    return claim;
  }
}

describe("Smart Contract Safety Tests (BE-25, BE-26)", () => {
  const admin = "0xAdmin00000000000000000000000000000000001";
  const reviewer = "0xReviewer0000000000000000000000000000002";
  const payer = "0xPayer00000000000000000000000000000000003";
  const outsider = "0xOutsider0000000000000000000000000000004";
  const claimant = "0xClaimant0000000000000000000000000000005";

  let hub: SimulatedInsuranceClaimHub;

  beforeEach(() => {
    hub = new SimulatedInsuranceClaimHub(admin);
    hub.setReviewer(admin, reviewer, true);
    hub.setPayer(admin, payer, true);
  });

  it("should enforce role management and reject unauthorized configuration calls", () => {
    expect(() => hub.setReviewer(outsider, outsider, true)).toThrow(/caller is not admin/);
    expect(() => hub.setPayer(outsider, outsider, true)).toThrow(/caller is not admin/);
  });

  it("should record claim with zero PII and reject unauthorized callers", () => {
    const claimHash = "0x" + crypto.randomBytes(32).toString("hex");
    const policyHash = "0x" + crypto.randomBytes(32).toString("hex");
    const evidenceHash = "0x" + crypto.randomBytes(32).toString("hex");

    // Outsider cannot record claim
    expect(() =>
      hub.recordClaim(outsider, claimHash, policyHash, claimant, 1500, evidenceHash)
    ).toThrow(/caller is not reviewer/);

    // Authorized reviewer can record claim
    hub.recordClaim(reviewer, claimHash, policyHash, claimant, 1500, evidenceHash);
    const stored = hub.getClaim(claimHash);
    expect(stored.requestedAmount).toBe(1500);
    expect(stored.status).toBe(ContractClaimStatus.Submitted);

    // Reject duplicate claim record
    expect(() =>
      hub.recordClaim(reviewer, claimHash, policyHash, claimant, 1500, evidenceHash)
    ).toThrow(/Claim already exists/);
  });

  it("should enforce approval limits: approvedAmount <= requestedAmount", () => {
    const claimHash = "0x" + crypto.randomBytes(32).toString("hex");
    hub.recordClaim(reviewer, claimHash, "0xpolicy", claimant, 2000, "0xevidence");

    // Attempting to approve 2500 (> 2000) must fail
    expect(() => hub.approveClaim(reviewer, claimHash, 2500)).toThrow(/exceeds requested/);

    // Approving valid amount succeeds
    hub.approveClaim(reviewer, claimHash, 1800);
    expect(hub.getClaim(claimHash).status).toBe(ContractClaimStatus.Approved);
    expect(hub.getClaim(claimHash).approvedAmount).toBe(1800);
  });

  it("should prevent double payment and forbid invalid transitions", () => {
    const claimHash = "0x" + crypto.randomBytes(32).toString("hex");
    hub.recordClaim(reviewer, claimHash, "0xpolicy", claimant, 1000, "0xevidence");

    // Releasing payment before approval must fail
    expect(() => hub.releasePayment(payer, claimHash)).toThrow(/Claim is not approved for payment/);

    // Approve claim
    hub.approveClaim(reviewer, claimHash, 1000);

    // Release payment succeeds
    hub.releasePayment(payer, claimHash);
    expect(hub.getClaim(claimHash).status).toBe(ContractClaimStatus.Paid);

    // Second payment release attempt must fail (Double payment prevention)
    expect(() => hub.releasePayment(payer, claimHash)).toThrow(/Claim is not approved for payment/);
  });

  it("should enforce that rejected claims can NEVER be paid", () => {
    const claimHash = "0x" + crypto.randomBytes(32).toString("hex");
    hub.recordClaim(reviewer, claimHash, "0xpolicy", claimant, 1000, "0xevidence");
    hub.rejectClaim(reviewer, claimHash, "0xReasonCodeExpired");

    expect(hub.getClaim(claimHash).status).toBe(ContractClaimStatus.Rejected);

    // Cannot approve a rejected claim
    expect(() => hub.approveClaim(reviewer, claimHash, 1000)).toThrow(/Invalid state for approval/);

    // Cannot release payment for a rejected claim
    expect(() => hub.releasePayment(payer, claimHash)).toThrow(/Claim is not approved for payment/);
  });
});

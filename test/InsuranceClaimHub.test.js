const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("P4 — Smart Contract Hardhat EVM Tests (InsuranceClaimHub.sol)", function () {
  let hub;
  let admin, reviewer, payer, customer, otherAccount;

  // Sample keccak256 hashes representing PII-free privacy identifiers
  const claimHash = ethers.keccak256(ethers.toUtf8Bytes("clm-test-101-salt-9876"));
  const policyHash = ethers.keccak256(ethers.toUtf8Bytes("pol-test-202-health"));
  const evidenceRoot = ethers.keccak256(ethers.toUtf8Bytes("sha256-evidence-merkle-root"));
  const reasonCode = ethers.keccak256(ethers.toUtf8Bytes("REASON_NOT_COVERED_SECTION_4"));

  const requestedAmount = ethers.parseEther("1.0"); // 1 ETH or equivalent currency units
  const approvedAmount = ethers.parseEther("0.8");  // 0.8 ETH

  beforeEach(async function () {
    [admin, reviewer, payer, customer, otherAccount] = await ethers.getSigners();

    const InsuranceClaimHub = await ethers.getContractFactory("InsuranceClaimHub");
    hub = await InsuranceClaimHub.deploy();
    await hub.waitForDeployment();

    // Configure role permissions
    await hub.connect(admin).setReviewer(reviewer.address, true);
    await hub.connect(admin).setPayer(payer.address, true);
  });

  describe("Access Control & Role Permissions", function () {
    it("should initialize deployer as admin with full default privileges", async function () {
      expect(await hub.admin()).to.equal(admin.address);
      expect(await hub.authorizedReviewers(admin.address)).to.equal(true);
      expect(await hub.authorizedPayers(admin.address)).to.equal(true);
    });

    it("should allow admin to grant and revoke reviewer role", async function () {
      expect(await hub.authorizedReviewers(reviewer.address)).to.equal(true);
      await expect(hub.connect(admin).setReviewer(reviewer.address, false))
        .to.emit(hub, "ReviewerUpdated")
        .withArgs(reviewer.address, false);
      expect(await hub.authorizedReviewers(reviewer.address)).to.equal(false);
    });

    it("should reject non-admin from modifying roles", async function () {
      await expect(
        hub.connect(otherAccount).setReviewer(otherAccount.address, true)
      ).to.be.revertedWith("InsuranceClaimHub: caller is not admin");

      await expect(
        hub.connect(otherAccount).setPayer(otherAccount.address, true)
      ).to.be.revertedWith("InsuranceClaimHub: caller is not admin");
    });

    it("should reject unauthorized callers from recording claims", async function () {
      await expect(
        hub.connect(otherAccount).recordClaim(
          claimHash,
          policyHash,
          customer.address,
          requestedAmount,
          evidenceRoot
        )
      ).to.be.revertedWith("InsuranceClaimHub: caller is not reviewer");
    });
  });

  describe("Claim Lifecycle State Machine & Invariants", function () {
    it("should record a new claim with Submitted status and emit ClaimRecorded event", async function () {
      await expect(
        hub.connect(reviewer).recordClaim(
          claimHash,
          policyHash,
          customer.address,
          requestedAmount,
          evidenceRoot
        )
      )
        .to.emit(hub, "ClaimRecorded");

      const claim = await hub.getClaim(claimHash);
      expect(claim.policyHash).to.equal(policyHash);
      expect(claim.claimant).to.equal(customer.address);
      expect(claim.requestedAmount).to.equal(requestedAmount);
      expect(claim.approvedAmount).to.equal(0n);
      expect(claim.status).to.equal(1n); // Submitted = 1
      expect(claim.evidenceRootHash).to.equal(evidenceRoot);
    });

    it("should prevent recording duplicate claim hash", async function () {
      await hub.connect(reviewer).recordClaim(
        claimHash,
        policyHash,
        customer.address,
        requestedAmount,
        evidenceRoot
      );

      await expect(
        hub.connect(reviewer).recordClaim(
          claimHash,
          policyHash,
          customer.address,
          requestedAmount,
          evidenceRoot
        )
      ).to.be.revertedWith("Claim already exists");
    });

    it("should strictly enforce UnderReview before Approval (disallow Submitted -> Approved)", async function () {
      await hub.connect(reviewer).recordClaim(
        claimHash,
        policyHash,
        customer.address,
        requestedAmount,
        evidenceRoot
      );

      // Attempt direct approval from Submitted without UnderReview
      await expect(
        hub.connect(reviewer).approveClaim(claimHash, approvedAmount)
      ).to.be.revertedWith("Invalid state for approval: Must be UnderReview");
    });

    it("should strictly enforce UnderReview before Rejection (disallow Submitted -> Rejected)", async function () {
      await hub.connect(reviewer).recordClaim(
        claimHash,
        policyHash,
        customer.address,
        requestedAmount,
        evidenceRoot
      );

      // Attempt direct rejection from Submitted without UnderReview
      await expect(
        hub.connect(reviewer).rejectClaim(claimHash, reasonCode)
      ).to.be.revertedWith("Invalid state for rejection: Must be UnderReview");
    });

    it("should transition Submitted -> UnderReview -> Approved successfully", async function () {
      await hub.connect(reviewer).recordClaim(
        claimHash,
        policyHash,
        customer.address,
        requestedAmount,
        evidenceRoot
      );

      // 1. Move to UnderReview
      await expect(hub.connect(reviewer).setUnderReview(claimHash))
        .to.emit(hub, "ClaimStatusChanged");

      let claim = await hub.getClaim(claimHash);
      expect(claim.status).to.equal(2n); // UnderReview = 2

      // 2. Approve claim
      await expect(hub.connect(reviewer).approveClaim(claimHash, approvedAmount))
        .to.emit(hub, "ClaimApproved");

      claim = await hub.getClaim(claimHash);
      expect(claim.status).to.equal(3n); // Approved = 3
      expect(claim.approvedAmount).to.equal(approvedAmount);
    });

    it("should reject approval if approvedAmount exceeds requestedAmount", async function () {
      await hub.connect(reviewer).recordClaim(
        claimHash,
        policyHash,
        customer.address,
        requestedAmount,
        evidenceRoot
      );
      await hub.connect(reviewer).setUnderReview(claimHash);

      const excessiveAmount = requestedAmount + 1000n;
      await expect(
        hub.connect(reviewer).approveClaim(claimHash, excessiveAmount)
      ).to.be.revertedWith("Approved amount exceeds requested");
    });

    it("should transition UnderReview -> Rejected with reason code hash", async function () {
      await hub.connect(reviewer).recordClaim(
        claimHash,
        policyHash,
        customer.address,
        requestedAmount,
        evidenceRoot
      );
      await hub.connect(reviewer).setUnderReview(claimHash);

      await expect(hub.connect(reviewer).rejectClaim(claimHash, reasonCode))
        .to.emit(hub, "ClaimRejected");

      const claim = await hub.getClaim(claimHash);
      expect(claim.status).to.equal(4n); // Rejected = 4
    });
  });

  describe("Disbursement & Financial Safeguards", function () {
    beforeEach(async function () {
      // Record, review, and approve claim
      await hub.connect(reviewer).recordClaim(
        claimHash,
        policyHash,
        customer.address,
        requestedAmount,
        evidenceRoot
      );
      await hub.connect(reviewer).setUnderReview(claimHash);
      await hub.connect(reviewer).approveClaim(claimHash, approvedAmount);

      // Fund contract with escrow liquidity
      await admin.sendTransaction({
        to: await hub.getAddress(),
        value: ethers.parseEther("10.0"),
      });
    });

    it("should disburse approved funds to claimant and transition to Paid", async function () {
      const balanceBefore = await ethers.provider.getBalance(customer.address);

      await expect(hub.connect(payer).releasePayment(claimHash))
        .to.emit(hub, "PaymentReleased");

      const balanceAfter = await ethers.provider.getBalance(customer.address);
      expect(balanceAfter - balanceBefore).to.equal(approvedAmount);

      const claim = await hub.getClaim(claimHash);
      expect(claim.status).to.equal(6n); // Paid = 6
    });

    it("should prevent double-payment (cannot pay an already paid claim)", async function () {
      await hub.connect(payer).releasePayment(claimHash);

      // Second payout attempt must fail
      await expect(
        hub.connect(payer).releasePayment(claimHash)
      ).to.be.revertedWith("Claim is not approved for payment");
    });

    it("should prevent unauthorized caller from releasing payment", async function () {
      await expect(
        hub.connect(otherAccount).releasePayment(claimHash)
      ).to.be.revertedWith("InsuranceClaimHub: caller is not authorized payer");
    });

    it("should revert with INSUFFICIENT_CONTRACT_ESCROW if escrow balance is insufficient", async function () {
      // Deploy fresh un-funded contract
      const HubFactory = await ethers.getContractFactory("InsuranceClaimHub");
      const unFundedHub = await HubFactory.deploy();
      await unFundedHub.waitForDeployment();
      await unFundedHub.connect(admin).setReviewer(reviewer.address, true);
      await unFundedHub.connect(admin).setPayer(payer.address, true);

      const testClaimHash = ethers.keccak256(ethers.toUtf8Bytes("clm-unfunded-test"));
      await unFundedHub.connect(reviewer).recordClaim(
        testClaimHash,
        policyHash,
        customer.address,
        ethers.parseEther("1.0"),
        evidenceRoot
      );
      await unFundedHub.connect(reviewer).setUnderReview(testClaimHash);
      await unFundedHub.connect(reviewer).approveClaim(testClaimHash, ethers.parseEther("1.0"));

      // Contract has 0 ETH balance, must revert with INSUFFICIENT_CONTRACT_ESCROW
      await expect(
        unFundedHub.connect(payer).releasePayment(testClaimHash)
      ).to.be.revertedWith("INSUFFICIENT_CONTRACT_ESCROW");
    });
  });

  describe("Zero PII Guarantee Verification", function () {
    it("should only store cryptographic digests and zero plaintext customer PII", async function () {
      await hub.connect(reviewer).recordClaim(
        claimHash,
        policyHash,
        customer.address,
        requestedAmount,
        evidenceRoot
      );

      const claim = await hub.getClaim(claimHash);

      // Data on chain consists strictly of bytes32, address, and uint values
      expect(ethers.isHexString(claim.policyHash, 32)).to.equal(true);
      expect(ethers.isHexString(claim.evidenceRootHash, 32)).to.equal(true);
      expect(ethers.isAddress(claim.claimant)).to.equal(true);
      expect(typeof claim.requestedAmount).to.equal("bigint");
    });
  });
});

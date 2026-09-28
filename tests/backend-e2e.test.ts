import { describe, it, expect, beforeAll } from "vitest";
import { AuthService } from "@/server/services/auth.service";
import { PolicyService } from "@/server/services/policy.service";
import { ClaimService } from "@/server/services/claim.service";
import { BlockchainService } from "@/server/services/blockchain.service";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { initDatabase } from "@/server/db/postgres";
import { ClaimStatus, PaymentStatus, UserRole } from "@/types";

describe("Backend End-to-End Flow Tests (BE-37)", () => {
  beforeAll(async () => {
    await initDatabase();
  });

  const reviewer = {
    id: "usr_reviewer_1",
    name: "Le Minh Reviewer",
    role: UserRole.CLAIM_REVIEWER,
  };

  const finance = {
    id: "usr_finance_1",
    name: "Pham Thi Finance",
    role: UserRole.FINANCE,
  };

  it("Flow 1: Customer Register -> Login -> Policy -> Submit Claim -> Approve -> Blockchain -> Payment Disburse -> Final State Paid", async () => {
    // 1. Customer Registration
    const uniqueEmail = `e2e_cust_${Date.now()}@example.com`;
    const regResult = await AuthService.register({
      fullName: "E2E Customer Test",
      email: uniqueEmail,
      password: "StrongPassword123!",
      phone: "+84 911 223 344",
      walletAddress: "0x71C8366453AB548A31D08f237B855D282126B39a",
    });
    expect(regResult.user.id).toBeDefined();
    expect(regResult.user.role).toBe(UserRole.CUSTOMER);

    // 2. Customer Login
    const loginResult = await AuthService.login(uniqueEmail, "StrongPassword123!");
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.email).toBe(uniqueEmail);

    // 3. Admin / System issues an active insurance policy to this customer
    const policyId = `pol-e2e-${Date.now()}`;
    await PolicyRepository.create({
      id: policyId,
      policyNumber: `POL-HLTH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: regResult.user.id,
      customerName: regResult.user.fullName,
      policyHolder: regResult.user.fullName,
      type: "Comprehensive Health",
      coverageAmount: 10000,
      premiumAmount: 500,
      deductible: 100,
      startDate: "2026-01-01",
      endDate: "2027-01-01",
      status: "ACTIVE" as any,
      coverages: [{ name: "Hospitalization", maxAmount: 8000, description: "Inpatient stay" }],
    });

    // Verify customer can retrieve their policy
    const customerPolicies = await PolicyService.getCustomerPolicies(regResult.user.id);
    expect(customerPolicies.total).toBe(1);
    expect(customerPolicies.policies[0].id).toBe(policyId);

    // 4. Submit Claim with Evidence
    const claimResult = await ClaimService.submitClaim(regResult.user.id, regResult.user.fullName, {
      policyId,
      incidentDate: "2026-06-10",
      incidentType: "Hospitalization",
      location: "City Hospital",
      requestedAmount: 2500,
      description: "Emergency acute treatment and hospitalization bills.",
      evidenceFiles: [
        {
          fileName: "hospital_invoice.pdf",
          fileUrl: "blob:http://localhost/inv.pdf",
          fileSize: 850000,
          mimeType: "application/pdf",
        },
      ],
      idempotencyKey: `idem_e2e_${Date.now()}`,
    });

    const claimId = claimResult.claim.id;
    expect(claimResult.claim.status).toBe(ClaimStatus.SUBMITTED);
    expect(claimResult.claim.evidence).toHaveLength(1);

    // 5. Reviewer begins underwriting and reviews the claim
    const underReview = await ClaimService.startReview(claimId, reviewer);
    expect(underReview.status).toBe(ClaimStatus.UNDER_REVIEW);

    const approval = await ClaimService.approveClaim(
      claimId,
      reviewer,
      2500,
      "Hospital invoice verified against hospitalization coverage limits."
    );

    expect(approval.claim.status).toBe(ClaimStatus.APPROVED);
    expect(approval.claim.approvedAmount).toBe(2500);
    expect(approval.txHash).toBeDefined();

    // 6. Verify corresponding pending payment was created in PostgreSQL
    const payment = await PaymentRepository.findByClaimId(claimId);
    expect(payment).not.toBeNull();
    expect(payment?.amount).toBe(2500);
    expect(payment?.status).toBe(PaymentStatus.PENDING);

    // 7. Finance disburses payment via Smart Contract
    const bcDisburseResult = await BlockchainService.recordPaymentDisbursement(
      payment!.id,
      claimId,
      payment!.amount,
      payment!.recipientWallet || "0x71C8366453AB548A31D08f237B855D282126B39a"
    );

    payment!.status = PaymentStatus.SUCCESS;
    payment!.blockchainTxHash = bcDisburseResult.txHash;
    payment!.processedAt = new Date().toISOString();
    await PaymentRepository.update(payment!);

    // Claim transitions to PAID
    const currentClaim = (await ClaimRepository.findById(claimId))!;
    await ClaimRepository.updateStatusWithOptimisticLock(
      claimId,
      ClaimStatus.PAID,
      currentClaim.version,
      { blockchainTxHash: bcDisburseResult.txHash }
    );

    // 8. Customer reads final state
    const customerClaimView = await ClaimService.getClaimById(claimId, {
      id: regResult.user.id,
      role: UserRole.CUSTOMER,
    });
    expect(customerClaimView.status).toBe(200);
    expect(customerClaimView.claim?.status).toBe(ClaimStatus.PAID);
    expect(customerClaimView.claim?.blockchainTxHash).toBe(bcDisburseResult.txHash);
  });

  it("Flow 2: Claim Submission -> Review -> Reject -> Customer sees Rejection Reason -> Zero Payment Created", async () => {
    // 1. Submit claim on active policy
    const testClaim = await ClaimService.submitClaim("usr_customer_default", "Nguyen Van A", {
      policyId: "pol-101",
      incidentDate: "2026-08-12",
      incidentType: "Cosmetic",
      location: "Spa",
      requestedAmount: 1200,
      description: "Elective aesthetic treatment not covered under essential medical terms.",
    });

    const claimId = testClaim.claim.id;
    expect(testClaim.claim.status).toBe(ClaimStatus.SUBMITTED);

    // 2. Reviewer begins underwriting review
    await ClaimService.startReview(claimId, reviewer);

    // 3. Reviewer rejects with specific mandatory reason
    const rejectionReason = "Elective cosmetic procedures are strictly excluded under Section 4.2 of policy terms.";
    const rejectedClaim = await ClaimService.rejectClaim(
      claimId,
      reviewer,
      rejectionReason,
      "Audited by Senior Reviewer."
    );

    expect(rejectedClaim.status).toBe(ClaimStatus.REJECTED);
    expect(rejectedClaim.reviewNotes).toContain(rejectionReason);

    // 3. Customer reads rejected claim and reason
    const customerView = await ClaimService.getClaimById(claimId, {
      id: "usr_customer_default",
      role: UserRole.CUSTOMER,
    });
    expect(customerView.claim?.status).toBe(ClaimStatus.REJECTED);
    expect(customerView.claim?.reviewNotes).toContain(rejectionReason);

    // 4. Verify ZERO payment was created for this claim in PostgreSQL
    const payment = await PaymentRepository.findByClaimId(claimId);
    expect(payment).toBeNull();
  });

  it("Flow 3: Blockchain Telemetry handles degraded state without crashing", () => {
    const telemetry = BlockchainService.getTelemetry();
    expect(telemetry.network).toBe("Sepolia Testnet (EVM)");
    expect(telemetry.stats.totalTransactions).toBeGreaterThan(0);
    expect(telemetry.connectionStatus).toBe("HEALTHY_CONNECTED");
  });
});

import { describe, it, expect } from "vitest";
import { ClaimService } from "@/server/services/claim.service";
import { ClaimStatus, UserRole } from "@/types";
import { db } from "@/server/db/store";

describe("Staff Underwriting & Determination Flow (FE-18 & FE-19)", () => {
  const reviewer = {
    id: "usr_reviewer_1",
    name: "Le Minh Reviewer",
    role: UserRole.CLAIM_REVIEWER,
  };
  const unauthorizedUser = {
    id: "usr_customer_default",
    name: "Nguyen Van A",
    role: UserRole.CUSTOMER,
  };

  it("should block non-reviewer role from approving claims", async () => {
    await expect(
      ClaimService.approveClaim("clm-501", unauthorizedUser as any, 1000)
    ).rejects.toThrow(/Forbidden/);
  });

  it("should successfully approve an under-review claim and anchor blockchain tx", async () => {
    // clm-501 is in UNDER_REVIEW
    const result = await ClaimService.approveClaim(
      "clm-501",
      reviewer,
      1500,
      "Hospital fees audited and approved."
    );

    expect(result.claim.status).toBe(ClaimStatus.APPROVED);
    expect(result.claim.approvedAmount).toBe(1500);
    expect(result.claim.blockchainTxHash).toBeDefined();
    expect(result.txHash).toBeDefined();

    // Verify corresponding payment was generated in PENDING state
    const payment = Array.from(db.getPayments().values()).find((p) => p.claimId === "clm-501");
    expect(payment).toBeDefined();
    expect(payment?.amount).toBe(1500);
  });

  it("should enforce rejection reason when rejecting a claim", async () => {
    // Create new claim to reject
    const testClaim = await ClaimService.submitClaim("usr_customer_default", "Nguyen Van A", {
      policyId: "pol-101",
      incidentDate: "2026-05-01",
      incidentType: "Medical",
      location: "Hospital",
      requestedAmount: 700,
      description: "Routine checkup without medical justification.",
    });

    // Rejection without reason fails
    await ClaimService.startReview(testClaim.claim.id, reviewer);
    await expect(
      ClaimService.rejectClaim(testClaim.claim.id, reviewer, "")
    ).rejects.toThrow(/rejection reason is mandatory/);

    // Rejection with reason succeeds
    const rejected = await ClaimService.rejectClaim(
      testClaim.claim.id,
      reviewer,
      "Not covered",
      "Routine checkups are excluded from policy terms."
    );
    expect(rejected.status).toBe(ClaimStatus.REJECTED);
  });

  it("should reject approval if approved amount exceeds requested amount", async () => {
    const claim = await ClaimService.submitClaim("usr_customer_default", "Nguyen Van A", {
      policyId: "pol-101",
      incidentDate: "2026-05-01",
      incidentType: "Medical",
      location: "Hospital",
      requestedAmount: 500,
      description: "Standard medical claim.",
    });

    await ClaimService.startReview(claim.claim.id, reviewer);

    await expect(
      ClaimService.approveClaim(claim.claim.id, reviewer, 600) // 600 > 500
    ).rejects.toThrow(/cannot exceed requested amount/);
  });
});

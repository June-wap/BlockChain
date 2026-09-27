import { describe, it, expect } from "vitest";
import { ClaimService } from "@/server/services/claim.service";
import { ClaimStatus, UserRole } from "@/types";

describe("Claims Wizard Submission & Validation (FE-09, FE-10)", () => {
  const customerId = "usr_customer_default";
  const customerName = "Nguyen Van A";

  it("should successfully submit a valid claim and return SUBMITTED status", async () => {
    const validClaim = await ClaimService.submitClaim(customerId, customerName, {
      policyId: "pol-101",
      incidentDate: "2026-05-10",
      incidentType: "Emergency Medical Care",
      location: "Central Medical Center",
      requestedAmount: 1200,
      description: "Severe dehydration and treatment at authorized hospital clinic.",
      evidenceFiles: [
        {
          fileName: "medical_receipt_clinic.pdf",
          fileUrl: "/api/evidence/receipt.pdf",
          fileSize: 1024 * 250,
          mimeType: "application/pdf",
        },
      ],
      idempotencyKey: `test_idemp_${Date.now()}`,
    });

    expect(validClaim.claim).toBeDefined();
    expect(validClaim.claim.status).toBe(ClaimStatus.SUBMITTED);
    expect(validClaim.claim.requestedAmount).toBe(1200);
    expect(validClaim.claim.evidence?.length).toBe(1);
  });

  it("should reject claim when requested amount exceeds policy coverage limit", async () => {
    await expect(
      ClaimService.submitClaim(customerId, customerName, {
        policyId: "pol-101", // coverageAmount: 50,000
        incidentDate: "2026-05-10",
        incidentType: "Emergency Medical Care",
        location: "Central Medical Center",
        requestedAmount: 999999, // Exceeds 50,000
        description: "Medical operation expenses exceeding all limits.",
      })
    ).rejects.toThrow(/exceeds the maximum policy coverage limit/);
  });

  it("should reject claim when incident date is in the future", async () => {
    const futureDate = "2029-12-31";
    await expect(
      ClaimService.submitClaim(customerId, customerName, {
        policyId: "pol-101",
        incidentDate: futureDate,
        incidentType: "Emergency Medical Care",
        location: "Central Hospital",
        requestedAmount: 500,
        description: "Future medical emergency claim.",
      })
    ).rejects.toThrow(/Incident date cannot be in the future/);
  });

  it("should reject claim when policy is EXPIRED (pol-103)", async () => {
    await expect(
      ClaimService.submitClaim(customerId, customerName, {
        policyId: "pol-103", // EXPIRED
        incidentDate: "2025-08-01",
        incidentType: "Property Fire",
        location: "Home Residence",
        requestedAmount: 2000,
        description: "Kitchen fire causing minor damage to counter.",
      })
    ).rejects.toThrow(/Cannot submit claim: Policy is currently EXPIRED/);
  });

  it("should reject claim when evidence has invalid MIME type (e.g. executable)", async () => {
    await expect(
      ClaimService.submitClaim(customerId, customerName, {
        policyId: "pol-101",
        incidentDate: "2026-05-10",
        incidentType: "Medical",
        location: "Hospital",
        requestedAmount: 300,
        description: "Regular medical checkup expenses.",
        evidenceFiles: [
          {
            fileName: "malicious_script.exe",
            fileUrl: "/api/evidence/malicious.exe",
            fileSize: 1024,
            mimeType: "application/x-msdownload",
          },
        ],
      })
    ).rejects.toThrow(/Invalid file type/);
  });

  it("should prevent double-submission using idempotency key", async () => {
    const idempKey = `same_key_${Date.now()}`;
    const firstCall = await ClaimService.submitClaim(customerId, customerName, {
      policyId: "pol-101",
      incidentDate: "2026-06-01",
      incidentType: "Consultation",
      location: "Clinic",
      requestedAmount: 400,
      description: "Follow up doctor appointment and laboratory diagnostics.",
      idempotencyKey: idempKey,
    });

    const secondCall = await ClaimService.submitClaim(customerId, customerName, {
      policyId: "pol-101",
      incidentDate: "2026-06-01",
      incidentType: "Consultation",
      location: "Clinic",
      requestedAmount: 400,
      description: "Follow up doctor appointment and laboratory diagnostics.",
      idempotencyKey: idempKey,
    });

    // Should return existing claim without creating duplicate
    expect(secondCall.claim.id).toBe(firstCall.claim.id);
  });
});

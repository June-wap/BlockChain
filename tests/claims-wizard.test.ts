import { describe, it, expect, beforeAll } from "vitest";
import { ClaimService } from "@/server/services/claim.service";
import { EvidenceService } from "@/server/services/evidence.service";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { initDatabase } from "@/server/db/postgres";
import { ClaimStatus, UserRole } from "@/types";

describe("Claims Wizard Submission & Validation (FE-09, FE-10)", () => {
  beforeAll(async () => {
    await initDatabase();
  });

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

  it("should support two-phase wizard flow: submit metadata first then upload real evidence via EvidenceService", async () => {
    // Phase 1: Submit metadata first and receive real claimId
    const res = await ClaimService.submitClaim(customerId, customerName, {
      policyId: "pol-101",
      incidentDate: "2026-06-02",
      incidentType: "Emergency Medical Care",
      location: "Ho Chi Minh General Hospital",
      requestedAmount: 600,
      description: "Emergency laceration stitching and antibiotic treatment.",
    });

    const realClaimId = res.claim.id;
    expect(realClaimId).toBeDefined();
    expect(res.claim.status).toBe(ClaimStatus.SUBMITTED);
    expect(res.claim.evidence).toHaveLength(0);

    // Phase 2: Upload real PDF evidence for the created claim
    const pdfBuffer = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.from("Official emergency medical record and discharge invoice.\n%%EOF"),
    ]);

    const evidence = await EvidenceService.processUpload(
      pdfBuffer,
      "discharge_summary.pdf",
      "application/pdf",
      {
        id: customerId,
        name: customerName,
        role: UserRole.CUSTOMER,
      },
      realClaimId
    );

    expect(evidence.id).toBeDefined();
    expect(evidence.claimId).toBe(realClaimId);
    expect(evidence.fileHash).toBeDefined();
    expect(evidence.fileUrl).toBe(`/api/claims/${realClaimId}/evidence/${evidence.id}`);

    // Verify ClaimRepository loads the document from DB
    const fetchedClaim = await ClaimRepository.findById(realClaimId);
    expect(fetchedClaim).not.toBeNull();
    expect(fetchedClaim!.evidence).toHaveLength(1);
    expect(fetchedClaim!.evidence![0].id).toBe(evidence.id);
    expect(fetchedClaim!.evidence![0].fileUrl).toBe(`/api/claims/${realClaimId}/evidence/${evidence.id}`);
  });

  it("should handle partial upload error: claim remains created and allows retrying failed evidence", async () => {
    // 1. Submit claim metadata
    const res = await ClaimService.submitClaim(customerId, customerName, {
      policyId: "pol-101",
      incidentDate: "2026-06-03",
      incidentType: "Emergency Medical Care",
      location: "District Medical Center",
      requestedAmount: 450,
      description: "Medical prescription and pharmacy invoice after consultation.",
    });

    const claimId = res.claim.id;
    expect(claimId).toBeDefined();

    // 2. First file fails due to spoofed magic bytes
    const spoofedBuffer = Buffer.from("<fake>not a valid pdf content</fake>");
    await expect(
      EvidenceService.processUpload(
        spoofedBuffer,
        "corrupt.pdf",
        "application/pdf",
        { id: customerId, name: customerName, role: UserRole.CUSTOMER },
        claimId
      )
    ).rejects.toThrow(/Spoofed or corrupt binary detected/);

    // Verify claim still exists in DB
    const claimAfterFailure = await ClaimRepository.findById(claimId);
    expect(claimAfterFailure).not.toBeNull();
    expect(claimAfterFailure!.evidence).toHaveLength(0);

    // 3. Retry upload with valid PDF binary succeeds
    const validPdf = Buffer.concat([
      Buffer.from("%PDF-1.5\n"),
      Buffer.from("Valid pharmacy invoice after retrying failed upload.\n%%EOF"),
    ]);

    const retriedEvidence = await EvidenceService.processUpload(
      validPdf,
      "pharmacy_invoice.pdf",
      "application/pdf",
      { id: customerId, name: customerName, role: UserRole.CUSTOMER },
      claimId
    );

    expect(retriedEvidence.id).toBeDefined();

    // 4. Verify claim detail now reflects the retried uploaded evidence
    const claimAfterRetry = await ClaimRepository.findById(claimId);
    expect(claimAfterRetry!.evidence).toHaveLength(1);
    expect(claimAfterRetry!.evidence![0].fileName).toContain("pharmacy_invoice.pdf");
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { initDatabase, closeDatabase } from "@/server/db/postgres";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as submitClaimRoute, GET as getClaimsRoute } from "@/app/api/claims/route";
import { POST as uploadEvidenceRoute } from "@/app/api/claims/evidence/upload/route";
import { GET as getEvidenceRoute } from "@/app/api/claims/[id]/evidence/[evidenceId]/route";
import { POST as startReviewRoute } from "@/app/api/staff/claims/[id]/start-review/route";
import { POST as approveClaimRoute } from "@/app/api/staff/claims/[id]/approve/route";
import { POST as disbursePaymentRoute } from "@/app/api/payments/[id]/disburse/route";
import { OutboxWorker } from "@/server/workers/outbox.worker";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { JwtService } from "@/server/core/jwt";
import { ClaimStatus, PaymentStatus, PolicyStatus, UserRole } from "@/types";
import { db } from "@/server/db/store";
import crypto from "crypto";

describe("P6 — Complete HTTP E2E Integration Pipeline", () => {
  let customerToken: string;
  let customerId: string;
  let customerEmail: string;
  let reviewerToken: string;
  let financeToken: string;
  let otherCustomerToken: string;
  let uploadedEvidenceId: string;
  let uploadedFileHash: string;
  let pdfContent: Buffer;

  beforeAll(async () => {
    await initDatabase();

    customerEmail = `http_e2e_cust_${Date.now()}@insurance.vn`;
    const reviewerEmail = `http_e2e_rev_${Date.now()}@insurance.vn`;
    const financeEmail = `http_e2e_fin_${Date.now()}@insurance.vn`;
    const otherEmail = `http_e2e_other_${Date.now()}@insurance.vn`;

    // Sign tokens for staff roles
    reviewerToken = await JwtService.signToken({
      userId: "usr_reviewer_1",
      email: reviewerEmail,
      role: UserRole.CLAIM_REVIEWER,
      fullName: "Le Minh Reviewer",
    });

    financeToken = await JwtService.signToken({
      userId: "usr_finance_1",
      email: financeEmail,
      role: UserRole.FINANCE,
      fullName: "Pham Thi Finance",
    });

    otherCustomerToken = await JwtService.signToken({
      userId: "usr_customer_2",
      email: "customer2@example.com",
      role: UserRole.CUSTOMER,
      fullName: "Tran Thi B",
    });
  });


  it("Step 1: Customer registers and receives secure auth session", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "E2E Integration Customer",
        email: customerEmail,
        password: "SecurePassword123!",
        phone: "+84 987 654 321",
        walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      }),
    });

    const res = await registerRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe(customerEmail);
    expect(json.data.token).toBeDefined();

    customerId = json.data.user.id;
    customerToken = json.data.token;
  });

  it("Step 2: Customer logs in with valid credentials and receives JWT", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: customerEmail,
        password: "SecurePassword123!",
      }),
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.token).toBeDefined();
    customerToken = json.data.token;
  });

  it("Step 3: Upload multipart evidence with valid PDF magic bytes and SHA-256", async () => {
    pdfContent = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.from("E2E Medical Assessment & Hospitalization Bill\n"),
      Buffer.from("%%EOF\n"),
    ]);

    const formData = new FormData();
    const blob = new Blob([pdfContent], { type: "application/pdf" });
    formData.append("file", blob, "medical_report.pdf");

    const req = new NextRequest("http://localhost:3000/api/claims/evidence/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerToken}`,
      },
      body: formData,
    });

    const res = await uploadEvidenceRoute(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    uploadedEvidenceId = json.data.id;
    uploadedFileHash = json.data.fileHash;
    expect(uploadedFileHash).toBe(crypto.createHash("sha256").update(pdfContent).digest("hex"));
    expect(json.data.mimeType).toBe("application/pdf");
  });

  it("Step 4: Customer submits claim through POST /api/claims", async () => {
    // Ensure customer has an active policy
    const policyId = `pol-e2e-${Date.now()}`;
    const policyData = {
      id: policyId,
      policyNumber: `POL-AUTO-${Date.now()}`,
      customerId,
      customerName: "E2E Integration Customer",
      policyHolder: "E2E Integration Customer",
      type: "Motor Comprehensive",
      coverageAmount: 15000,
      premiumAmount: 800,
      deductible: 200,
      startDate: "2026-01-01",
      endDate: "2027-01-01",
      status: PolicyStatus.ACTIVE,
      coverages: [],
    };
    db.getPolicies().set(policyId, policyData);
    await PolicyRepository.create(policyData);

    const req = new NextRequest("http://localhost:3000/api/claims", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        policyId,
        incidentDate: "2026-07-15",
        incidentType: "Vehicle Collision",
        location: "District 1, HCMC",
        requestedAmount: 3200,
        description: "Accident repair estimation and surveyor damage report.",
        evidenceFiles: [
          {
            fileName: "damage_assessment.pdf",
            fileUrl: "blob:http://localhost/damage.pdf",
            fileSize: 450000,
            mimeType: "application/pdf",
          },
        ],
      }),
    });

    const res = await submitClaimRoute(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    expect(json.data.status).toBe(ClaimStatus.SUBMITTED);
    expect(json.data.customerId).toBe(customerId);

    const claimId = json.data.id;

    // Verify claim shows up in customer's list
    const listReq = new NextRequest("http://localhost:3000/api/claims", {
      method: "GET",
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const listRes = await getClaimsRoute(listReq);
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.data.some((c: any) => c.id === claimId)).toBe(true);

    // Step 5: IDOR Protection: Other customer cannot download evidence or inspect this claim
    const forbiddenReq = new NextRequest(
      `http://localhost:3000/api/claims/${claimId}/evidence/fake_evidence_id`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${otherCustomerToken}` },
      }
    );
    const forbiddenRes = await getEvidenceRoute(forbiddenReq, {
      params: { id: claimId, evidenceId: "fake_evidence_id" },
    });
    expect(forbiddenRes.status).toBe(403);

    // Step 6: Staff Reviewer transitions claim to UNDER_REVIEW
    const reviewReq = new NextRequest(
      `http://localhost:3000/api/staff/claims/${claimId}/start-review`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${reviewerToken}` },
      }
    );
    const reviewRes = await startReviewRoute(reviewReq, { params: { id: claimId } });
    expect(reviewRes.status).toBe(200);
    const reviewJson = await reviewRes.json();
    expect(reviewJson.data.status).toBe(ClaimStatus.UNDER_REVIEW);

    // Step 7: Staff Reviewer approves claim -> Enqueues Transactional Outbox Event
    const approveReq = new NextRequest(
      `http://localhost:3000/api/staff/claims/${claimId}/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${reviewerToken}`,
        },
        body: JSON.stringify({
          approvedAmount: 3200,
          notes: "Damage verified by independent surveyor. Full payout approved.",
        }),
      }
    );
    const approveRes = await approveClaimRoute(approveReq, { params: { id: claimId } });
    expect(approveRes.status).toBe(200);
    const approveJson = await approveRes.json();
    expect(approveJson.success).toBe(true);
    expect(approveJson.data.claim.status).toBe(ClaimStatus.APPROVED);

    // Step 8: Transactional Outbox Worker dispatches events on-chain
    const workerStats = await OutboxWorker.processBatch();
    expect(workerStats.processed).toBeGreaterThanOrEqual(1);
    expect(workerStats.failed).toBe(0);

    // Step 9: Finance role disburses payment on-chain
    const payment = Array.from(db.getPayments().values()).find((p) => p.claimId === claimId);
    expect(payment).toBeDefined();

    const disburseReq = new NextRequest(
      `http://localhost:3000/api/payments/${payment!.id}/disburse`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${financeToken}` },
      }
    );
    const disburseRes = await disbursePaymentRoute(disburseReq, { params: { id: payment!.id } });
    expect(disburseRes.status).toBe(200);
    const disburseJson = await disburseRes.json();
    expect(disburseJson.success).toBe(true);
    expect(disburseJson.data.payment.status).toBe(PaymentStatus.SUCCESS);
    expect(disburseJson.data.txHash).toBeDefined();
    expect(disburseJson.data.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    // Step 10: Customer downloads their evidence binary stream with verified hash
    const downloadReq = new NextRequest(
      `http://localhost:3000/api/claims/${claimId}/evidence/${uploadedEvidenceId}?download=true`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${customerToken}` },
      }
    );
    const downloadRes = await getEvidenceRoute(downloadReq, {
      params: { id: claimId, evidenceId: uploadedEvidenceId },
    });
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers.get("ETag")).toBe(`"${uploadedFileHash}"`);
    expect(downloadRes.headers.get("Content-Type")).toBe("application/pdf");
    const downloadedBuf = Buffer.from(await downloadRes.arrayBuffer());
    expect(downloadedBuf.equals(pdfContent)).toBe(true);
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { EvidenceService } from "@/server/services/evidence.service";
import { ClaimService } from "@/server/services/claim.service";
import { UserRole } from "@/types";
import { initDatabase, closeDatabase } from "@/server/db/postgres";
import { NextRequest } from "next/server";
import { GET as getEvidenceRoute } from "@/app/api/claims/[id]/evidence/[evidenceId]/route";
import { POST as uploadEvidenceRoute } from "@/app/api/claims/evidence/upload/route";
import { EvidenceRepository } from "@/server/repositories/evidence.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { JwtService } from "@/server/core/jwt";

describe("P2 — Evidence Upload, SHA-256 Storage & Access Control Tests", () => {
  const customerUser = {
    id: "usr_customer_default",
    name: "Nguyen Van A",
    email: "customer@insurance.vn",
    role: UserRole.CUSTOMER,
  };

  const otherCustomer = {
    id: "usr_customer_2",
    name: "Tran Thi B",
    email: "customer2@example.com",
    role: UserRole.CUSTOMER,
  };

  const reviewerUser = {
    id: "usr_reviewer_1",
    name: "Le Minh Reviewer",
    email: "reviewer@insurance.vn",
    role: UserRole.CLAIM_REVIEWER,
  };

  let testClaimId: string;
  const privateDir = path.resolve(process.cwd(), "uploads", "private", "evidence");

  beforeAll(async () => {
    await initDatabase();

    // Create a real test claim for customerUser
    const res = await ClaimService.submitClaim(customerUser.id, customerUser.name, {
      policyId: "pol-101",
      incidentDate: "2026-05-10",
      incidentType: "Health",
      location: "City Hospital",
      requestedAmount: 800,
      description: "Emergency appendectomy hospital charges.",
    });
    testClaimId = res.claim.id;
  });


  // 1. Magic Bytes Validation
  describe("Magic Bytes & File Type Validation (P2.2)", () => {
    it("should accept valid PDF magic bytes (%PDF-)", async () => {
      const validPdfBuffer = Buffer.concat([
        Buffer.from("%PDF-1.5\n"),
        Buffer.from("Test valid PDF file content for hospital discharge invoice.\n%%EOF"),
      ]);

      const result = await EvidenceService.processUpload(
        validPdfBuffer,
        "discharge_invoice.pdf",
        "application/pdf",
        customerUser,
        testClaimId
      );

      expect(result.id).toBeDefined();
      expect(result.fileName).toContain("discharge_invoice.pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.fileHash).toBe(crypto.createHash("sha256").update(validPdfBuffer).digest("hex"));
    });

    it("should accept valid PNG magic bytes (\\x89PNG\\r\\n\\x1a\\n)", async () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const validPngBuffer = Buffer.concat([pngHeader, Buffer.from("dummy_image_data_payload")]);

      const result = await EvidenceService.processUpload(
        validPngBuffer,
        "xray_scan.png",
        "image/png",
        customerUser,
        testClaimId
      );

      expect(result.mimeType).toBe("image/png");
      expect(result.fileHash).toBe(crypto.createHash("sha256").update(validPngBuffer).digest("hex"));
    });

    it("should accept valid JPEG magic bytes (\\xFF\\xD8\\xFF)", async () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const validJpegBuffer = Buffer.concat([jpegHeader, Buffer.from("dummy_jpeg_payload")]);

      const result = await EvidenceService.processUpload(
        validJpegBuffer,
        "surgery_bill.jpg",
        "image/jpeg",
        customerUser,
        testClaimId
      );

      expect(result.mimeType).toBe("image/jpeg");
    });

    it("should reject spoofed files (e.g. text or script disguised as PDF)", async () => {
      const spoofedBuffer = Buffer.from("<script>alert('malicious')</script>");

      await expect(
        EvidenceService.processUpload(
          spoofedBuffer,
          "fake.pdf",
          "application/pdf",
          customerUser,
          testClaimId
        )
      ).rejects.toThrow(/Spoofed or corrupt binary detected/);
    });

    it("should reject disallowed MIME types", async () => {
      const exeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00");

      await expect(
        EvidenceService.processUpload(
          exeBuffer,
          "invoice.exe",
          "application/x-msdownload",
          customerUser,
          testClaimId
        )
      ).rejects.toThrow(/Unsupported file type/);
    });

    it("should reject files exceeding 10MB size limit", async () => {
      const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024); // 10MB + 1KB
      oversizedBuffer[0] = 0x25;
      oversizedBuffer[1] = 0x50;
      oversizedBuffer[2] = 0x44;
      oversizedBuffer[3] = 0x46;
      oversizedBuffer[4] = 0x2d;

      await expect(
        EvidenceService.processUpload(
          oversizedBuffer,
          "large.pdf",
          "application/pdf",
          customerUser,
          testClaimId
        )
      ).rejects.toThrow(/exceeds maximum allowed size/);
    });
  });

  // 2. Cryptographic Integrity & SHA-256
  describe("Cryptographic SHA-256 Digest (P2.3)", () => {
    it("should calculate exact SHA-256 matching raw byte content", async () => {
      const content = Buffer.concat([
        Buffer.from("%PDF-1.4\n"),
        Buffer.from("Specific known cryptographic content for audit verification 1234567890"),
      ]);
      const expectedHash = crypto.createHash("sha256").update(content).digest("hex");

      const result = await EvidenceService.processUpload(
        content,
        "audit_doc.pdf",
        "application/pdf",
        customerUser,
        testClaimId
      );

      expect(result.fileHash).toBe(expectedHash);
    });
  });

  // 3. Private Storage Isolation
  describe("Private Storage Isolation (P2.4)", () => {
    it("should store uploaded file in private uploads folder, not in public web directory", async () => {
      const content = Buffer.concat([
        Buffer.from("%PDF-1.4\n"),
        Buffer.from("Confidential medical record data"),
      ]);

      const result = await EvidenceService.processUpload(
        content,
        "private_medical.pdf",
        "application/pdf",
        customerUser,
        testClaimId
      );

      // Verify file is saved in privateDir
      const privateFiles = fs.readdirSync(privateDir);
      const match = privateFiles.find((f) => f.includes(result.id));
      expect(match).toBeDefined();

      const diskPath = path.join(privateDir, match!);
      const readBuffer = fs.readFileSync(diskPath);
      expect(readBuffer.equals(content)).toBe(true);

      // Verify file is NOT in public/
      const publicPath = path.resolve(process.cwd(), "public", match!);
      expect(fs.existsSync(publicPath)).toBe(false);
    });
  });

  // 4. Access Control & RBAC
  describe("Access Control & RBAC (P2.5)", () => {
    let uploadedEvidenceId: string;
    const testContent = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.from("Hospital bill details for access control test"),
    ]);

    beforeAll(async () => {
      const res = await EvidenceService.processUpload(
        testContent,
        "access_test.pdf",
        "application/pdf",
        customerUser,
        testClaimId
      );
      uploadedEvidenceId = res.id;
    });

    it("should allow claim owner to retrieve their evidence binary", async () => {
      const binary = await EvidenceService.getEvidenceBinary(
        testClaimId,
        uploadedEvidenceId,
        customerUser
      );

      expect(binary.buffer.equals(testContent)).toBe(true);
      expect(binary.mimeType).toBe("application/pdf");
    });

    it("should allow staff reviewer to retrieve evidence binary", async () => {
      const binary = await EvidenceService.getEvidenceBinary(
        testClaimId,
        uploadedEvidenceId,
        reviewerUser
      );

      expect(binary.buffer.equals(testContent)).toBe(true);
    });

    it("should reject another customer from accessing other customer's evidence (403 Forbidden)", async () => {
      await expect(
        EvidenceService.getEvidenceBinary(
          testClaimId,
          uploadedEvidenceId,
          otherCustomer
        )
      ).rejects.toThrow(/Forbidden/);
    });
  });

  // 5. Binary Stream API Route
  describe("Binary Download API Route Streaming (P2.6)", () => {
    let uploadedDocId: string;
    const samplePdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.from("API route binary stream sample document"),
    ]);

    beforeAll(async () => {
      const res = await EvidenceService.processUpload(
        samplePdf,
        "route_sample.pdf",
        "application/pdf",
        customerUser,
        testClaimId
      );
      uploadedDocId = res.id;
    });

    it("should stream binary with correct headers when accessed directly", async () => {
      const token = await JwtService.generateToken({
        userId: customerUser.id,
        email: customerUser.email,
        role: customerUser.role,
        fullName: customerUser.name,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/claims/${testClaimId}/evidence/${uploadedDocId}?download=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const response = await getEvidenceRoute(request, {
        params: { id: testClaimId, evidenceId: uploadedDocId },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(response.headers.get("content-disposition")).toContain("attachment; filename=");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");

      const bodyArrayBuffer = await response.arrayBuffer();
      const bodyBuffer = Buffer.from(bodyArrayBuffer);
      expect(bodyBuffer.equals(samplePdf)).toBe(true);
    });

    it("should return JSON metadata when requested with ?metadata=true", async () => {
      const token = await JwtService.generateToken({
        userId: customerUser.id,
        email: customerUser.email,
        role: customerUser.role,
        fullName: customerUser.name,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/claims/${testClaimId}/evidence/${uploadedDocId}?metadata=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const response = await getEvidenceRoute(request, {
        params: { id: testClaimId, evidenceId: uploadedDocId },
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(uploadedDocId);
      expect(json.data.mimeType).toBe("application/pdf");
    });
  });

  // 6. CRITICAL ISSUE-05 Regression Suite
  describe("CRITICAL ISSUE-05 Regression Suite: Real Evidence Persistence & Zero Fabrication", () => {
    let regressionClaimId: string;
    let customerToken: string;
    let otherCustomerToken: string;
    let realDocId: string;
    let originalPdfBuffer: Buffer;
    let expectedHash: string;

    beforeAll(async () => {
      // 1. Generate auth tokens
      customerToken = await JwtService.generateToken({
        userId: customerUser.id,
        email: customerUser.email,
        role: customerUser.role,
        fullName: customerUser.name,
      });

      otherCustomerToken = await JwtService.generateToken({
        userId: otherCustomer.id,
        email: otherCustomer.email,
        role: otherCustomer.role,
        fullName: otherCustomer.name,
      });

      // 2. Submit claim metadata first to receive real claimId (Requirement 3)
      const claimResult = await ClaimService.submitClaim(customerUser.id, customerUser.name, {
        policyId: "pol-101",
        incidentDate: "2026-05-12",
        incidentType: "Emergency Medical Care",
        location: "FV Hospital, Saigon",
        requestedAmount: 950,
        description: "Emergency surgical operation and medical treatment invoice.",
      });

      regressionClaimId = claimResult.claim.id;

      // 3. Create real PDF bytes
      originalPdfBuffer = Buffer.concat([
        Buffer.from("%PDF-1.4\n%âãÏÓ\n"),
        Buffer.from("Authoritative hospital invoice and medical record with verified cryptographic signature.\n"),
        Buffer.from("Invoice ID: INV-2026-998877\nTotal: $950.00\n%%EOF"),
      ]);
      expectedHash = crypto.createHash("sha256").update(originalPdfBuffer).digest("hex");
    });

    it("upload PDF → file exists on disk", async () => {
      const formData = new FormData();
      const blob = new Blob([originalPdfBuffer], { type: "application/pdf" });
      formData.append("file", blob, "hospital_invoice_real.pdf");
      formData.append("claimId", regressionClaimId);

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
      realDocId = json.data.id;

      // Verify binary file actually exists on disk in uploads/private/evidence
      const filesOnDisk = fs.readdirSync(privateDir);
      const matchingFile = filesOnDisk.find((f) => f.startsWith(realDocId));
      expect(matchingFile).toBeDefined();

      const diskFilePath = path.join(privateDir, matchingFile!);
      expect(fs.existsSync(diskFilePath)).toBe(true);
    });

    it("DB storage_key resolves to existing binary", async () => {
      const docRecord = await EvidenceRepository.findById(realDocId);
      expect(docRecord).not.toBeNull();
      expect(docRecord!.claimId).toBe(regressionClaimId);
      expect(docRecord!.storageKey).toBeDefined();

      const diskPath = path.join(privateDir, docRecord!.storageKey);
      expect(fs.existsSync(diskPath)).toBe(true);
    });

    it("SHA-256 equals exact uploaded bytes", async () => {
      const docRecord = await EvidenceRepository.findById(realDocId);
      expect(docRecord!.fileHash).toBe(expectedHash);

      // Verify on disk bytes also hash to the exact same value
      const diskBytes = fs.readFileSync(path.join(privateDir, docRecord!.storageKey));
      const diskHash = crypto.createHash("sha256").update(diskBytes).digest("hex");
      expect(diskHash).toBe(expectedHash);
      expect(diskBytes.equals(originalPdfBuffer)).toBe(true);
    });

    it("claim detail returns uploaded evidence", async () => {
      const claim = await ClaimRepository.findById(regressionClaimId);
      expect(claim).not.toBeNull();
      expect(claim!.evidence).toBeDefined();
      expect(claim!.evidence!.length).toBeGreaterThanOrEqual(1);

      const attached = claim!.evidence!.find((e) => e.id === realDocId);
      expect(attached).toBeDefined();
      expect(attached!.fileName).toContain("hospital_invoice_real.pdf");
      expect(attached!.fileSize).toBe(originalPdfBuffer.length);
      expect(attached!.fileHash).toBe(expectedHash);
      expect(attached!.fileUrl).toBe(`/api/claims/${regressionClaimId}/evidence/${realDocId}`);
    });

    it("customer can view/download exact bytes", async () => {
      // Inline view
      const viewReq = new NextRequest(
        `http://localhost:3000/api/claims/${regressionClaimId}/evidence/${realDocId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${customerToken}` },
        }
      );
      const viewRes = await getEvidenceRoute(viewReq, {
        params: { id: regressionClaimId, evidenceId: realDocId },
      });

      expect(viewRes.status).toBe(200);
      expect(viewRes.headers.get("content-type")).toBe("application/pdf");
      expect(viewRes.headers.get("content-disposition")).toContain("inline;");
      const viewBytes = Buffer.from(await viewRes.arrayBuffer());
      expect(viewBytes.equals(originalPdfBuffer)).toBe(true);

      // Download
      const dlReq = new NextRequest(
        `http://localhost:3000/api/claims/${regressionClaimId}/evidence/${realDocId}?download=true`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${customerToken}` },
        }
      );
      const dlRes = await getEvidenceRoute(dlReq, {
        params: { id: regressionClaimId, evidenceId: realDocId },
      });

      expect(dlRes.status).toBe(200);
      expect(dlRes.headers.get("content-disposition")).toContain("attachment;");
      const dlBytes = Buffer.from(await dlRes.arrayBuffer());
      expect(dlBytes.equals(originalPdfBuffer)).toBe(true);
    });

    it("other customer receives 403", async () => {
      const unauthorizedReq = new NextRequest(
        `http://localhost:3000/api/claims/${regressionClaimId}/evidence/${realDocId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${otherCustomerToken}` },
        }
      );
      const unauthorizedRes = await getEvidenceRoute(unauthorizedReq, {
        params: { id: regressionClaimId, evidenceId: realDocId },
      });

      expect(unauthorizedRes.status).toBe(403);
    });

    it("spoofed PDF is rejected", async () => {
      const spoofedFormData = new FormData();
      const spoofedBlob = new Blob(["<html><script>malicious()</script></html>"], {
        type: "application/pdf",
      });
      spoofedFormData.append("file", spoofedBlob, "fake_doc.pdf");
      spoofedFormData.append("claimId", regressionClaimId);

      const spoofedReq = new NextRequest("http://localhost:3000/api/claims/evidence/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${customerToken}` },
        body: spoofedFormData,
      });

      const spoofedRes = await uploadEvidenceRoute(spoofedReq);
      expect(spoofedRes.status).toBe(400);
      const json = await spoofedRes.json();
      expect(json.success).toBe(false);
      const errorMsg = typeof json.error === "string" ? json.error : json.error?.message;
      expect(errorMsg).toMatch(/Spoofed or corrupt binary detected/i);
    });

    it(">10 MB rejected", async () => {
      const hugeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);
      // Valid PDF magic bytes at start
      hugeBuffer[0] = 0x25;
      hugeBuffer[1] = 0x50;
      hugeBuffer[2] = 0x44;
      hugeBuffer[3] = 0x46;
      hugeBuffer[4] = 0x2d;

      const oversizedFormData = new FormData();
      const oversizedBlob = new Blob([hugeBuffer], { type: "application/pdf" });
      oversizedFormData.append("file", oversizedBlob, "huge.pdf");
      oversizedFormData.append("claimId", regressionClaimId);

      const oversizedReq = new NextRequest("http://localhost:3000/api/claims/evidence/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${customerToken}` },
        body: oversizedFormData,
      });

      const oversizedRes = await uploadEvidenceRoute(oversizedReq);
      expect(oversizedRes.status).toBe(400);
      const json = await oversizedRes.json();
      expect(json.success).toBe(false);
      const errorMsg = typeof json.error === "string" ? json.error : json.error?.message;
      expect(errorMsg).toMatch(/exceeds maximum allowed size/i);
    });

    it("restart app → evidence still downloadable", async () => {
      // Simulate app / database restart
      await closeDatabase();
      await initDatabase();

      // Retrieve binary after restart
      const reqAfterRestart = new NextRequest(
        `http://localhost:3000/api/claims/${regressionClaimId}/evidence/${realDocId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${customerToken}` },
        }
      );
      const resAfterRestart = await getEvidenceRoute(reqAfterRestart, {
        params: { id: regressionClaimId, evidenceId: realDocId },
      });

      expect(resAfterRestart.status).toBe(200);
      const bytesAfterRestart = Buffer.from(await resAfterRestart.arrayBuffer());
      expect(bytesAfterRestart.equals(originalPdfBuffer)).toBe(true);
    });

    it("no fabricated evidence ID/hash/file URL", async () => {
      const docRecord = await EvidenceRepository.findById(realDocId);
      expect(docRecord).not.toBeNull();

      // Server-generated ID format: ev_{timestamp}_{hex}
      expect(docRecord!.id).toMatch(/^ev_\d+_[a-f0-9]+$/);
      // Real cryptographic SHA-256 (64 hex characters)
      expect(docRecord!.fileHash).toHaveLength(64);
      expect(docRecord!.fileHash).toBe(expectedHash);
      // Real storage key (starts with docId and sanitized name)
      expect(docRecord!.storageKey).toContain(docRecord!.id);
      expect(docRecord!.storageKey).not.toContain("blob:");
      expect(docRecord!.storageKey).not.toContain("data:");
      expect(docRecord!.storageKey).not.toContain("/api/evidence/");

      // Check authoritative claim evidence
      const claim = await ClaimRepository.findById(regressionClaimId);
      const ev = claim!.evidence!.find((e) => e.id === realDocId)!;
      expect(ev.fileUrl).toBe(`/api/claims/${regressionClaimId}/evidence/${realDocId}`);
      expect(ev.fileUrl).not.toContain("blob:");
      expect(ev.fileUrl).not.toContain("data:");
      expect(ev.fileUrl).not.toBe(`/api/evidence/${ev.fileName}`);
    });
  });
});

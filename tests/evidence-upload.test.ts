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
import { JwtService } from "@/server/core/jwt";

describe("P2 — Evidence Upload, SHA-256 Storage & Access Control Tests", () => {
  const customerUser = {
    id: "usr_customer_default",
    name: "Nguyen Van A",
    email: "customer@insurance.vn",
    role: UserRole.CUSTOMER,
  };

  const otherCustomer = {
    id: "usr_other_cust",
    name: "Tran Van B",
    email: "other@insurance.vn",
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
});

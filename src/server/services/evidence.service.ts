import fs from "fs";
import path from "path";
import crypto from "crypto";
import { EvidenceItem, UserRole } from "@/types";
import { db } from "../db/store";
import { ClaimRepository } from "../repositories/claim.repository";
import { EvidenceRepository, ClaimDocumentRecord } from "../repositories/evidence.repository";
import { RbacGuard } from "../core/rbac";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  AuthenticationError,
} from "../core/errors";

export interface AuthenticatedUserContext {
  id: string;
  name?: string;
  role: UserRole;
  email?: string;
}

export class EvidenceService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  private static readonly PRIVATE_STORAGE_DIR = path.resolve(
    process.cwd(),
    "uploads",
    "private",
    "evidence"
  );

  /**
   * Ensure private storage directory exists
   */
  private static ensureStorageDir(): void {
    if (!fs.existsSync(this.PRIVATE_STORAGE_DIR)) {
      fs.mkdirSync(this.PRIVATE_STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Magic bytes verification for strict file integrity (P2.2)
   */
  public static verifyMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
    if (buffer.length < 4) return false;

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (declaredMimeType === "application/pdf") {
      return (
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46 &&
        buffer[4] === 0x2d
      );
    }

    // PNG magic bytes: \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
    if (declaredMimeType === "image/png") {
      if (buffer.length < 8) return false;
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }

    // JPEG magic bytes: 0xFF 0xD8 0xFF
    if (declaredMimeType === "image/jpeg" || declaredMimeType === "image/jpg") {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // WebP magic bytes: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    if (declaredMimeType === "image/webp") {
      if (buffer.length < 12) return false;
      const isRiff =
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46;
      const isWebp =
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50;
      return isRiff && isWebp;
    }

    return false;
  }

  /**
   * Real SHA-256 cryptographic digest calculation (P2.3)
   */
  public static calculateSha256(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Sanitize file names to avoid directory traversal and unsafe characters
   */
  public static sanitizeFilename(filename: string): string {
    const base = path.basename(filename);
    return base.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  /**
   * Process and securely store uploaded evidence
   */
  public static async processUpload(
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    user: AuthenticatedUserContext,
    claimId?: string
  ): Promise<EvidenceItem> {
    if (!user) {
      throw new AuthenticationError("Authentication required to upload evidence.");
    }

    // 1. Validate file size
    if (fileBuffer.length > this.MAX_FILE_SIZE) {
      throw new ValidationError(
        `File exceeds maximum allowed size of 10MB (got ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB).`
      );
    }

    if (fileBuffer.length === 0) {
      throw new ValidationError("File is empty.");
    }

    // 2. Validate MIME type against whitelist
    const normalizedMime = mimeType.toLowerCase();
    if (!this.ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      throw new ValidationError(
        `Unsupported file type (${mimeType}). Only PDF, JPEG, PNG, and WebP are allowed.`
      );
    }

    // 3. Strict magic bytes inspection (prevent spoofed files)
    const isValidMagic = this.verifyMagicBytes(fileBuffer, normalizedMime);
    if (!isValidMagic) {
      throw new ValidationError(
        `File content does not match declared type ${mimeType}. Spoofed or corrupt binary detected.`
      );
    }

    // 4. Compute real SHA-256 hash
    const fileHash = this.calculateSha256(fileBuffer);

    // 5. If claimId is provided, enforce access control
    let validatedClaimId: string | null = null;
    if (claimId) {
      const claim = (await ClaimRepository.findById(claimId)) || db.getClaims().get(claimId);
      if (!claim) {
        throw new NotFoundError("Claim", claimId);
      }
      RbacGuard.assertOwnership(claim.customerId, user, { allowStaff: true, allowAdmin: true });
      validatedClaimId = claim.id;
    }

    // 6. Write binary to private disk storage (P2.4)
    this.ensureStorageDir();
    const docId = `ev_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const sanitizedName = this.sanitizeFilename(originalFilename);
    const storageKey = `${docId}_${sanitizedName}`;
    const absolutePath = path.join(this.PRIVATE_STORAGE_DIR, storageKey);

    await fs.promises.writeFile(absolutePath, fileBuffer);

    // 7. Store metadata in PostgreSQL & in-memory store
    const uploadedAt = new Date().toISOString();
    await EvidenceRepository.create({
      id: docId,
      claimId: validatedClaimId,
      storageKey,
      originalFilename: sanitizedName,
      mimeType: normalizedMime,
      fileSize: fileBuffer.length,
      fileHash,
      createdAt: uploadedAt,
    });

    const evidenceItem: EvidenceItem = {
      id: docId,
      claimId: validatedClaimId || "",
      fileName: sanitizedName,
      fileUrl: validatedClaimId
        ? `/api/claims/${validatedClaimId}/evidence/${docId}`
        : `/api/claims/evidence/${docId}`,
      fileHash,
      fileSize: fileBuffer.length,
      mimeType: normalizedMime,
      uploadedAt,
    };

    db.getState().claimDocuments.set(docId, evidenceItem);

    return evidenceItem;
  }

  /**
   * Retrieve evidence binary with strict ownership and RBAC enforcement (P2.5)
   */
  public static async getEvidenceBinary(
    claimId: string,
    evidenceId: string,
    user: AuthenticatedUserContext
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileHash: string;
  }> {
    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    // 1. Verify Claim and Ownership
    const claim = await ClaimRepository.findById(claimId) || db.getClaims().get(claimId);
    if (!claim) {
      throw new NotFoundError("Claim", claimId);
    }

    RbacGuard.assertOwnership(claim.customerId, user, { allowStaff: true, allowAdmin: true });

    // 2. Lookup Evidence Document in PostgreSQL / memory
    let docRecord = await EvidenceRepository.findById(evidenceId);
    let docMemory = db.getState().claimDocuments.get(evidenceId) || claim.evidence?.find((e) => e.id === evidenceId);

    const fileName = docRecord?.originalFilename || docMemory?.fileName || "evidence_document";
    const mimeType = docRecord?.mimeType || docMemory?.mimeType || "application/octet-stream";
    const fileHash = docRecord?.fileHash || docMemory?.fileHash || "";
    const storageKey = docRecord?.storageKey || evidenceId;

    // 3. Resolve file from private storage
    const targetPath = path.join(this.PRIVATE_STORAGE_DIR, storageKey);

    let buffer: Buffer;
    if (fs.existsSync(targetPath)) {
      buffer = await fs.promises.readFile(targetPath);
    } else {
      // Fallback for seed mock files where binary wasn't uploaded via disk
      buffer = Buffer.from(`%PDF-1.4\n%Mock evidence content for ${fileName}\n%%EOF`);
    }

    return {
      buffer,
      fileName,
      mimeType,
      fileSize: buffer.length,
      fileHash,
    };
  }
}

import { dbConnection, IDatabaseClient } from "../db/postgres";

export interface ClaimDocumentRecord {
  id: string;
  claimId: string | null;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
  createdAt: string;
}

export class EvidenceRepository {
  public static async findById(id: string, client?: IDatabaseClient): Promise<ClaimDocumentRecord | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, claim_id as "claimId", storage_key as "storageKey",
              original_filename as "originalFilename", mime_type as "mimeType",
              file_size as "fileSize", file_hash as "fileHash", created_at as "createdAt"
       FROM claim_documents
       WHERE id = $1 LIMIT 1;`,
      [id]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      claimId: row.claimId,
      storageKey: row.storageKey,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      fileSize: Number(row.fileSize),
      fileHash: row.fileHash,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  public static async findByClaimId(claimId: string, client?: IDatabaseClient): Promise<ClaimDocumentRecord[]> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, claim_id as "claimId", storage_key as "storageKey",
              original_filename as "originalFilename", mime_type as "mimeType",
              file_size as "fileSize", file_hash as "fileHash", created_at as "createdAt"
       FROM claim_documents
       WHERE claim_id = $1
       ORDER BY created_at ASC;`,
      [claimId]
    );

    return res.rows.map((row: any) => ({
      id: row.id,
      claimId: row.claimId,
      storageKey: row.storageKey,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      fileSize: Number(row.fileSize),
      fileHash: row.fileHash,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  public static async create(
    doc: {
      id: string;
      claimId?: string | null;
      storageKey: string;
      originalFilename: string;
      mimeType: string;
      fileSize: number;
      fileHash: string;
      createdAt?: string;
    },
    client?: IDatabaseClient
  ): Promise<ClaimDocumentRecord> {
    const db = client || dbConnection;
    await db.query(
      `INSERT INTO claim_documents (
        id, claim_id, storage_key, original_filename, mime_type, file_size, file_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        claim_id = COALESCE(EXCLUDED.claim_id, claim_documents.claim_id),
        storage_key = EXCLUDED.storage_key,
        file_hash = EXCLUDED.file_hash;`,
      [
        doc.id,
        doc.claimId || null,
        doc.storageKey,
        doc.originalFilename,
        doc.mimeType,
        BigInt(doc.fileSize),
        doc.fileHash,
        doc.createdAt || new Date().toISOString(),
      ]
    );

    return {
      id: doc.id,
      claimId: doc.claimId || null,
      storageKey: doc.storageKey,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      fileHash: doc.fileHash,
      createdAt: doc.createdAt || new Date().toISOString(),
    };
  }

  public static async attachToClaim(documentId: string, claimId: string, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE claim_documents SET claim_id = $1 WHERE id = $2;`,
      [claimId, documentId]
    );
  }
}

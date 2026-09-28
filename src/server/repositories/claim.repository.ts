import { dbConnection, IDatabaseClient } from "../db/postgres";
import { Claim, ClaimStatus, EvidenceItem } from "@/types";
import { ConflictError, NotFoundError } from "../core/errors";

export class ClaimRepository {
  public static async findById(id: string, client?: IDatabaseClient): Promise<Claim | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT c.id, c.claim_number as "claimNumber", c.policy_id as "policyId",
              c.customer_id as "customerId", u.full_name as "customerName",
              c.incident_date as "incidentDate", c.incident_type as "incidentType",
              c.location, c.description, c.requested_amount as "requestedAmount",
              c.approved_amount as "approvedAmount", c.status, c.reviewer_id as "reviewerId",
              c.review_notes as "reviewNotes", c.blockchain_tx_hash as "blockchainTxHash",
              c.version, c.created_at as "createdAt", c.updated_at as "updatedAt"
       FROM claims c
       LEFT JOIN users u ON c.customer_id = u.id
       WHERE c.id = $1
       LIMIT 1;`,
      [id]
    );

    if (res.rows.length === 0) return null;
    const claim = this.mapRow(res.rows[0]);

    // Load documents
    const docRes = await db.query(
      `SELECT id, storage_key as "storageKey", original_filename as "fileName",
              mime_type as "mimeType", file_size as "fileSize", file_hash as "fileHash",
              created_at as "uploadedAt"
       FROM claim_documents
       WHERE claim_id = $1;`,
      [id]
    );

    claim.evidence = docRes.rows.map((d: any) => ({
      id: d.id,
      fileName: d.fileName,
      fileUrl: `/api/claims/${claim.id}/evidence/${d.id}`,
      fileSize: Number(d.fileSize),
      mimeType: d.mimeType,
      fileHash: d.fileHash,
      uploadedAt: new Date(d.uploadedAt).toISOString(),
    }));

    return claim;
  }

  public static async findByClaimNumber(claimNumber: string, client?: IDatabaseClient): Promise<Claim | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id FROM claims WHERE claim_number = $1 LIMIT 1;`,
      [claimNumber]
    );
    if (res.rows.length === 0) return null;
    return this.findById(res.rows[0].id, client);
  }

  public static async findByCustomerId(customerId: string, client?: IDatabaseClient): Promise<Claim[]> {
    return this.findAll({ customerId }, client);
  }

  public static async findAll(
    options?: {
      customerId?: string;
      reviewerId?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
    client?: IDatabaseClient
  ): Promise<Claim[]> {
    const db = client || dbConnection;
    let sql = `
      SELECT c.id, c.claim_number as "claimNumber", c.policy_id as "policyId",
              c.customer_id as "customerId", u.full_name as "customerName",
              c.incident_date as "incidentDate", c.incident_type as "incidentType",
              c.location, c.description, c.requested_amount as "requestedAmount",
              c.approved_amount as "approvedAmount", c.status, c.reviewer_id as "reviewerId",
              c.review_notes as "reviewNotes", c.blockchain_tx_hash as "blockchainTxHash",
              c.version, c.created_at as "createdAt", c.updated_at as "updatedAt"
       FROM claims c
       LEFT JOIN users u ON c.customer_id = u.id
       WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.customerId) {
      params.push(options.customerId);
      sql += ` AND c.customer_id = $${params.length}`;
    }

    if (options?.reviewerId) {
      params.push(options.reviewerId);
      sql += ` AND c.reviewer_id = $${params.length}`;
    }

    if (options?.status && options.status !== "ALL") {
      params.push(options.status);
      sql += ` AND c.status = $${params.length}`;
    }

    if (options?.search) {
      params.push(`%${options.search.toLowerCase()}%`);
      sql += ` AND (LOWER(c.claim_number) LIKE $${params.length} OR LOWER(c.id) LIKE $${params.length} OR LOWER(c.policy_id) LIKE $${params.length} OR LOWER(u.full_name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY c.created_at DESC`;

    if (options?.limit) {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (options?.offset) {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const res = await db.query(sql, params);
    return res.rows.map(this.mapRow);
  }

  public static async create(claim: Claim, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;

    await db.query(
      `INSERT INTO claims (
        id, claim_number, policy_id, customer_id, incident_date,
        incident_type, location, description, requested_amount, approved_amount,
        status, reviewer_id, review_notes, blockchain_tx_hash, version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);`,
      [
        claim.id,
        claim.claimNumber,
        claim.policyId,
        claim.customerId,
        claim.incidentDate,
        claim.incidentType,
        claim.location,
        claim.description,
        BigInt(Math.round(claim.requestedAmount)),
        claim.approvedAmount !== undefined ? BigInt(Math.round(claim.approvedAmount)) : null,
        claim.status || ClaimStatus.SUBMITTED,
        claim.reviewerId || null,
        claim.reviewNotes || null,
        claim.blockchainTxHash || null,
        claim.version || 1,
        claim.createdAt || new Date().toISOString(),
        claim.updatedAt || new Date().toISOString(),
      ]
    );

    // Insert evidence documents if present
    if (claim.evidence && claim.evidence.length > 0) {
      for (const ev of claim.evidence) {
        await db.query(
          `INSERT INTO claim_documents (
            id, claim_id, storage_key, original_filename, mime_type, file_size, file_hash, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;`,
          [
            ev.id,
            claim.id,
            ev.fileUrl || `evidence/${ev.id}`,
            ev.fileName,
            ev.mimeType,
            BigInt(ev.fileSize),
            ev.fileHash || null,
            ev.uploadedAt || new Date().toISOString(),
          ]
        );
      }
    }
  }

  /**
   * P1.5 OPTIMISTIC LOCKING:
   * UPDATE claims SET status = :new_status, version = version + 1 WHERE id = :id AND version = :current_version
   * Throws ConflictError (409) if affected rows = 0.
   */
  public static async updateStatusWithOptimisticLock(
    id: string,
    newStatus: ClaimStatus,
    currentVersion: number,
    updates: {
      approvedAmount?: number;
      reviewerId?: string;
      reviewNotes?: string;
      blockchainTxHash?: string;
    } = {},
    client?: IDatabaseClient
  ): Promise<Claim> {
    const db = client || dbConnection;

    const res = await db.query(
      `UPDATE claims
       SET status = $1,
           version = version + 1,
           approved_amount = COALESCE($2, approved_amount),
           reviewer_id = COALESCE($3, reviewer_id),
           review_notes = COALESCE($4, review_notes),
           blockchain_tx_hash = COALESCE($5, blockchain_tx_hash),
           updated_at = NOW()
       WHERE id = $6 AND version = $7
       RETURNING id, claim_number as "claimNumber", policy_id as "policyId",
                 customer_id as "customerId", incident_date as "incidentDate",
                 incident_type as "incidentType", location, description,
                 requested_amount as "requestedAmount", approved_amount as "approvedAmount",
                 status, reviewer_id as "reviewerId", review_notes as "reviewNotes",
                 blockchain_tx_hash as "blockchainTxHash", version,
                 created_at as "createdAt", updated_at as "updatedAt";`,
      [
        newStatus,
        updates.approvedAmount !== undefined ? BigInt(Math.round(updates.approvedAmount)) : null,
        updates.reviewerId || null,
        updates.reviewNotes || null,
        updates.blockchainTxHash || null,
        id,
        currentVersion,
      ]
    );

    if (res.rowCount === 0 || res.rows.length === 0) {
      // Check if claim exists
      const existing = await this.findById(id, client);
      if (!existing) {
        throw new NotFoundError("Claim", id);
      }
      // Version mismatch -> Conflict
      throw new ConflictError(
        `Optimistic lock failure: Claim ${id} was modified by another transaction. Expected version ${currentVersion}, but current version is ${existing.version}.`
      );
    }

    return this.mapRow(res.rows[0]);
  }

  public static async count(): Promise<number> {
    const res = await dbConnection.query(`SELECT COUNT(*) as count FROM claims;`);
    return parseInt(res.rows[0]?.count || "0", 10);
  }

  private static mapRow(row: any): Claim {
    return {
      id: row.id,
      claimNumber: row.claimNumber,
      policyId: row.policyId,
      customerId: row.customerId,
      customerName: row.customerName || "Policyholder",
      incidentDate: typeof row.incidentDate === "string" ? row.incidentDate : new Date(row.incidentDate).toISOString().split("T")[0],
      incidentType: row.incidentType,
      location: row.location,
      description: row.description,
      requestedAmount: Number(row.requestedAmount),
      approvedAmount: row.approvedAmount !== null && row.approvedAmount !== undefined ? Number(row.approvedAmount) : undefined,
      status: row.status as ClaimStatus,
      reviewerId: row.reviewerId || undefined,
      reviewNotes: row.reviewNotes || undefined,
      blockchainTxHash: row.blockchainTxHash || undefined,
      version: Number(row.version || 1),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }
}

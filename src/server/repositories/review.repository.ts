import { dbConnection, IDatabaseClient } from "../db/postgres";
import { ClaimReview } from "@/types";

export class ReviewRepository {
  public static async findById(id: string, client?: IDatabaseClient): Promise<ClaimReview | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT r.id, r.claim_id as "claimId", r.reviewer_id as "reviewerId",
              u.full_name as "reviewerName", r.decision, r.approved_amount as "approvedAmount",
              r.reason, r.notes, r.created_at as "createdAt"
       FROM claim_reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.id = $1
       LIMIT 1;`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findByClaimId(claimId: string, client?: IDatabaseClient): Promise<ClaimReview | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT r.id, r.claim_id as "claimId", r.reviewer_id as "reviewerId",
              u.full_name as "reviewerName", r.decision, r.approved_amount as "approvedAmount",
              r.reason, r.notes, r.created_at as "createdAt"
       FROM claim_reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.claim_id = $1
       ORDER BY r.created_at DESC
       LIMIT 1;`,
      [claimId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async create(review: ClaimReview, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `INSERT INTO claim_reviews (id, claim_id, reviewer_id, decision, approved_amount, reason, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [
        review.id,
        review.claimId,
        review.reviewerId,
        review.decision,
        review.approvedAmount !== undefined ? BigInt(Math.round(review.approvedAmount)) : null,
        review.reason || null,
        review.notes || null,
        review.createdAt || new Date().toISOString(),
      ]
    );
  }

  private static mapRow(row: any): ClaimReview {
    return {
      id: row.id,
      claimId: row.claimId,
      reviewerId: row.reviewerId,
      reviewerName: row.reviewerName || "Reviewer",
      decision: row.decision,
      approvedAmount: row.approvedAmount !== null && row.approvedAmount !== undefined ? Number(row.approvedAmount) : undefined,
      reason: row.reason || undefined,
      notes: row.notes || undefined,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }
}

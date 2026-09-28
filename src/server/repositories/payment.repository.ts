import { dbConnection, IDatabaseClient } from "../db/postgres";
import { Payment, PaymentStatus } from "@/types";
import { ConflictError } from "../core/errors";

export class PaymentRepository {
  public static async findById(id: string, client?: IDatabaseClient): Promise<Payment | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT p.id, p.claim_id as "claimId", p.policy_id as "policyId",
              p.customer_id as "customerId", u.full_name as "customerName",
              p.amount, p.status, p.payment_method as "method",
              p.recipient_wallet as "recipientWallet",
              p.blockchain_tx_hash as "blockchainTxHash",
              p.processed_at as "processedAt", p.created_at as "createdAt"
       FROM payments p
       LEFT JOIN users u ON p.customer_id = u.id
       WHERE p.id = $1
       LIMIT 1;`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findByClaimId(claimId: string, client?: IDatabaseClient): Promise<Payment | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT p.id, p.claim_id as "claimId", p.policy_id as "policyId",
              p.customer_id as "customerId", u.full_name as "customerName",
              p.amount, p.status, p.payment_method as "method",
              p.recipient_wallet as "recipientWallet",
              p.blockchain_tx_hash as "blockchainTxHash",
              p.processed_at as "processedAt", p.created_at as "createdAt"
       FROM payments p
       LEFT JOIN users u ON p.customer_id = u.id
       WHERE p.claim_id = $1
       LIMIT 1;`,
      [claimId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findByCustomerId(customerId: string, client?: IDatabaseClient): Promise<Payment[]> {
    return this.findAll({ customerId }, client);
  }

  public static async findAll(
    options?: { customerId?: string; status?: string },
    client?: IDatabaseClient
  ): Promise<Payment[]> {
    const db = client || dbConnection;
    let sql = `
      SELECT p.id, p.claim_id as "claimId", p.policy_id as "policyId",
              p.customer_id as "customerId", u.full_name as "customerName",
              p.amount, p.status, p.payment_method as "method",
              p.recipient_wallet as "recipientWallet",
              p.blockchain_tx_hash as "blockchainTxHash",
              p.processed_at as "processedAt", p.created_at as "createdAt"
       FROM payments p
       LEFT JOIN users u ON p.customer_id = u.id
       WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.customerId) {
      params.push(options.customerId);
      sql += ` AND p.customer_id = $${params.length}`;
    }

    if (options?.status && options.status !== "ALL") {
      params.push(options.status);
      sql += ` AND p.status = $${params.length}`;
    }

    sql += ` ORDER BY p.created_at DESC;`;

    const res = await db.query(sql, params);
    return res.rows.map(this.mapRow);
  }

  public static async create(payment: Payment, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    try {
      await db.query(
        `INSERT INTO payments (
          id, claim_id, policy_id, customer_id, amount, status,
          payment_method, recipient_wallet, blockchain_tx_hash, processed_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          payment.id,
          payment.claimId,
          payment.policyId,
          payment.customerId,
          BigInt(Math.round(payment.amount)),
          payment.status || PaymentStatus.PENDING,
          payment.method || "SMART_CONTRACT_ESCROW",
          payment.recipientWallet || null,
          payment.blockchainTxHash || null,
          payment.processedAt || null,
          payment.createdAt || new Date().toISOString(),
        ]
      );
    } catch (err: any) {
      if (err.message && (err.message.includes("unique") || err.message.includes("duplicate") || err.code === "23505")) {
        throw new ConflictError(`Double payment prohibited: Payment record for claim ${payment.claimId} already exists.`);
      }
      throw err;
    }
  }

  public static async update(payment: Payment, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE payments
       SET status = $1,
           blockchain_tx_hash = $2,
           recipient_wallet = $3,
           processed_at = $4
       WHERE id = $5;`,
      [
        payment.status,
        payment.blockchainTxHash || null,
        payment.recipientWallet || null,
        payment.processedAt || new Date().toISOString(),
        payment.id,
      ]
    );
  }

  public static async count(): Promise<number> {
    const res = await dbConnection.query(`SELECT COUNT(*) as count FROM payments;`);
    return parseInt(res.rows[0]?.count || "0", 10);
  }

  private static mapRow(row: any): Payment {
    return {
      id: row.id,
      claimId: row.claimId,
      policyId: row.policyId,
      customerId: row.customerId,
      customerName: row.customerName || "Customer",
      amount: Number(row.amount),
      status: row.status as PaymentStatus,
      method: row.method || "SMART_CONTRACT_ESCROW",
      recipientWallet: row.recipientWallet || undefined,
      blockchainTxHash: row.blockchainTxHash || undefined,
      processedAt: row.processedAt ? new Date(row.processedAt).toISOString() : undefined,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }
}

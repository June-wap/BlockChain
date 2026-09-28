import { dbConnection, IDatabaseClient } from "../db/postgres";
import { BlockchainTransaction, BlockchainTxStatus } from "@/types";

export class BlockchainTransactionRepository {
  public static async findByTxHash(txHash: string, client?: IDatabaseClient): Promise<BlockchainTransaction | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, tx_hash as "txHash", network, action, claim_id as "claimId",
              payment_id as "paymentId", from_address as "from",
              contract_address as "to", block_number as "blockNumber",
              gas_used as "gasUsed", status, confirmation_count as "confirmations",
              submitted_at as "timestamp", confirmed_at as "confirmedAt",
              error_message as "errorMessage"
       FROM blockchain_transactions
       WHERE tx_hash = $1
       LIMIT 1;`,
      [txHash]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findByClaimId(claimId: string, client?: IDatabaseClient): Promise<BlockchainTransaction | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, tx_hash as "txHash", network, action, claim_id as "claimId",
              payment_id as "paymentId", from_address as "from",
              contract_address as "to", block_number as "blockNumber",
              gas_used as "gasUsed", status, confirmation_count as "confirmations",
              submitted_at as "timestamp", confirmed_at as "confirmedAt",
              error_message as "errorMessage"
       FROM blockchain_transactions
       WHERE claim_id = $1
       ORDER BY submitted_at DESC
       LIMIT 1;`,
      [claimId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findByPaymentId(paymentId: string, client?: IDatabaseClient): Promise<BlockchainTransaction | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, tx_hash as "txHash", network, action, claim_id as "claimId",
              payment_id as "paymentId", from_address as "from",
              contract_address as "to", block_number as "blockNumber",
              gas_used as "gasUsed", status, confirmation_count as "confirmations",
              submitted_at as "timestamp", confirmed_at as "confirmedAt",
              error_message as "errorMessage"
       FROM blockchain_transactions
       WHERE payment_id = $1
       ORDER BY submitted_at DESC
       LIMIT 1;`,
      [paymentId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findAll(
    options?: { search?: string; limit?: number; offset?: number },
    client?: IDatabaseClient
  ): Promise<BlockchainTransaction[]> {
    const db = client || dbConnection;
    let sql = `
      SELECT id, tx_hash as "txHash", network, action, claim_id as "claimId",
              payment_id as "paymentId", from_address as "from",
              contract_address as "to", block_number as "blockNumber",
              gas_used as "gasUsed", status, confirmation_count as "confirmations",
              submitted_at as "timestamp", confirmed_at as "confirmedAt",
              error_message as "errorMessage"
       FROM blockchain_transactions
       WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.search) {
      params.push(`%${options.search.toLowerCase()}%`);
      sql += ` AND (LOWER(tx_hash) LIKE $${params.length} OR LOWER(action) LIKE $${params.length} OR LOWER(claim_id) LIKE $${params.length})`;
    }

    sql += ` ORDER BY submitted_at DESC`;

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

  public static async create(tx: BlockchainTransaction, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `INSERT INTO blockchain_transactions (
        id, tx_hash, network, action, claim_id, payment_id,
        from_address, contract_address, block_number, gas_used,
        status, confirmation_count, submitted_at, confirmed_at, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,
      [
        tx.id,
        tx.txHash,
        tx.network,
        tx.action,
        tx.claimId || null,
        tx.paymentId || null,
        tx.from,
        tx.to,
        BigInt(tx.blockNumber),
        BigInt(tx.gasUsed),
        tx.status,
        tx.confirmations || 0,
        tx.timestamp || new Date().toISOString(),
        tx.status === "CONFIRMED" ? new Date().toISOString() : null,
        null,
      ]
    );
  }

  public static async update(tx: BlockchainTransaction, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE blockchain_transactions
       SET status = $1,
           block_number = $2,
           gas_used = $3,
           confirmation_count = $4,
           confirmed_at = $5
       WHERE id = $6;`,
      [
        tx.status,
        BigInt(tx.blockNumber),
        BigInt(tx.gasUsed),
        tx.confirmations || 0,
        tx.status === "CONFIRMED" ? new Date().toISOString() : null,
        tx.id,
      ]
    );
  }

  public static async count(): Promise<number> {
    const res = await dbConnection.query(`SELECT COUNT(*) as count FROM blockchain_transactions;`);
    return parseInt(res.rows[0]?.count || "0", 10);
  }

  private static mapRow(r: any): BlockchainTransaction {
    return {
      id: r.id,
      txHash: r.txHash,
      network: r.network,
      action: r.action,
      claimId: r.claimId || undefined,
      paymentId: r.paymentId || undefined,
      from: r.from,
      to: r.to,
      blockNumber: Number(r.blockNumber),
      gasUsed: Number(r.gasUsed),
      status: r.status as BlockchainTxStatus,
      confirmations: Number(r.confirmations || 0),
      timestamp: new Date(r.timestamp).toISOString(),
    };
  }
}

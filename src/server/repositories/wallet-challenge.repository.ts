import { dbConnection, IDatabaseClient } from "../db/postgres";

export interface WalletChallenge {
  id: string;
  userId: string;
  walletAddress: string;
  nonce: string;
  message: string;
  chainId: number;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export class WalletChallengeRepository {
  private static tableEnsured = false;

  public static async ensureTable(client?: IDatabaseClient): Promise<void> {
    if (this.tableEnsured) return;
    const db = client || dbConnection;
    await db.query(`
      CREATE TABLE IF NOT EXISTS wallet_challenges (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wallet_address VARCHAR(42) NOT NULL,
        nonce VARCHAR(64) NOT NULL UNIQUE,
        message TEXT NOT NULL,
        chain_id INT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_wallet_challenges_nonce ON wallet_challenges(nonce);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_wallet_challenges_user ON wallet_challenges(user_id);`);
    this.tableEnsured = true;
  }

  public static async create(
    challenge: Omit<WalletChallenge, "used" | "createdAt">,
    client?: IDatabaseClient
  ): Promise<void> {
    await this.ensureTable(client);
    const db = client || dbConnection;
    await db.query(
      `INSERT INTO wallet_challenges (
        id, user_id, wallet_address, nonce, message, chain_id, expires_at, used, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW());`,
      [
        challenge.id,
        challenge.userId,
        challenge.walletAddress.toLowerCase(),
        challenge.nonce,
        challenge.message,
        challenge.chainId,
        challenge.expiresAt,
      ]
    );
  }

  public static async findByNonce(
    nonce: string,
    client?: IDatabaseClient
  ): Promise<WalletChallenge | null> {
    await this.ensureTable(client);
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, user_id as "userId", wallet_address as "walletAddress",
              nonce, message, chain_id as "chainId",
              expires_at as "expiresAt", used, created_at as "createdAt"
       FROM wallet_challenges
       WHERE nonce = $1
       LIMIT 1;`,
      [nonce]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      walletAddress: row.walletAddress,
      nonce: row.nonce,
      message: row.message,
      chainId: row.chainId,
      expiresAt: new Date(row.expiresAt).toISOString(),
      used: row.used,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  public static async markUsed(id: string, client?: IDatabaseClient): Promise<void> {
    await this.ensureTable(client);
    const db = client || dbConnection;
    await db.query(
      `UPDATE wallet_challenges SET used = TRUE WHERE id = $1;`,
      [id]
    );
  }

  public static async findActiveByAddress(
    userId: string,
    walletAddress: string,
    client?: IDatabaseClient
  ): Promise<WalletChallenge | null> {
    await this.ensureTable(client);
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, user_id as "userId", wallet_address as "walletAddress",
              nonce, message, chain_id as "chainId",
              expires_at as "expiresAt", used, created_at as "createdAt"
       FROM wallet_challenges
       WHERE user_id = $1
         AND LOWER(wallet_address) = $2
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1;`,
      [userId, walletAddress.toLowerCase()]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      walletAddress: row.walletAddress,
      nonce: row.nonce,
      message: row.message,
      chainId: row.chainId,
      expiresAt: new Date(row.expiresAt).toISOString(),
      used: row.used,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }
}

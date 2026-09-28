import { dbConnection, IDatabaseClient } from "../db/postgres";

export class IdempotencyRepository {
  public static async findTargetId(key: string, client?: IDatabaseClient): Promise<string | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT target_id as "targetId" FROM idempotency_keys WHERE key = $1 LIMIT 1;`,
      [key]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0].targetId;
  }

  public static async recordKey(key: string, targetId: string, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `INSERT INTO idempotency_keys (key, target_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO NOTHING;`,
      [key, targetId]
    );
  }
}

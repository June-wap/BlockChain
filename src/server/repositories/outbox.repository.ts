import { dbConnection, IDatabaseClient } from "../db/postgres";

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  status: "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";
  retryCount: number;
  errorMessage?: string;
  txHash?: string;
  createdAt: string;
  processedAt?: string;
}

export class OutboxRepository {
  public static async create(
    event: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: any;
    },
    client?: IDatabaseClient
  ): Promise<string> {
    const db = client || dbConnection;
    const id = `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.query(
      `INSERT INTO outbox_events (
        id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());`,
      [
        id,
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        JSON.stringify(event.payload),
        "PENDING",
        0,
      ]
    );
    return id;
  }

  public static async getPendingEvents(limit: number = 10, client?: IDatabaseClient): Promise<OutboxEvent[]> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, aggregate_type as "aggregateType", aggregate_id as "aggregateId",
              event_type as "eventType", payload, status, retry_count as "retryCount",
              error_message as "errorMessage", tx_hash as "txHash", created_at as "createdAt",
              processed_at as "processedAt"
       FROM outbox_events
       WHERE status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT $1;`,
      [limit]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      aggregateType: r.aggregateType,
      aggregateId: r.aggregateId,
      eventType: r.eventType,
      payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
      status: r.status,
      retryCount: r.retryCount,
      errorMessage: r.errorMessage || undefined,
      txHash: r.txHash || undefined,
      createdAt: new Date(r.createdAt).toISOString(),
      processedAt: r.processedAt ? new Date(r.processedAt).toISOString() : undefined,
    }));
  }

  public static async markProcessed(id: string, txHash?: string, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE outbox_events
       SET status = 'PROCESSED', tx_hash = COALESCE($2, tx_hash), processed_at = NOW()
       WHERE id = $1;`,
      [id, txHash || null]
    );
  }

  public static async markFailed(id: string, errorMessage: string, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE outbox_events
       SET status = 'FAILED',
           retry_count = retry_count + 1,
           error_message = $1,
           processed_at = NOW()
       WHERE id = $2;`,
      [errorMessage, id]
    );
  }
}

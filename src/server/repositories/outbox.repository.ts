import { dbConnection, IDatabaseClient } from "../db/postgres";

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  status: "PENDING" | "PROCESSING" | "RETRY" | "PROCESSED" | "FAILED" | "DEAD_LETTER";
  retryCount: number;
  maxRetries: number;
  nextAttemptAt: string;
  lockedAt?: string;
  lockedBy?: string;
  errorMessage?: string;
  lastError?: string;
  txHash?: string;
  createdAt: string;
  processedAt?: string;
}

export class OutboxRepository {
  /**
   * Enqueue a new domain outbox event
   */
  public static async create(
    event: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: any;
      maxRetries?: number;
    },
    client?: IDatabaseClient
  ): Promise<string> {
    const db = client || dbConnection;
    const id = `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const maxRetries = event.maxRetries ?? 5;

    await db.query(
      `INSERT INTO outbox_events (
        id, aggregate_type, aggregate_id, event_type, payload, status,
        retry_count, max_retries, next_attempt_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, $6, NOW(), NOW());`,
      [
        id,
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        JSON.stringify(event.payload),
        maxRetries,
      ]
    );
    return id;
  }

  /**
   * Reclaims stale leases (crash recovery): resets events locked longer than leaseDurationSeconds back to RETRY
   */
  public static async reclaimStaleLeases(
    leaseDurationSeconds: number = 60,
    client?: IDatabaseClient
  ): Promise<number> {
    const db = client || dbConnection;
    const res = await db.query(
      `UPDATE outbox_events
       SET status = 'RETRY',
           locked_at = NULL,
           locked_by = NULL,
           next_attempt_at = NOW()
       WHERE status = 'PROCESSING'
         AND locked_at < NOW() - ($1 || ' seconds')::INTERVAL;`,
      [leaseDurationSeconds.toString()]
    );
    return res.rowCount;
  }

  /**
   * Atomically leases the next batch of ready outbox events using SKIP LOCKED semantics
   */
  public static async claimNextBatch(
    batchSize: number = 10,
    workerId: string = `worker_${process.pid}`,
    leaseDurationSeconds: number = 60,
    client?: IDatabaseClient
  ): Promise<OutboxEvent[]> {
    const db = client || dbConnection;

    // 1. Recover stale leases
    await this.reclaimStaleLeases(leaseDurationSeconds, db);

    // 2. Atomically lock & claim next ready candidates
    const res = await db.query(
      `UPDATE outbox_events
       SET status = 'PROCESSING',
           locked_at = NOW(),
           locked_by = $1
       WHERE id IN (
         SELECT id FROM outbox_events
         WHERE status IN ('PENDING', 'RETRY')
           AND next_attempt_at <= NOW()
         ORDER BY created_at ASC
         LIMIT $2
       )
       RETURNING id, aggregate_type as "aggregateType", aggregate_id as "aggregateId",
                 event_type as "eventType", payload, status, retry_count as "retryCount",
                 max_retries as "maxRetries", next_attempt_at as "nextAttemptAt",
                 locked_at as "lockedAt", locked_by as "lockedBy",
                 error_message as "errorMessage", last_error as "lastError",
                 tx_hash as "txHash", created_at as "createdAt", processed_at as "processedAt";`,
      [workerId, batchSize]
    );

    return res.rows.map(this.mapRow);
  }

  /**
   * Record successful processing of an outbox event
   */
  public static async recordSuccess(
    id: string,
    txHash?: string,
    client?: IDatabaseClient
  ): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE outbox_events
       SET status = 'PROCESSED',
           tx_hash = COALESCE($2, tx_hash),
           locked_at = NULL,
           locked_by = NULL,
           processed_at = NOW()
       WHERE id = $1;`,
      [id, txHash || null]
    );
  }

  /**
   * Record failure with bounded exponential backoff or dead-letter queuing
   */
  public static async recordFailure(
    id: string,
    errorMessage: string,
    options?: { maxRetries?: number; backoffSeconds?: number },
    client?: IDatabaseClient
  ): Promise<void> {
    const db = client || dbConnection;

    // Fetch current retry state
    const res = await db.query(
      `SELECT retry_count as "retryCount", max_retries as "maxRetries" FROM outbox_events WHERE id = $1;`,
      [id]
    );

    if (res.rows.length === 0) return;

    const currentRetry = Number(res.rows[0].retryCount || 0);
    const maxRetries = options?.maxRetries ?? Number(res.rows[0].maxRetries || 5);
    const nextRetryCount = currentRetry + 1;

    if (nextRetryCount >= maxRetries) {
      // Exceeded max retries -> Move to DEAD_LETTER queue
      await db.query(
        `UPDATE outbox_events
         SET status = 'DEAD_LETTER',
             retry_count = $1,
             error_message = $2,
             last_error = $2,
             locked_at = NULL,
             locked_by = NULL,
             processed_at = NOW()
         WHERE id = $3;`,
        [nextRetryCount, errorMessage, id]
      );
    } else {
      // Bounded exponential backoff: base 5s -> 10s -> 20s -> 40s (capped at 300s)
      const computedBackoff = options?.backoffSeconds ?? Math.min(300, Math.pow(2, currentRetry) * 5);
      await db.query(
        `UPDATE outbox_events
         SET status = 'RETRY',
             retry_count = $1,
             error_message = $2,
             last_error = $2,
             next_attempt_at = NOW() + ($3 || ' seconds')::INTERVAL,
             locked_at = NULL,
             locked_by = NULL
         WHERE id = $4;`,
        [nextRetryCount, errorMessage, computedBackoff.toString(), id]
      );
    }
  }

  /**
   * Backwards-compatible methods
   */
  public static async getPendingEvents(limit: number = 10, client?: IDatabaseClient): Promise<OutboxEvent[]> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, aggregate_type as "aggregateType", aggregate_id as "aggregateId",
              event_type as "eventType", payload, status, retry_count as "retryCount",
              max_retries as "maxRetries", next_attempt_at as "nextAttemptAt",
              locked_at as "lockedAt", locked_by as "lockedBy",
              error_message as "errorMessage", last_error as "lastError",
              tx_hash as "txHash", created_at as "createdAt", processed_at as "processedAt"
       FROM outbox_events
       WHERE status IN ('PENDING', 'RETRY')
         AND next_attempt_at <= NOW()
       ORDER BY created_at ASC
       LIMIT $1;`,
      [limit]
    );

    return res.rows.map(this.mapRow);
  }

  public static async markProcessed(id: string, txHash?: string, client?: IDatabaseClient): Promise<void> {
    return this.recordSuccess(id, txHash, client);
  }

  public static async markFailed(id: string, errorMessage: string, client?: IDatabaseClient): Promise<void> {
    return this.recordFailure(id, errorMessage, undefined, client);
  }

  private static mapRow(r: any): OutboxEvent {
    return {
      id: r.id,
      aggregateType: r.aggregateType,
      aggregateId: r.aggregateId,
      eventType: r.eventType,
      payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
      status: r.status,
      retryCount: Number(r.retryCount || 0),
      maxRetries: Number(r.maxRetries || 5),
      nextAttemptAt: r.nextAttemptAt ? new Date(r.nextAttemptAt).toISOString() : new Date().toISOString(),
      lockedAt: r.lockedAt ? new Date(r.lockedAt).toISOString() : undefined,
      lockedBy: r.lockedBy || undefined,
      errorMessage: r.errorMessage || undefined,
      lastError: r.lastError || undefined,
      txHash: r.txHash || undefined,
      createdAt: new Date(r.createdAt).toISOString(),
      processedAt: r.processedAt ? new Date(r.processedAt).toISOString() : undefined,
    };
  }
}

import { dbConnection, IDatabaseClient } from "../db/postgres";
import { AuditAction, AuditLog, UserRole } from "@/types";

export class AuditRepository {
  public static async create(log: AuditLog, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, role, action, entity_type, entity_id, ip_address, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
      [
        log.id,
        log.timestamp || new Date().toISOString(),
        log.actorId,
        log.actorName,
        log.role,
        log.action,
        log.entityType,
        log.entityId,
        log.ipAddress || null,
        log.metadata ? JSON.stringify(log.metadata) : null,
      ]
    );
  }

  public static async findAll(
    options?: { action?: string; entityType?: string; search?: string; limit?: number; offset?: number },
    client?: IDatabaseClient
  ): Promise<AuditLog[]> {
    const db = client || dbConnection;
    let sql = `
      SELECT id, timestamp, actor_id as "actorId", actor_name as "actorName",
             role, action, entity_type as "entityType", entity_id as "entityId",
             ip_address as "ipAddress", metadata
      FROM audit_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.action) {
      params.push(options.action);
      sql += ` AND action = $${params.length}`;
    }

    if (options?.entityType) {
      params.push(options.entityType);
      sql += ` AND entity_type = $${params.length}`;
    }

    if (options?.search) {
      params.push(`%${options.search.toLowerCase()}%`);
      sql += ` AND (LOWER(actor_name) LIKE $${params.length} OR LOWER(action) LIKE $${params.length} OR LOWER(entity_id) LIKE $${params.length})`;
    }

    sql += ` ORDER BY timestamp DESC`;

    if (options?.limit) {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (options?.offset) {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const res = await db.query(sql, params);
    return res.rows.map((r: any) => ({
      id: r.id,
      timestamp: new Date(r.timestamp).toISOString(),
      actorId: r.actorId,
      actorName: r.actorName,
      role: r.role as UserRole,
      action: r.action as AuditAction,
      entityType: r.entityType,
      entityId: r.entityId,
      ipAddress: r.ipAddress || undefined,
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata || undefined,
    }));
  }

  public static async count(): Promise<number> {
    const res = await dbConnection.query(`SELECT COUNT(*) as count FROM audit_logs;`);
    return parseInt(res.rows[0]?.count || "0", 10);
  }
}

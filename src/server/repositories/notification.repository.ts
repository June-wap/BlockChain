import { dbConnection, IDatabaseClient } from "../db/postgres";
import { SystemNotification } from "@/types";

export class NotificationRepository {
  public static async findByUserId(userId: string, client?: IDatabaseClient): Promise<SystemNotification[]> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT id, user_id as "userId", title, message, type, read,
              link_url as "linkUrl", created_at as "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC;`,
      [userId]
    );

    return res.rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      message: r.message,
      type: r.type,
      read: Boolean(r.read),
      linkUrl: r.linkUrl || undefined,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
  }

  public static async create(notif: SystemNotification, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `INSERT INTO notifications (id, user_id, title, message, type, read, link_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [
        notif.id,
        notif.userId,
        notif.title,
        notif.message,
        notif.type,
        notif.read || false,
        notif.linkUrl || null,
        notif.createdAt || new Date().toISOString(),
      ]
    );
  }

  public static async markAsRead(id: string, userId: string, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2;`,
      [id, userId]
    );
  }

  public static async markAllAsRead(userId: string, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1;`,
      [userId]
    );
  }
}

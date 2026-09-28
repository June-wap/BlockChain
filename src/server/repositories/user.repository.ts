import { dbConnection, IDatabaseClient } from "../db/postgres";
import { User, UserRole, UserStatus } from "@/types";

export interface UserEntity extends User {
  passwordHash: string;
  status: UserStatus;
  updatedAt?: string;
}

export class UserRepository {
  public static async findById(id: string, client?: IDatabaseClient): Promise<UserEntity | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT u.id, u.email, u.full_name as "fullName", u.phone as "phoneNumber", 
              u.password_hash as "passwordHash", u.wallet_address as "walletAddress", 
              u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
              r.name as role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       LIMIT 1;`,
      [id]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      passwordHash: row.passwordHash,
      walletAddress: row.walletAddress,
      status: row.status as UserStatus,
      role: (row.role || UserRole.CUSTOMER) as UserRole,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  public static async findByEmail(email: string, client?: IDatabaseClient): Promise<UserEntity | null> {
    const db = client || dbConnection;
    const normalizedEmail = email.trim().toLowerCase();
    const res = await db.query(
      `SELECT u.id, u.email, u.full_name as "fullName", u.phone as "phoneNumber", 
              u.password_hash as "passwordHash", u.wallet_address as "walletAddress", 
              u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
              r.name as role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(u.email) = $1
       LIMIT 1;`,
      [normalizedEmail]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      passwordHash: row.passwordHash,
      walletAddress: row.walletAddress,
      status: row.status as UserStatus,
      role: (row.role || UserRole.CUSTOMER) as UserRole,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  public static async create(user: UserEntity, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;

    // 1. Ensure roles table has the user's role
    await db.query(
      `INSERT INTO roles (id, name, description) 
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING;`,
      [user.role, user.role, `${user.role} system role`]
    );

    // 2. Insert user
    await db.query(
      `INSERT INTO users (id, email, full_name, phone, password_hash, wallet_address, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [
        user.id,
        user.email.toLowerCase(),
        user.fullName,
        user.phoneNumber || null,
        user.passwordHash,
        user.walletAddress || null,
        user.status || UserStatus.ACTIVE,
        user.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    // 3. Assign role
    await db.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING;`,
      [user.id, user.role]
    );
  }

  public static async updateStatus(id: string, status: UserStatus, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2;`,
      [status, id]
    );
  }

  public static async findAll(filter?: { role?: UserRole; status?: UserStatus; search?: string }): Promise<UserEntity[]> {
    let sql = `
      SELECT u.id, u.email, u.full_name as "fullName", u.phone as "phoneNumber", 
             u.password_hash as "passwordHash", u.wallet_address as "walletAddress", 
             u.status, u.created_at as "createdAt", u.updated_at as "updatedAt",
             r.name as role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.role) {
      params.push(filter.role);
      sql += ` AND r.name = $${params.length}`;
    }
    if (filter?.status) {
      params.push(filter.status);
      sql += ` AND u.status = $${params.length}`;
    }
    if (filter?.search) {
      params.push(`%${filter.search.toLowerCase()}%`);
      sql += ` AND (LOWER(u.full_name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length} OR LOWER(u.id) LIKE $${params.length})`;
    }

    sql += ` ORDER BY u.created_at DESC;`;

    const res = await dbConnection.query(sql, params);
    return res.rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      passwordHash: row.passwordHash,
      walletAddress: row.walletAddress,
      status: row.status as UserStatus,
      role: (row.role || UserRole.CUSTOMER) as UserRole,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  public static async count(): Promise<number> {
    const res = await dbConnection.query(`SELECT COUNT(*) as count FROM users;`);
    return parseInt(res.rows[0]?.count || "0", 10);
  }
}

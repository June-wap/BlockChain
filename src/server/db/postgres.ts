import fs from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";
import { Pool, PoolClient } from "pg";

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface IDatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private pgliteInstance: PGlite | null = null;
  private pgPool: Pool | null = null;
  private isInitialized = false;
  private dbDir: string;

  constructor() {
    this.dbDir = path.resolve(process.cwd(), "data", "postgres");
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initializes database connection (PostgreSQL Pool if DATABASE_URL is set, otherwise persistent PGlite).
   * Runs migrations automatically.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (process.env.DATABASE_URL) {
      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
    } else {
      if (!fs.existsSync(this.dbDir)) {
        fs.mkdirSync(this.dbDir, { recursive: true });
      }
      const pidFile = path.join(this.dbDir, "postmaster.pid");
      if (fs.existsSync(pidFile)) {
        try {
          fs.unlinkSync(pidFile);
        } catch {}
      }
      this.pgliteInstance = new PGlite(this.dbDir);
    }

    await this.runMigrations();
    this.isInitialized = true;

    // Seed initial records if empty
    const { seedDatabaseIfEmpty } = await import("./seed");
    await seedDatabaseIfEmpty();
  }

  /**
   * Run pending SQL migrations from migrations directory
   */
  public async runMigrations(): Promise<void> {
    // 1. Create schema_migrations table
    await this.execute(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`
    );

    // 2. Read migration files
    const migrationsDir = path.resolve(__dirname, "migrations");
    if (!fs.existsSync(migrationsDir)) return;

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const res = await this.execute(
        `SELECT version FROM schema_migrations WHERE version = $1;`,
        [file]
      );
      if (res.rows.length === 0) {
        const filePath = path.join(migrationsDir, file);
        let sql = fs.readFileSync(filePath, "utf-8");

        // Clean out pg-only extensions if running in PGlite WASM
        if (this.pgliteInstance) {
          sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/gi, "-- uuid extension");
        }

        // Execute migration
        if (this.pgliteInstance) {
          await this.pgliteInstance.exec(sql);
        } else if (this.pgPool) {
          await this.pgPool.query(sql);
        }
        await this.execute(
          `INSERT INTO schema_migrations (version) VALUES ($1);`,
          [file]
        );
      }
    }
  }

  /**
   * Execute parameterized query
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.execute<T>(sql, params);
  }

  private async execute<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount || 0,
      };
    } else if (this.pgliteInstance) {
      const res = await this.pgliteInstance.query<T>(sql, params);
      return {
        rows: res.rows || [],
        rowCount: res.affectedRows || (res.rows ? res.rows.length : 0),
      };
    }
    throw new Error("Database not initialized.");
  }

  /**
   * Execute within a single database transaction
   */
  public async transaction<T>(callback: (client: IDatabaseClient) => Promise<T>): Promise<T> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query("BEGIN");
        const clientAdapter: IDatabaseClient = {
          query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
            const res = await client.query(sql, params);
            return { rows: res.rows as R[], rowCount: res.rowCount || 0 };
          },
        };
        const result = await callback(clientAdapter);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } else if (this.pgliteInstance) {
      await this.pgliteInstance.query("BEGIN");
      try {
        const clientAdapter: IDatabaseClient = {
          query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
            const res = await this.pgliteInstance!.query(sql, params);
            return {
              rows: (res.rows || []) as R[],
              rowCount: res.affectedRows || (res.rows ? res.rows.length : 0),
            };
          },
        };
        const result = await callback(clientAdapter);
        await this.pgliteInstance.query("COMMIT");
        return result;
      } catch (err) {
        await this.pgliteInstance.query("ROLLBACK");
        throw err;
      }
    }
    throw new Error("Database not initialized.");
  }

  /**
   * Closes database connections (used for testing persistence restart)
   */
  public async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }
    if (this.pgliteInstance) {
      await this.pgliteInstance.close();
      this.pgliteInstance = null;
    }
    this.isInitialized = false;
  }
}

export const dbConnection = DatabaseManager.getInstance();
export const initDatabase = async () => dbConnection.initialize();
export const closeDatabase = async () => dbConnection.close();

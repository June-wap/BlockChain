import { dbConnection, IDatabaseClient } from "../db/postgres";
import { PolicyDetail, PolicyStatus } from "@/types";

export class PolicyRepository {
  public static async findById(id: string, client?: IDatabaseClient): Promise<PolicyDetail | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT p.id, p.policy_number as "policyNumber", p.customer_id as "customerId",
              u.full_name as "customerName", p.insurance_type as "type",
              p.coverage_amount as "coverageAmount", p.premium_amount as "premiumAmount",
              p.deductible, p.start_date as "startDate", p.end_date as "endDate",
              p.status, p.terms_uri as "termsUri", p.created_at as "createdAt",
              p.updated_at as "updatedAt"
       FROM policies p
       LEFT JOIN users u ON p.customer_id = u.id
       WHERE p.id = $1
       LIMIT 1;`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findByPolicyNumber(policyNumber: string, client?: IDatabaseClient): Promise<PolicyDetail | null> {
    const db = client || dbConnection;
    const res = await db.query(
      `SELECT p.id, p.policy_number as "policyNumber", p.customer_id as "customerId",
              u.full_name as "customerName", p.insurance_type as "type",
              p.coverage_amount as "coverageAmount", p.premium_amount as "premiumAmount",
              p.deductible, p.start_date as "startDate", p.end_date as "endDate",
              p.status, p.terms_uri as "termsUri", p.created_at as "createdAt",
              p.updated_at as "updatedAt"
       FROM policies p
       LEFT JOIN users u ON p.customer_id = u.id
       WHERE p.policy_number = $1
       LIMIT 1;`,
      [policyNumber]
    );

    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  public static async findByCustomerId(
    customerId: string,
    options?: { status?: string; search?: string },
    client?: IDatabaseClient
  ): Promise<PolicyDetail[]> {
    const db = client || dbConnection;
    let sql = `
      SELECT p.id, p.policy_number as "policyNumber", p.customer_id as "customerId",
             u.full_name as "customerName", p.insurance_type as "type",
             p.coverage_amount as "coverageAmount", p.premium_amount as "premiumAmount",
             p.deductible, p.start_date as "startDate", p.end_date as "endDate",
             p.status, p.terms_uri as "termsUri", p.created_at as "createdAt",
             p.updated_at as "updatedAt"
      FROM policies p
      LEFT JOIN users u ON p.customer_id = u.id
      WHERE p.customer_id = $1
    `;
    const params: any[] = [customerId];

    if (options?.status && options.status !== "ALL") {
      params.push(options.status);
      sql += ` AND p.status = $${params.length}`;
    }

    if (options?.search) {
      params.push(`%${options.search.toLowerCase()}%`);
      sql += ` AND (LOWER(p.policy_number) LIKE $${params.length} OR LOWER(p.insurance_type) LIKE $${params.length})`;
    }

    sql += ` ORDER BY p.created_at DESC;`;

    const res = await db.query(sql, params);
    return res.rows.map(this.mapRow);
  }

  public static async findAll(
    options?: { status?: string; search?: string },
    client?: IDatabaseClient
  ): Promise<PolicyDetail[]> {
    const db = client || dbConnection;
    let sql = `
      SELECT p.id, p.policy_number as "policyNumber", p.customer_id as "customerId",
             u.full_name as "customerName", p.insurance_type as "type",
             p.coverage_amount as "coverageAmount", p.premium_amount as "premiumAmount",
             p.deductible, p.start_date as "startDate", p.end_date as "endDate",
             p.status, p.terms_uri as "termsUri", p.created_at as "createdAt",
             p.updated_at as "updatedAt"
      FROM policies p
      LEFT JOIN users u ON p.customer_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.status && options.status !== "ALL") {
      params.push(options.status);
      sql += ` AND p.status = $${params.length}`;
    }

    if (options?.search) {
      params.push(`%${options.search.toLowerCase()}%`);
      sql += ` AND (LOWER(p.policy_number) LIKE $${params.length} OR LOWER(p.insurance_type) LIKE $${params.length} OR LOWER(u.full_name) LIKE $${params.length})`;
    }

    sql += ` ORDER BY p.created_at DESC;`;

    const res = await db.query(sql, params);
    return res.rows.map(this.mapRow);
  }

  public static async create(policy: PolicyDetail, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `INSERT INTO policies (id, policy_number, customer_id, insurance_type, coverage_amount, premium_amount, deductible, start_date, end_date, status, terms_uri, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
      [
        policy.id,
        policy.policyNumber,
        policy.customerId,
        policy.type || (policy as any).insuranceType || "General",
        BigInt(Math.round(policy.coverageAmount)),
        BigInt(Math.round(policy.premiumAmount)),
        BigInt(Math.round(policy.deductible || 0)),
        policy.startDate,
        policy.endDate,
        policy.status || PolicyStatus.ACTIVE,
        null,
        policy.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  }

  public static async updateStatus(id: string, status: PolicyStatus, changedBy: string = "system", client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE policies SET status = $1, updated_at = NOW() WHERE id = $2;`,
      [status, id]
    );

    // Record history
    await db.query(
      `INSERT INTO policy_history (id, policy_id, action, new_status, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW());`,
      [`ph_${Date.now()}`, id, "STATUS_CHANGE", status, changedBy]
    );
  }

  public static async update(policy: PolicyDetail, client?: IDatabaseClient): Promise<void> {
    const db = client || dbConnection;
    await db.query(
      `UPDATE policies
       SET insurance_type = $1,
           coverage_amount = $2,
           premium_amount = $3,
           deductible = $4,
           status = $5,
           start_date = $6,
           end_date = $7,
           updated_at = NOW()
       WHERE id = $8;`,
      [
        policy.type,
        BigInt(Math.round(policy.coverageAmount)),
        BigInt(Math.round(policy.premiumAmount)),
        BigInt(Math.round(policy.deductible || 0)),
        policy.status,
        policy.startDate,
        policy.endDate,
        policy.id,
      ]
    );
  }

  public static async count(client?: IDatabaseClient): Promise<number> {
    const db = client || dbConnection;
    const res = await db.query(`SELECT COUNT(*) as count FROM policies;`);
    return parseInt(res.rows[0]?.count || "0", 10);
  }

  private static mapRow(row: any): PolicyDetail {
    return {
      id: row.id,
      policyNumber: row.policyNumber,
      customerId: row.customerId,
      customerName: row.customerName || "Customer",
      policyHolder: row.customerName || "Customer",
      type: row.type,
      coverageAmount: Number(row.coverageAmount),
      premiumAmount: Number(row.premiumAmount),
      deductible: Number(row.deductible),
      startDate: typeof row.startDate === "string" ? row.startDate : new Date(row.startDate).toISOString().split("T")[0],
      endDate: typeof row.endDate === "string" ? row.endDate : new Date(row.endDate).toISOString().split("T")[0],
      status: row.status as PolicyStatus,
      coverages: [
        { name: "Hospitalization & Inpatient", maxAmount: Math.round(Number(row.coverageAmount) * 0.8), description: "Medical care and surgery" },
        { name: "Outpatient Services", maxAmount: Math.round(Number(row.coverageAmount) * 0.2), description: "Clinical consultations and tests" },
      ],
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    };
  }
}

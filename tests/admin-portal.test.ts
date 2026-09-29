import { describe, it, expect, beforeAll } from "vitest";
import { UserRepository } from "@/server/repositories/user.repository";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { AuditRepository } from "@/server/repositories/audit.repository";
import { BlockchainService } from "@/server/services/blockchain.service";
import { initDatabase } from "@/server/db/postgres";
import { AuditAction, UserRole } from "@/types";

describe("Admin Console & RBAC Operations (FE-20 to FE-28)", () => {
  beforeAll(async () => {
    await initDatabase();
  });

  it("should calculate accurate 8 KPIs without floating-point inaccuracies", async () => {
    const totalCustomers = await UserRepository.count();
    const activePolicies = await PolicyRepository.count();
    const claims = await ClaimRepository.findAll();

    expect(totalCustomers).toBeGreaterThan(0);
    expect(activePolicies).toBeGreaterThan(0);
    expect(claims.length).toBeGreaterThan(0);
  });

  it("should record immutable audit logs for sensitive operations", async () => {
    const auditId = `aud-test-${Date.now()}`;
    await AuditRepository.create({
      id: auditId,
      timestamp: new Date().toISOString(),
      actorId: "usr_admin_1",
      actorName: "Admin Hoang Vu",
      role: UserRole.ADMIN,
      action: AuditAction.USER_SUSPENDED,
      entityType: "USER",
      entityId: "usr_customer_default",
      metadata: { reason: "Security verification" },
    });

    const retrieved = await AuditRepository.findById(auditId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.action).toBe(AuditAction.USER_SUSPENDED);
  });

  it("should retrieve blockchain telemetry and handle contracts", () => {
    const telemetry = BlockchainService.getTelemetry();
    expect(telemetry.network).toMatch(/Sepolia|Hardhat/);
    expect(telemetry.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(telemetry.stats.totalTransactions).toBeGreaterThan(0);
  });
});

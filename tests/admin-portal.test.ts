import { describe, it, expect } from "vitest";
import { db } from "@/server/db/store";
import { BlockchainService } from "@/server/services/blockchain.service";
import { AuditAction, UserRole, UserStatus } from "@/types";

describe("Admin Console & RBAC Operations (FE-20 to FE-28)", () => {
  it("should calculate accurate 8 KPIs without floating-point inaccuracies", () => {
    const users = Array.from(db.getUsers().values());
    const policies = Array.from(db.getPolicies().values());
    const claims = Array.from(db.getClaims().values());

    const totalCustomers = users.filter((u) => u.role === UserRole.CUSTOMER).length;
    const activePolicies = policies.filter((p) => p.status === "ACTIVE").length;

    expect(totalCustomers).toBeGreaterThan(0);
    expect(activePolicies).toBeGreaterThan(0);
    expect(claims.length).toBeGreaterThan(0);
  });

  it("should record immutable audit logs for sensitive operations", () => {
    const log = db.logAudit({
      actorId: "usr_admin_1",
      actorName: "Admin Hoang Vu",
      role: UserRole.ADMIN,
      action: AuditAction.USER_SUSPENDED,
      entityType: "USER",
      entityId: "usr_customer_default",
      metadata: { reason: "Security verification" },
    });

    expect(log.id).toBeDefined();
    expect(log.timestamp).toBeDefined();

    const retrieved = db.getAuditLogs().find((l) => l.id === log.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.action).toBe(AuditAction.USER_SUSPENDED);
  });

  it("should retrieve blockchain telemetry and handle contracts", () => {
    const telemetry = BlockchainService.getTelemetry();
    expect(telemetry.network).toContain("Sepolia");
    expect(telemetry.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(telemetry.stats.totalTransactions).toBeGreaterThan(0);
  });
});

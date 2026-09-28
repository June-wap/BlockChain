import { describe, it, expect, beforeAll } from "vitest";
import { PolicyService } from "@/server/services/policy.service";
import { PolicyStatus, UserRole } from "@/types";
import { initDatabase } from "@/server/db/postgres";

describe("Customer Policies Domain (FE-07 & FE-08)", () => {
  const customerId = "usr_customer_default";
  const customerUser = { id: customerId, role: UserRole.CUSTOMER };
  const otherCustomerUser = { id: "usr_customer_2", role: UserRole.CUSTOMER };

  beforeAll(async () => {
    await initDatabase();
  });

  it("should retrieve policies owned by the customer", async () => {
    const result = await PolicyService.getCustomerPolicies(customerId);
    expect(result.policies.length).toBeGreaterThan(0);
    result.policies.forEach((p) => {
      expect(p.customerId).toBe(customerId);
    });
  });

  it("should filter policies by status correctly", async () => {
    const activeResult = await PolicyService.getCustomerPolicies(customerId, {
      status: PolicyStatus.ACTIVE,
    });
    activeResult.policies.forEach((p) => {
      expect(p.status).toBe(PolicyStatus.ACTIVE);
    });

    const expiredResult = await PolicyService.getCustomerPolicies(customerId, {
      status: PolicyStatus.EXPIRED,
    });
    expiredResult.policies.forEach((p) => {
      expect(p.status).toBe(PolicyStatus.EXPIRED);
    });
  });

  it("should enforce ownership checks on policy detail (FE-08)", async () => {
    // Owner can access
    const ownerAccess = await PolicyService.getPolicyById("pol-101", customerUser);
    expect(ownerAccess.status).toBe(200);
    expect(ownerAccess.policy?.id).toBe("pol-101");
    expect(ownerAccess.policy?.coverages?.length).toBeGreaterThan(0);

    // Another customer is forbidden (403)
    const unauthorizedAccess = await PolicyService.getPolicyById("pol-101", otherCustomerUser);
    expect(unauthorizedAccess.status).toBe(403);
    expect(unauthorizedAccess.error).toContain("Forbidden");
  });

  it("should return 404 for non-existent policy", async () => {
    const notFound = await PolicyService.getPolicyById("non-existent-pol", customerUser);
    expect(notFound.status).toBe(404);
  });
});

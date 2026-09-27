import { PolicyDetail, PolicyStatus, UserRole } from "@/types";
import { db } from "../db/store";

export interface PolicyQueryParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class PolicyService {
  /**
   * Get policies for a customer with ownership check
   */
  public static getCustomerPolicies(
    customerId: string,
    params: PolicyQueryParams = {}
  ): { policies: PolicyDetail[]; total: number } {
    let policies = Array.from(db.getPolicies().values()).filter(
      (p) => p.customerId === customerId
    );

    // Filter by status if specified
    if (params.status && params.status !== "ALL") {
      policies = policies.filter(
        (p) => p.status.toUpperCase() === params.status?.toUpperCase()
      );
    }

    // Search by policy number or type
    if (params.search && params.search.trim() !== "") {
      const q = params.search.toLowerCase().trim();
      policies = policies.filter(
        (p) =>
          p.policyNumber.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q)
      );
    }

    return {
      policies,
      total: policies.length,
    };
  }

  /**
   * Get policy detail by ID with strict ownership check
   */
  public static getPolicyById(
    policyId: string,
    requestUser: { id: string; role: UserRole }
  ): { policy?: PolicyDetail; error?: string; status: number } {
    const policy = db.getPolicies().get(policyId);
    if (!policy) {
      return { error: "Policy not found", status: 404 };
    }

    // Ownership check: Customer can only view their own policy
    if (
      requestUser.role === UserRole.CUSTOMER &&
      policy.customerId !== requestUser.id
    ) {
      return {
        error: "Forbidden: You do not have permission to view this policy",
        status: 403,
      };
    }

    return { policy, status: 200 };
  }

  /**
   * System-wide policies for Admin
   */
  public static getAllPolicies(params: PolicyQueryParams = {}) {
    let policies = Array.from(db.getPolicies().values());

    if (params.status && params.status !== "ALL") {
      policies = policies.filter(
        (p) => p.status.toUpperCase() === params.status?.toUpperCase()
      );
    }

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      policies = policies.filter(
        (p) =>
          p.policyNumber.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          (p.customerName && p.customerName.toLowerCase().includes(q))
      );
    }

    return { policies, total: policies.length };
  }

  /**
   * Update policy status (Admin only)
   */
  public static updatePolicyStatus(
    policyId: string,
    newStatus: PolicyStatus,
    adminUser: { id: string; name: string }
  ) {
    const policy = db.getPolicies().get(policyId);
    if (!policy) throw new Error("Policy not found");

    const previousStatus = policy.status;
    policy.status = newStatus;
    db.getPolicies().set(policyId, policy);

    db.logAudit({
      actorId: adminUser.id,
      actorName: adminUser.name,
      role: UserRole.ADMIN,
      action:
        newStatus === PolicyStatus.SUSPENDED
          ? ("POLICY_SUSPENDED" as any)
          : ("POLICY_UPDATED" as any),
      entityType: "POLICY",
      entityId: policyId,
      metadata: { previousStatus, newStatus },
    });

    return policy;
  }
}

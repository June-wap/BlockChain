import { PolicyDetail, PolicyStatus, UserRole } from "@/types";
import { PolicyRepository } from "../repositories/policy.repository";
import { AuditRepository } from "../repositories/audit.repository";
import { AuditAction } from "@/types";

export interface PolicyQueryParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class PolicyService {
  /**
   * Get policies for a customer with ownership check from authoritative PostgreSQL
   */
  public static async getCustomerPolicies(
    customerId: string,
    params: PolicyQueryParams = {}
  ): Promise<{ policies: PolicyDetail[]; total: number }> {
    let policies = await PolicyRepository.findByCustomerId(customerId, {
      status: params.status,
      search: params.search,
    });

    return {
      policies,
      total: policies.length,
    };
  }

  /**
   * Get policy detail by ID with strict ownership check from authoritative PostgreSQL
   */
  public static async getPolicyById(
    policyId: string,
    requestUser: { id: string; role: UserRole }
  ): Promise<{ policy?: PolicyDetail; error?: string; status: number }> {
    const policy = await PolicyRepository.findById(policyId);
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
   * System-wide policies for Admin from authoritative PostgreSQL
   */
  public static async getAllPolicies(
    params: PolicyQueryParams = {}
  ): Promise<{ policies: PolicyDetail[]; total: number }> {
    const policies = await PolicyRepository.findAll({
      status: params.status,
      search: params.search,
    });

    return { policies, total: policies.length };
  }

  /**
   * Update policy status (Admin only) with audit log in PostgreSQL
   */
  public static async updatePolicyStatus(
    policyId: string,
    newStatus: PolicyStatus,
    adminUser: { id: string; name: string }
  ): Promise<PolicyDetail> {
    const policy = await PolicyRepository.findById(policyId);
    if (!policy) throw new Error("Policy not found");

    const previousStatus = policy.status;
    await PolicyRepository.updateStatus(policyId, newStatus, adminUser.name);
    policy.status = newStatus;

    await AuditRepository.create({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
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
    }).catch(() => {});

    return policy;
  }
}

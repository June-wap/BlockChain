import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuthService } from "@/server/services/auth.service";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError, ValidationError, NotFoundError } from "@/server/core/errors";
import { AuditAction, PolicyDetail, PolicyStatus, UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const roleCookie = request.cookies.get("auth_role")?.value;
    const adminUser = AuthService.resolveUser(token, roleCookie);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const status = searchParams.get("status") || "ALL";

    let policies = Array.from(db.getPolicies().values());

    if (status && status !== "ALL") {
      policies = policies.filter((p) => p.status === status);
    }

    if (search) {
      policies = policies.filter(
        (p) =>
          p.policyNumber.toLowerCase().includes(search) ||
          p.type.toLowerCase().includes(search) ||
          Boolean(p.customerName && p.customerName.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      data: policies,
      meta: { total: policies.length },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const roleCookie = request.cookies.get("auth_role")?.value;
    const adminUser = AuthService.resolveUser(token, roleCookie);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    const body = await request.json();
    const { action, policyId, newStatus, customerId, type, coverageAmount, premiumAmount, deductible, startDate, endDate, coverages } = body;

    // Action 1: Status Change (Activate, Suspend, Cancel)
    if (action === "UPDATE_STATUS") {
      if (!policyId || !newStatus || !Object.values(PolicyStatus).includes(newStatus)) {
        throw new ValidationError("Valid policyId and newStatus are required.");
      }

      const policy = db.getPolicies().get(policyId);
      if (!policy) {
        throw new NotFoundError("Policy", policyId);
      }

      const previousStatus = policy.status;
      policy.status = newStatus;
      db.getPolicies().set(policy.id, policy);

      db.logAudit({
        actorId: adminUser.id,
        actorName: adminUser.fullName,
        role: UserRole.ADMIN,
        action: AuditAction.POLICY_UPDATED,
        entityType: "POLICY",
        entityId: policy.id,
        metadata: { previousStatus, newStatus },
      });

      return NextResponse.json({
        success: true,
        data: policy,
        message: `Policy status updated to ${newStatus}.`,
      });
    }

    // Action 2: Create New Policy
    if (!customerId || !type || !coverageAmount || !premiumAmount || !startDate || !endDate) {
      throw new ValidationError("customerId, type, coverageAmount, premiumAmount, startDate, and endDate are required.");
    }

    const customer = db.getUsers().get(customerId);
    if (!customer) {
      throw new NotFoundError("Customer", customerId);
    }

    const newId = `pol-${Date.now()}`;
    const policyNumber = `POL-${type.slice(0, 4).toUpperCase()}-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newPolicy: PolicyDetail = {
      id: newId,
      policyNumber,
      customerId,
      customerName: customer.fullName,
      policyHolder: customer.fullName,
      type,
      coverageAmount: Number(coverageAmount),
      premiumAmount: Number(premiumAmount),
      deductible: Number(deductible || 0),
      startDate,
      endDate,
      status: PolicyStatus.ACTIVE,
      coverages: coverages || [],
      termsAndConditions:
        body.termsAndConditions ||
        `Standard policy terms, exclusions, and settlement criteria for ${type}.`,
    };

    db.getPolicies().set(newId, newPolicy);

    db.logAudit({
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      role: UserRole.ADMIN,
      action: AuditAction.POLICY_CREATED,
      entityType: "POLICY",
      entityId: newId,
      metadata: { policyNumber, customerId, coverageAmount },
    });

    return NextResponse.json(
      {
        success: true,
        data: newPolicy,
        message: "Policy created successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

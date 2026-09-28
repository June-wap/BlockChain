import { NextRequest, NextResponse } from "next/server";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { UserRepository } from "@/server/repositories/user.repository";
import { AuditRepository } from "@/server/repositories/audit.repository";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError, ValidationError, NotFoundError } from "@/server/core/errors";
import { AuditAction, PolicyDetail, PolicyStatus, UserRole } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAuthenticatedUser(request);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || undefined;
    const status = searchParams.get("status") || "ALL";

    const policies = await PolicyRepository.findAll({
      status: status !== "ALL" ? status : undefined,
      search,
    });

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
    const adminUser = await getAuthenticatedUser(request);

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

      const policy = await PolicyRepository.findById(policyId);
      if (!policy) {
        throw new NotFoundError("Policy", policyId);
      }

      const previousStatus = policy.status;
      await PolicyRepository.updateStatus(policyId, newStatus, adminUser.fullName);
      policy.status = newStatus;

      await AuditRepository.create({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        actorId: adminUser.id,
        actorName: adminUser.fullName,
        role: UserRole.ADMIN,
        action: AuditAction.POLICY_UPDATED,
        entityType: "POLICY",
        entityId: policy.id,
        metadata: { previousStatus, newStatus },
      }).catch(() => {});

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

    const customer = await UserRepository.findById(customerId);
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

    await PolicyRepository.create(newPolicy);

    await AuditRepository.create({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      role: UserRole.ADMIN,
      action: AuditAction.POLICY_CREATED,
      entityType: "POLICY",
      entityId: newId,
      metadata: { policyNumber, customerId, coverageAmount },
    }).catch(() => {});

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

import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/server/repositories/user.repository";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { UserRole, UserStatus } from "@/types";
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

    const [allCustomers, policies, claims] = await Promise.all([
      UserRepository.findAll({
        role: UserRole.CUSTOMER,
        status: status !== "ALL" ? (status as UserStatus) : undefined,
        search,
      }),
      PolicyRepository.findAll(),
      ClaimRepository.findAll(),
    ]);

    const result = allCustomers.map((u) => {
      const userPolicies = policies.filter((p) => p.customerId === u.id);
      const userClaims = claims.filter((c) => c.customerId === u.id);
      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        phoneNumber: u.phoneNumber,
        walletAddress: u.walletAddress,
        status: u.status,
        createdAt: u.createdAt,
        policyCount: userPolicies.length,
        claimCount: userClaims.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: { total: result.length },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

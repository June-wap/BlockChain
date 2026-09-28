import { NextRequest, NextResponse } from "next/server";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { UserRole } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    // Role check: Only CLAIM_REVIEWER, FINANCE, or ADMIN
    RbacGuard.assertRole(user, [UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const insuranceType = searchParams.get("insuranceType") || "ALL";
    const reviewerId = searchParams.get("reviewerId") || undefined;
    const search = searchParams.get("search")?.toLowerCase().trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    let claims = await ClaimRepository.findAll({
      status: status !== "ALL" ? status : undefined,
      reviewerId,
      search,
    });

    // Policy insurance type filter
    if (insuranceType && insuranceType !== "ALL") {
      const policies = await PolicyRepository.findAll();
      const policyMap = new Map(policies.map((p) => [p.id, p]));
      claims = claims.filter((c) => {
        const policy = policyMap.get(c.policyId);
        return policy && policy.type.toLowerCase().includes(insuranceType.toLowerCase());
      });
    }

    const total = claims.length;
    const startIndex = (page - 1) * limit;
    const paginatedClaims = claims.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedClaims,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

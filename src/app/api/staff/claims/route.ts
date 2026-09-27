import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuthService } from "@/server/services/auth.service";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const roleCookie = request.cookies.get("auth_role")?.value;
    const user = AuthService.resolveUser(token, roleCookie);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    // Role check: Only CLAIM_REVIEWER, FINANCE, or ADMIN
    RbacGuard.assertRole(user, [UserRole.CLAIM_REVIEWER, UserRole.FINANCE, UserRole.ADMIN]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const insuranceType = searchParams.get("insuranceType") || "ALL";
    const reviewerId = searchParams.get("reviewerId");
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    let claims = Array.from(db.getClaims().values());

    // Status filter
    if (status && status !== "ALL") {
      claims = claims.filter((c) => c.status === status);
    }

    // Reviewer assignment filter
    if (reviewerId) {
      claims = claims.filter((c) => c.reviewerId === reviewerId);
    }

    // Policy insurance type filter
    if (insuranceType && insuranceType !== "ALL") {
      claims = claims.filter((c) => {
        const policy = db.getPolicies().get(c.policyId);
        return policy && policy.type.toLowerCase().includes(insuranceType.toLowerCase());
      });
    }

    // Search filter
    if (search) {
      claims = claims.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(search) ||
          c.id.toLowerCase().includes(search) ||
          c.policyId.toLowerCase().includes(search) ||
          (c.customerName && c.customerName.toLowerCase().includes(search))
      );
    }

    // Sort by createdAt descending
    claims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

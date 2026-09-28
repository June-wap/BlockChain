import { NextRequest, NextResponse } from "next/server";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const [paginatedClaims, total] = await Promise.all([
      ClaimRepository.findAll({
        status: status !== "ALL" ? status : undefined,
        search,
        limit,
        offset,
      }),
      ClaimRepository.count(),
    ]);

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

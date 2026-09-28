import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
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
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    let claims = Array.from(db.getClaims().values());

    if (status && status !== "ALL") {
      claims = claims.filter((c) => c.status === status);
    }

    if (search) {
      claims = claims.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(search) ||
          c.id.toLowerCase().includes(search) ||
          c.policyId.toLowerCase().includes(search) ||
          (c.customerName && c.customerName.toLowerCase().includes(search))
      );
    }

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

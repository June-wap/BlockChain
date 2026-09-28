import { NextRequest, NextResponse } from "next/server";
import { AuditRepository } from "@/server/repositories/audit.repository";
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
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const search = searchParams.get("search")?.toLowerCase().trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditRepository.findAll({
        action: action !== "ALL" ? action : undefined,
        entityType: entity !== "ALL" ? entity : undefined,
        search,
        limit,
        offset,
      }),
      AuditRepository.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
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

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
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const search = searchParams.get("search")?.toLowerCase().trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));

    let logs = db.getAuditLogs();

    if (action && action !== "ALL") {
      logs = logs.filter((l) => l.action === action);
    }

    if (entity && entity !== "ALL") {
      logs = logs.filter((l) => l.entityType === entity);
    }

    if (search) {
      logs = logs.filter(
        (l) =>
          l.actorName.toLowerCase().includes(search) ||
          l.entityId.toLowerCase().includes(search) ||
          l.action.toLowerCase().includes(search)
      );
    }

    const total = logs.length;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = logs.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedLogs,
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

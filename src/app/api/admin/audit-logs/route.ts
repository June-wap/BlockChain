import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = request.cookies.get("auth_role")?.value;
    if (role && role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const search = searchParams.get("search")?.toLowerCase().trim();

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

    return NextResponse.json({
      success: true,
      data: logs,
      meta: { total: logs.length },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to load audit logs" }, { status: 500 });
  }
}

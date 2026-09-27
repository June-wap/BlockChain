import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuditAction, UserRole, UserStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = request.cookies.get("auth_role")?.value;
    if (role && role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const body = await request.json();
    const { status, reason } = body;

    if (!status || !Object.values(UserStatus).includes(status)) {
      return NextResponse.json({ success: false, error: "Valid status is required" }, { status: 400 });
    }

    const user = db.getUsers().get(params.id);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    user.status = status;
    db.getUsers().set(user.id, user);

    db.logAudit({
      actorId: "usr_admin_1",
      actorName: "Admin Hoang Vu",
      role: UserRole.ADMIN,
      action: status === UserStatus.SUSPENDED ? AuditAction.USER_SUSPENDED : AuditAction.USER_ACTIVATED,
      entityType: "USER",
      entityId: user.id,
      metadata: { newStatus: status, reason: reason || "Administrative action" },
    });

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({
      success: true,
      data: safeUser,
      message: `User account status updated to ${status}.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update user status" }, { status: 500 });
  }
}

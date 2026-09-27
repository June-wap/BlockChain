import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuthService } from "@/server/services/auth.service";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError, NotFoundError, ValidationError } from "@/server/core/errors";
import { AuditAction, UserRole, UserStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const roleCookie = request.cookies.get("auth_role")?.value;
    const adminUser = AuthService.resolveUser(token, roleCookie);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    const body = await request.json();
    const { status, reason } = body;

    if (!status || !Object.values(UserStatus).includes(status)) {
      throw new ValidationError(`Valid status is required (${Object.values(UserStatus).join(", ")}).`);
    }

    const user = db.getUsers().get(params.id);
    if (!user) {
      throw new NotFoundError("User", params.id);
    }

    const previousStatus = user.status;
    user.status = status;
    db.getUsers().set(user.id, user);

    // Audit log account status change
    db.logAudit({
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      role: UserRole.ADMIN,
      action: status === UserStatus.SUSPENDED ? AuditAction.USER_SUSPENDED : AuditAction.USER_ACTIVATED,
      entityType: "USER",
      entityId: user.id,
      metadata: { previousStatus, newStatus: status, reason: reason || "Administrative action" },
    });

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({
      success: true,
      data: safeUser,
      message: `User account status updated to ${status}.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

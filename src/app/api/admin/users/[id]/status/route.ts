import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/server/repositories/user.repository";
import { AuditRepository } from "@/server/repositories/audit.repository";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError, NotFoundError, ValidationError } from "@/server/core/errors";
import { AuditAction, UserRole, UserStatus } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getAuthenticatedUser(request);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    const body = await request.json();
    const { status, reason } = body;

    if (!status || !Object.values(UserStatus).includes(status)) {
      throw new ValidationError(`Valid status is required (${Object.values(UserStatus).join(", ")}).`);
    }

    const user = await UserRepository.findById(params.id);
    if (!user) {
      throw new NotFoundError("User", params.id);
    }

    const previousStatus = user.status;
    await UserRepository.updateStatus(user.id, status as UserStatus);
    user.status = status as UserStatus;

    // Audit log account status change
    await AuditRepository.create({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      role: UserRole.ADMIN,
      action: status === UserStatus.SUSPENDED ? AuditAction.USER_SUSPENDED : AuditAction.USER_ACTIVATED,
      entityType: "USER",
      entityId: user.id,
      metadata: { previousStatus, newStatus: status, reason: reason || "Administrative action" },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: user,
      message: `User account status updated to ${status}.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

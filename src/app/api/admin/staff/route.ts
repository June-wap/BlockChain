import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/server/repositories/user.repository";
import { AuditRepository } from "@/server/repositories/audit.repository";
import { RbacGuard } from "@/server/core/rbac";
import { SecurityUtils } from "@/server/core/security";
import { handleApiError, AuthenticationError, NotFoundError, ValidationError, ConflictError } from "@/server/core/errors";
import { AuditAction, UserRole, UserStatus } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAuthenticatedUser(request);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    const allUsers = await UserRepository.findAll();
    const staffUsers = allUsers.filter((u) => u.role !== UserRole.CUSTOMER);

    const safeStaff = staffUsers.map((u) => {
      const { passwordHash: _, ...safe } = u;
      return {
        ...safe,
        lastActivity: new Date(Date.now() - Math.floor(Math.random() * 3600000 * 24)).toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: safeStaff });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAuthenticatedUser(request);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    const body = await request.json();
    const { action, staffId, newRole, fullName, email, phone, role } = body;

    // 1. Role Change Action
    if (action === "CHANGE_ROLE") {
      if (!staffId || !newRole || !Object.values(UserRole).includes(newRole)) {
        throw new ValidationError("Valid staffId and newRole are required.");
      }

      const staff = await UserRepository.findById(staffId);
      if (!staff) {
        throw new NotFoundError("Staff member", staffId);
      }

      const oldRole = staff.role;
      await UserRepository.updateRole(staffId, newRole);
      staff.role = newRole;

      await AuditRepository.create({
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        actorId: adminUser.id,
        actorName: adminUser.fullName,
        role: UserRole.ADMIN,
        action: AuditAction.ROLE_CHANGED,
        entityType: "USER",
        entityId: staff.id,
        metadata: { oldRole, newRole, staffEmail: staff.email },
      }).catch(() => {});

      const { passwordHash: _, ...safeStaff } = staff;
      return NextResponse.json({
        success: true,
        data: safeStaff,
        message: `Role for ${staff.fullName} updated to ${newRole}.`,
      });
    }

    // 2. Create New Staff Member
    if (!fullName || !email || !role) {
      throw new ValidationError("fullName, email, and role are required.");
    }

    if (role === UserRole.CUSTOMER) {
      throw new ValidationError("Staff members must have role CLAIM_REVIEWER, FINANCE, or ADMIN.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await UserRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError("An account with this email address already exists.");
    }

    const newStaffId = `usr_${role.toLowerCase().replace(/[^a-z]/g, "")}_${Date.now()}`;
    const defaultPassword = "password123";
    const passwordHash = SecurityUtils.hashPassword(defaultPassword);

    const newStaff = {
      id: newStaffId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      phoneNumber: phone?.trim(),
      role: role as UserRole,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      passwordHash,
    };

    await UserRepository.create(newStaff);

    await AuditRepository.create({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      role: UserRole.ADMIN,
      action: AuditAction.USER_ACTIVATED,
      entityType: "USER",
      entityId: newStaffId,
      metadata: { role, email: normalizedEmail },
    }).catch(() => {});

    const { passwordHash: _, ...safeNewStaff } = newStaff;
    return NextResponse.json(
      {
        success: true,
        data: safeNewStaff,
        message: `Staff member ${newStaff.fullName} created successfully.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

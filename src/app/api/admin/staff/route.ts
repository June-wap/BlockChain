import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuditAction, UserRole, UserStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = request.cookies.get("auth_role")?.value;
    if (role && role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const staffUsers = Array.from(db.getUsers().values()).filter(
      (u) => u.role !== UserRole.CUSTOMER
    );

    const safeStaff = staffUsers.map((u) => {
      const { passwordHash: _, ...safe } = u;
      return {
        ...safe,
        lastActivity: new Date(Date.now() - Math.floor(Math.random() * 3600000 * 24)).toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: safeStaff });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to load staff" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const callerRole = request.cookies.get("auth_role")?.value;
    if (callerRole && callerRole !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const body = await request.json();
    const { action, staffId, newRole, fullName, email, phone, role } = body;

    // 1. Role Change Action
    if (action === "CHANGE_ROLE") {
      if (!staffId || !newRole || !Object.values(UserRole).includes(newRole)) {
        return NextResponse.json({ success: false, error: "Valid staffId and newRole are required." }, { status: 400 });
      }

      const staff = db.getUsers().get(staffId);
      if (!staff) {
        return NextResponse.json({ success: false, error: "Staff member not found." }, { status: 404 });
      }

      const oldRole = staff.role;
      staff.role = newRole;
      db.getUsers().set(staff.id, staff);

      db.logAudit({
        actorId: "usr_admin_1",
        actorName: "Admin Hoang Vu",
        role: UserRole.ADMIN,
        action: AuditAction.ROLE_CHANGED,
        entityType: "USER",
        entityId: staff.id,
        metadata: { oldRole, newRole },
      });

      const { passwordHash: _, ...safe } = staff;
      return NextResponse.json({
        success: true,
        data: safe,
        message: `Role updated to ${newRole}.`,
      });
    }

    // 2. Create Staff Action
    if (!fullName || !email || !role) {
      return NextResponse.json({ success: false, error: "Full name, email, and staff role are required." }, { status: 400 });
    }

    const existing = Array.from(db.getUsers().values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );
    if (existing) {
      return NextResponse.json({ success: false, error: "User with this email already exists." }, { status: 409 });
    }

    const newId = `usr_staff_${Date.now()}`;
    const newStaff = {
      id: newId,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      phone: phone?.trim(),
      role: role as UserRole,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      passwordHash: "pbkdf2$10000$mockhashedpassword$secure",
    };

    db.getUsers().set(newId, newStaff);

    db.logAudit({
      actorId: "usr_admin_1",
      actorName: "Admin Hoang Vu",
      role: UserRole.ADMIN,
      action: AuditAction.ROLE_CHANGED,
      entityType: "USER",
      entityId: newId,
      metadata: { action: "STAFF_CREATED", assignedRole: role },
    });

    const { passwordHash: _, ...safe } = newStaff;
    return NextResponse.json({
      success: true,
      data: safe,
      message: "New staff member onboarded successfully.",
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to process staff action" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuditAction, UserRole, UserStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password, walletAddress } = body;

    // Validation
    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Full legal name is required (minimum 2 characters)." },
        { status: 400 }
      );
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Check duplicate email
    const existing = Array.from(db.getUsers().values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const userId = `usr_${Date.now()}`;
    const newUser = {
      id: userId,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      phone: phone?.trim(),
      walletAddress: walletAddress?.trim(),
      role: UserRole.CUSTOMER, // STRICT: Registration ONLY ever creates CUSTOMER accounts
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      passwordHash: `pbkdf2$10000$${Buffer.from(password).toString("base64")}`,
    };

    db.getUsers().set(userId, newUser);

    // Audit Log
    db.logAudit({
      actorId: userId,
      actorName: newUser.fullName,
      role: UserRole.CUSTOMER,
      action: AuditAction.LOGIN,
      entityType: "USER",
      entityId: userId,
      metadata: { action: "REGISTER" },
    });

    const token = `jwt_${userId}_${Date.now()}`;
    const { passwordHash: _, ...safeUser } = newUser;

    const response = NextResponse.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });

    response.cookies.set("auth_role", UserRole.CUSTOMER, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });
    response.cookies.set("auth_token", token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}

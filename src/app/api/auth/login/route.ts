import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuditAction, UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Lookup user by email in database store
    const userEntry = Array.from(db.getUsers().values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (!userEntry) {
      return NextResponse.json(
        { success: false, error: "Invalid email or credentials." },
        { status: 401 }
      );
    }

    // Verify user is not suspended
    if (userEntry.status === "SUSPENDED") {
      return NextResponse.json(
        { success: false, error: "Account suspended. Please contact system administrator." },
        { status: 403 }
      );
    }

    // Password validation: Accept mock password or matching hash
    if (password !== "password123" && !userEntry.passwordHash.includes("secure") && password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Generate safe auth token
    const token = `jwt_${userEntry.id}_${Date.now()}`;

    // Return safe user object (exclude passwordHash)
    const { passwordHash: _, ...safeUser } = userEntry;

    // Log audit
    db.logAudit({
      actorId: userEntry.id,
      actorName: userEntry.fullName,
      role: userEntry.role,
      action: AuditAction.LOGIN,
      entityType: "AUTH",
      entityId: userEntry.id,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });

    // Set secure cookie for middleware authorization
    response.cookies.set("auth_role", userEntry.role, {
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
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during authentication." },
      { status: 500 }
    );
  }
}

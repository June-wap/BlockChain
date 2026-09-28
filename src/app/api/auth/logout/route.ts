import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { db } from "@/server/db/store";
import { AuditAction } from "@/types";
import { extractAuthToken } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = extractAuthToken(request);
  const user = await AuthService.resolveUser(token);

  if (user) {
    db.logAudit({
      actorId: user.id,
      actorName: user.fullName,
      role: user.role,
      action: AuditAction.LOGOUT,
      entityType: "AUTH",
      entityId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.set("auth_role", "", { path: "/", maxAge: 0 });
  response.cookies.set("auth_token", "", { path: "/", maxAge: 0, httpOnly: true });

  return response;
}

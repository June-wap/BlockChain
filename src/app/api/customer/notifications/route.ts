import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuthService } from "@/server/services/auth.service";
import { handleApiError, AuthenticationError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const roleCookie = request.cookies.get("auth_role")?.value;
    const user = AuthService.resolveUser(token, roleCookie);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const notifs = Array.from(db.getNotifications().values())
      .filter((n) => n.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

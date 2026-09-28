import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

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

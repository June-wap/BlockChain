import { NextRequest, NextResponse } from "next/server";
import { NotificationRepository } from "@/server/repositories/notification.repository";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const notifs = await NotificationRepository.findByUserId(user.id);

    return NextResponse.json({
      success: true,
      data: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

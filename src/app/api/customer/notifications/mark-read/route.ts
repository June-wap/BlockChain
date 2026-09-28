import { NextRequest, NextResponse } from "next/server";
import { NotificationRepository } from "@/server/repositories/notification.repository";
import { handleApiError, AuthenticationError, ValidationError } from "@/server/core/errors";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await NotificationRepository.markAllAsRead(user.id);
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (notificationId) {
      await NotificationRepository.markAsRead(notificationId, user.id);
      return NextResponse.json({ success: true, message: "Notification marked as read." });
    }

    throw new ValidationError("Must specify either notificationId or markAll.");
  } catch (error) {
    return handleApiError(error);
  }
}

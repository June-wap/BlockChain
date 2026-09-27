import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuthService } from "@/server/services/auth.service";
import { handleApiError, AuthenticationError, ValidationError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const roleCookie = request.cookies.get("auth_role")?.value;
    const user = AuthService.resolveUser(token, roleCookie);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      for (const notif of db.getNotifications().values()) {
        if (notif.userId === user.id) {
          notif.read = true;
        }
      }
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (notificationId) {
      const notif = db.getNotifications().get(notificationId);
      if (notif && notif.userId === user.id) {
        notif.read = true;
        db.getNotifications().set(notif.id, notif);
      }
      return NextResponse.json({ success: true, message: "Notification marked as read." });
    }

    throw new ValidationError("Must specify either notificationId or markAll.");
  } catch (error) {
    return handleApiError(error);
  }
}

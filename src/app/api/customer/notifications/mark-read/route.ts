import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, markAll, customerId } = body;

    const targetUserId = customerId || "usr_customer_default";

    if (markAll) {
      for (const notif of db.getNotifications().values()) {
        if (notif.userId === targetUserId) {
          notif.read = true;
        }
      }
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (notificationId) {
      const notif = db.getNotifications().get(notificationId);
      if (notif && notif.userId === targetUserId) {
        notif.read = true;
        db.getNotifications().set(notif.id, notif);
      }
      return NextResponse.json({ success: true, message: "Notification marked as read." });
    }

    return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update notification" }, { status: 500 });
  }
}

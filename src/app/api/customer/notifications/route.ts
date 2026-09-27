import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = (request.cookies.get("auth_role")?.value as UserRole) || UserRole.CUSTOMER;
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || "usr_customer_default";

    const notifs = Array.from(db.getNotifications().values())
      .filter((n) => n.userId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}

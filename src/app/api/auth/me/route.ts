import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Token format: jwt_<userId>_<timestamp>
  const parts = token.split("_");
  const userId = parts[1];

  const user = userId ? db.getUsers().get(userId) : null;
  if (!user) {
    // If not found by ID, return default based on role cookie
    const role = request.cookies.get("auth_role")?.value;
    const defaultUser = Array.from(db.getUsers().values()).find((u) => u.role === role);
    if (defaultUser) {
      const { passwordHash: _, ...safe } = defaultUser;
      return NextResponse.json({ success: true, data: { user: safe } });
    }
    return NextResponse.json({ success: false, error: "Session expired" }, { status: 401 });
  }

  const { passwordHash: _, ...safeUser } = user;
  return NextResponse.json({ success: true, data: { user: safeUser } });
}

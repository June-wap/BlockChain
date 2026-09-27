import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/services/auth.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const roleCookie = request.cookies.get("auth_role")?.value;

  const user = AuthService.resolveUser(token, roleCookie);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const capabilities = AuthService.getCapabilities(user.role);

  return NextResponse.json({
    success: true,
    data: {
      user,
      capabilities,
    },
  });
}

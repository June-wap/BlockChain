import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    const response = NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    response.cookies.set("auth_token", "", { path: "/", maxAge: 0, httpOnly: true });
    response.cookies.set("auth_role", "", { path: "/", maxAge: 0 });
    return response;
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

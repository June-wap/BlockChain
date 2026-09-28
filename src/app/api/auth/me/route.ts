import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
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

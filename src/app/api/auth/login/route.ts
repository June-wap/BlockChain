import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { handleApiError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const ipAddress = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const result = await AuthService.login(email, password, ipAddress);

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    response.cookies.set("auth_role", result.user.role, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });
    response.cookies.set("auth_token", result.token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

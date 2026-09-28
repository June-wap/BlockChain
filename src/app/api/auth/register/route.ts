import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/services/auth.service";
import { handleApiError } from "@/server/core/errors";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password, walletAddress } = body;

    const result = await AuthService.register({
      fullName,
      email,
      phone,
      password,
      walletAddress,
    });

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    response.cookies.set("auth_role", UserRole.CUSTOMER, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });
    response.cookies.set("auth_token", result.token, {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

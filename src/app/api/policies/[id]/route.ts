import { NextRequest, NextResponse } from "next/server";
import { PolicyService } from "@/server/services/policy.service";
import { AuthService } from "@/server/services/auth.service";
import { handleApiError, AuthenticationError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const roleCookie = request.cookies.get("auth_role")?.value;
    const user = AuthService.resolveUser(token, roleCookie);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const result = PolicyService.getPolicyById(params.id, {
      id: user.id,
      role: user.role,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true, data: result.policy });
  } catch (error) {
    return handleApiError(error);
  }
}

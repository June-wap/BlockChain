import { NextRequest, NextResponse } from "next/server";
import { PolicyService } from "@/server/services/policy.service";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const result = await PolicyService.getPolicyById(params.id, {
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

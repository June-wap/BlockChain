import { NextRequest, NextResponse } from "next/server";
import { ClaimService } from "@/server/services/claim.service";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { UserRole } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    // Role check: Only CLAIM_REVIEWER or ADMIN
    RbacGuard.assertRole(user, [UserRole.CLAIM_REVIEWER, UserRole.ADMIN]);

    const body = await request.json();
    const { reason, notes, version } = body;

    const claim = await ClaimService.rejectClaim(
      params.id,
      {
        id: user.id,
        name: user.fullName,
        role: user.role,
      },
      reason,
      notes,
      version
    );

    return NextResponse.json({
      success: true,
      data: claim,
      message: "Claim rejected successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

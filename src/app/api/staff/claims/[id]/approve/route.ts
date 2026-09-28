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

    RbacGuard.assertRole(user, [UserRole.CLAIM_REVIEWER, UserRole.ADMIN]);

    const body = await request.json();
    const { approvedAmount, notes, idempotencyKey, version } = body;

    const result = await ClaimService.approveClaim(
      params.id,
      {
        id: user.id,
        name: user.fullName,
        role: user.role,
      },
      Number(approvedAmount),
      notes,
      idempotencyKey,
      version
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Claim approved successfully and recorded on-chain.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

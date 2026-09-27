import { NextRequest, NextResponse } from "next/server";
import { ClaimService } from "@/server/services/claim.service";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = (request.cookies.get("auth_role")?.value as UserRole) || UserRole.CLAIM_REVIEWER;
    const body = await request.json();
    const { reason, notes, reviewerId, reviewerName } = body;

    const reviewer = {
      id: reviewerId || "usr_reviewer_1",
      name: reviewerName || "Le Minh Reviewer",
      role,
    };

    const claim = await ClaimService.rejectClaim(params.id, reviewer, reason, notes);

    return NextResponse.json({
      success: true,
      data: claim,
      message: "Claim rejected successfully.",
    });
  } catch (error: any) {
    console.error(`POST /api/staff/claims/${params.id}/reject error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reject claim" },
      { status: 400 }
    );
  }
}

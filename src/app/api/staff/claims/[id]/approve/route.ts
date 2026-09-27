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
    const { approvedAmount, notes, idempotencyKey, reviewerId, reviewerName } = body;

    const reviewer = {
      id: reviewerId || "usr_reviewer_1",
      name: reviewerName || "Le Minh Reviewer",
      role,
    };

    const result = await ClaimService.approveClaim(
      params.id,
      reviewer,
      Number(approvedAmount),
      notes,
      idempotencyKey
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Claim approved successfully and recorded on-chain.",
    });
  } catch (error: any) {
    console.error(`POST /api/staff/claims/${params.id}/approve error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to approve claim" },
      { status: 400 }
    );
  }
}

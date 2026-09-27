import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuditAction, ClaimStatus, UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const claim = db.getClaims().get(params.id);
    if (!claim) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }

    if (claim.status === ClaimStatus.SUBMITTED) {
      claim.status = ClaimStatus.UNDER_REVIEW;
      claim.updatedAt = new Date().toISOString();
      db.getClaims().set(claim.id, claim);

      db.logAudit({
        actorId: "usr_reviewer_1",
        actorName: "Le Minh Reviewer",
        role: UserRole.CLAIM_REVIEWER,
        action: AuditAction.CLAIM_REVIEW_STARTED,
        entityType: "CLAIM",
        entityId: claim.id,
      });
    }

    return NextResponse.json({ success: true, data: claim });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update claim" }, { status: 500 });
  }
}

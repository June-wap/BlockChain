import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError, NotFoundError } from "@/server/core/errors";
import { AuditAction, ClaimStatus, UserRole } from "@/types";
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

    const claim = db.getClaims().get(params.id);
    if (!claim) {
      throw new NotFoundError("Claim", params.id);
    }

    if (claim.status === ClaimStatus.SUBMITTED) {
      claim.status = ClaimStatus.UNDER_REVIEW;
      claim.reviewerId = user.id;
      claim.version = (claim.version || 1) + 1;
      claim.updatedAt = new Date().toISOString();
      db.getClaims().set(claim.id, claim);

      db.logAudit({
        actorId: user.id,
        actorName: user.fullName,
        role: user.role,
        action: AuditAction.CLAIM_REVIEW_STARTED,
        entityType: "CLAIM",
        entityId: claim.id,
      });
    }

    return NextResponse.json({ success: true, data: claim });
  } catch (error) {
    return handleApiError(error);
  }
}

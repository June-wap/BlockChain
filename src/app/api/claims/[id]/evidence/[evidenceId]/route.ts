import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError, NotFoundError } from "@/server/core/errors";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; evidenceId: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const claim = db.getClaims().get(params.id);
    if (!claim) {
      throw new NotFoundError("Claim", params.id);
    }

    // Permission check: Customer can ONLY access evidence for their own claim
    RbacGuard.assertOwnership(claim.customerId, user, { allowStaff: true, allowAdmin: true });

    // Look up evidence in document store
    const doc =
      db.getState().claimDocuments.get(params.evidenceId) ||
      claim.evidence?.find((e) => e.id === params.evidenceId);

    if (!doc) {
      throw new NotFoundError("Evidence Document", params.evidenceId);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        fileHash: doc.fileHash,
        uploadedAt: doc.uploadedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

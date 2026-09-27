import { NextRequest, NextResponse } from "next/server";
import { ClaimService } from "@/server/services/claim.service";
import { AuthService } from "@/server/services/auth.service";
import { db } from "@/server/db/store";
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

    const result = ClaimService.getClaimById(params.id, {
      id: user.id,
      role: user.role,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    const claim = result.claim!;
    const policy = db.getPolicies().get(claim.policyId);
    const review = Array.from(db.getState().claimReviews.values()).find((r) => r.claimId === claim.id);
    const payment = Array.from(db.getPayments().values()).find((p) => p.claimId === claim.id);

    // Find real blockchain transaction (do not fabricate fake ones)
    const blockchainTx = Array.from(db.getBlockchainTransactions().values()).find(
      (tx) => tx.claimId === claim.id
    );

    return NextResponse.json({
      success: true,
      data: {
        claim,
        policy,
        review,
        payment,
        blockchainTx,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

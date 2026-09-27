import { NextRequest, NextResponse } from "next/server";
import { ClaimService } from "@/server/services/claim.service";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = (request.cookies.get("auth_role")?.value as UserRole) || UserRole.CUSTOMER;
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || "usr_customer_default";

    const result = ClaimService.getClaimById(params.id, {
      id: customerId,
      role,
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
    
    // Find real blockchain transactions (do not fabricate fake ones)
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
    console.error(`GET /api/claims/${params.id} error:`, error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

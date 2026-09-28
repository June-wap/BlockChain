import { NextRequest, NextResponse } from "next/server";
import { ClaimService } from "@/server/services/claim.service";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { ReviewRepository } from "@/server/repositories/review.repository";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { BlockchainTransactionRepository } from "@/server/repositories/blockchain-tx.repository";
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

    const result = await ClaimService.getClaimById(params.id, {
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
    const [policy, review, payment, blockchainTx] = await Promise.all([
      PolicyRepository.findById(claim.policyId),
      ReviewRepository.findByClaimId(claim.id),
      PaymentRepository.findByClaimId(claim.id),
      BlockchainTransactionRepository.findByClaimId(claim.id),
    ]);

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

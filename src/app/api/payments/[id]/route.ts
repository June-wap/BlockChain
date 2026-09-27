import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuthService } from "@/server/services/auth.service";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError, NotFoundError } from "@/server/core/errors";

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

    const payment = db.getPayments().get(params.id);
    if (!payment) {
      throw new NotFoundError("Payment", params.id);
    }

    // IDOR Check: Customer can only view their own payment
    RbacGuard.assertOwnership(payment.customerId, user, { allowStaff: true, allowAdmin: true });

    const claim = db.getClaims().get(payment.claimId);
    const policy = db.getPolicies().get(payment.policyId);

    return NextResponse.json({
      success: true,
      data: {
        payment,
        claim: claim
          ? {
              id: claim.id,
              claimNumber: claim.claimNumber,
              status: claim.status,
              requestedAmount: claim.requestedAmount,
              approvedAmount: claim.approvedAmount,
            }
          : null,
        policy: policy
          ? {
              id: policy.id,
              policyNumber: policy.policyNumber,
              type: policy.type,
            }
          : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

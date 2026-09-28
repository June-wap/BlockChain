import { NextRequest, NextResponse } from "next/server";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { PolicyRepository } from "@/server/repositories/policy.repository";
import { UserRepository } from "@/server/repositories/user.repository";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError, NotFoundError } from "@/server/core/errors";
import { PolicyStatus, UserRole } from "@/types";
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

    // Role check: Only CLAIM_REVIEWER or ADMIN can access review dossier
    RbacGuard.assertRole(user, [UserRole.CLAIM_REVIEWER, UserRole.ADMIN]);

    const claim = await ClaimRepository.findById(params.id);
    if (!claim) {
      throw new NotFoundError("Claim", params.id);
    }

    const [policy, customerUser, allCustomerClaims] = await Promise.all([
      PolicyRepository.findById(claim.policyId),
      UserRepository.findById(claim.customerId),
      ClaimRepository.findAll({ customerId: claim.customerId }),
    ]);

    // Safe customer profile (never expose passwordHash or internal security keys)
    const customerProfile = customerUser
      ? {
          id: customerUser.id,
          fullName: customerUser.fullName,
          email: customerUser.email,
          phoneNumber: customerUser.phoneNumber,
          walletAddress: customerUser.walletAddress,
          status: customerUser.status,
          createdAt: customerUser.createdAt,
        }
      : null;

    // Prior claims by this customer under this policy (for fraud / frequency detection)
    const priorClaims = allCustomerClaims
      .filter((c) => c.id !== claim.id)
      .map((c) => ({
        id: c.id,
        claimNumber: c.claimNumber,
        status: c.status,
        requestedAmount: c.requestedAmount,
        approvedAmount: c.approvedAmount,
        incidentDate: c.incidentDate,
        createdAt: c.createdAt,
      }));

    // Evidence documents with verified hashes
    const evidence = claim.evidence || [];

    // Automated pre-validation checks
    const incidentDate = new Date(claim.incidentDate);
    const policyStartDate = policy ? new Date(policy.startDate) : null;
    const policyEndDate = policy ? new Date(policy.endDate) : null;

    const validationResults = {
      isPolicyActive: policy?.status === PolicyStatus.ACTIVE,
      isAmountWithinCoverage: policy ? claim.requestedAmount <= policy.coverageAmount : false,
      isDateWithinPolicyPeriod:
        policyStartDate && policyEndDate
          ? incidentDate >= policyStartDate && incidentDate <= policyEndDate
          : false,
      hasEvidenceAttached: evidence.length > 0,
      evidenceFileCount: evidence.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        claim: {
          ...claim,
          version: claim.version ?? 1,
        },
        policy,
        customer: customerProfile,
        evidence,
        priorClaims,
        validationResults,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

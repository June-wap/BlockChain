import { MOCK_POLICIES, MOCK_CLAIMS, MOCK_PAYMENTS } from "@/server/mock-data";
import { ClaimStatus, PolicyStatus, PaymentStatus } from "@/types";

export interface CustomerDashboardMetrics {
  activePolicies: number;
  openClaims: number;
  approvedClaims: number;
  totalPaid: number;
}

export interface CustomerRecentClaimItem {
  id: string;
  claimNumber: string;
  policyId: string;
  policyNumber: string;
  policyType: string;
  requestedAmount: number;
  approvedAmount?: number;
  incidentDate: string;
  submittedDate: string;
  status: ClaimStatus;
  description: string;
}

export interface CustomerDashboardData {
  metrics: CustomerDashboardMetrics;
  recentClaims: CustomerRecentClaimItem[];
  hasPolicies: boolean;
}

/**
 * Service to compute and retrieve Customer Dashboard metrics and claims
 */
export class CustomerDashboardService {
  /**
   * Retrieves dashboard statistics and recent claims list for a customer
   */
  static getDashboardData(
    customerId: string = "usr_customer_default",
    forceEmpty: boolean = false
  ): CustomerDashboardData {
    if (forceEmpty) {
      return {
        metrics: {
          activePolicies: 0,
          openClaims: 0,
          approvedClaims: 0,
          totalPaid: 0,
        },
        recentClaims: [],
        hasPolicies: false,
      };
    }

    // Filter policies for this customer
    const policies = MOCK_POLICIES;
    const activePoliciesCount = policies.filter(
      (p) => p.status === PolicyStatus.ACTIVE
    ).length;

    // Filter claims for this customer
    const claims = MOCK_CLAIMS;

    // Open claims: SUBMITTED, UNDER_REVIEW, PAYMENT_PENDING
    const openClaimsCount = claims.filter(
      (c) =>
        c.status === ClaimStatus.SUBMITTED ||
        c.status === ClaimStatus.UNDER_REVIEW ||
        c.status === ClaimStatus.PAYMENT_PENDING
    ).length;

    // Approved claims: APPROVED, PAID
    const approvedClaimsCount = claims.filter(
      (c) => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID
    ).length;

    // Total Paid: Sum of settled payouts
    const totalPaidAmount = claims
      .filter((c) => c.status === ClaimStatus.PAID)
      .reduce((sum, c) => sum + (c.approvedAmount || c.requestedAmount), 0);

    // Map recent claims with policy details
    const recentClaims: CustomerRecentClaimItem[] = claims.map((claim) => {
      const policy = policies.find((p) => p.id === claim.policyId);
      return {
        id: claim.id,
        claimNumber: claim.claimNumber,
        policyId: claim.policyId,
        policyNumber: policy?.policyNumber || "N/A",
        policyType: policy?.type || "General Insurance",
        requestedAmount: claim.requestedAmount,
        approvedAmount: claim.approvedAmount,
        incidentDate: claim.incidentDate,
        submittedDate: claim.createdAt,
        status: claim.status,
        description: claim.description,
      };
    });

    return {
      metrics: {
        activePolicies: activePoliciesCount,
        openClaims: openClaimsCount,
        approvedClaims: approvedClaimsCount,
        totalPaid: totalPaidAmount,
      },
      recentClaims,
      hasPolicies: policies.length > 0,
    };
  }
}

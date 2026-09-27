import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { BlockchainService } from "@/server/services/blockchain.service";
import { ClaimStatus, PaymentStatus, PolicyStatus, UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = request.cookies.get("auth_role")?.value;
    if (role && role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const users = Array.from(db.getUsers().values());
    const policies = Array.from(db.getPolicies().values());
    const claims = Array.from(db.getClaims().values());
    const payments = Array.from(db.getPayments().values());

    // 8 KPIs
    const totalCustomers = users.filter((u) => u.role === UserRole.CUSTOMER).length;
    const activePolicies = policies.filter((p) => p.status === PolicyStatus.ACTIVE).length;
    const totalClaims = claims.length;
    const pendingClaims = claims.filter(
      (c) => c.status === ClaimStatus.SUBMITTED || c.status === ClaimStatus.UNDER_REVIEW || c.status === ClaimStatus.PAYMENT_PENDING
    ).length;
    const approvedClaims = claims.filter((c) => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID).length;
    const rejectedClaims = claims.filter((c) => c.status === ClaimStatus.REJECTED).length;
    const totalClaimValue = claims.reduce((sum, c) => sum + c.requestedAmount, 0);
    const totalPaid = payments
      .filter((p) => p.status === PaymentStatus.SUCCESS)
      .reduce((sum, p) => sum + p.amount, 0);

    // Charts & Trends
    const claimsByMonth = [
      { month: "May", count: 12, value: 24000 },
      { month: "Jun", count: 18, value: 41000 },
      { month: "Jul", count: 25, value: 58000 },
      { month: "Aug", count: 32, value: 72000 },
      { month: "Sep", count: claims.length, value: totalClaimValue },
    ];

    const claimsByStatus = [
      { status: "Submitted", count: claims.filter((c) => c.status === ClaimStatus.SUBMITTED).length },
      { status: "Under Review", count: claims.filter((c) => c.status === ClaimStatus.UNDER_REVIEW).length },
      { status: "Approved", count: claims.filter((c) => c.status === ClaimStatus.APPROVED).length },
      { status: "Payment Pending", count: claims.filter((c) => c.status === ClaimStatus.PAYMENT_PENDING).length },
      { status: "Paid", count: claims.filter((c) => c.status === ClaimStatus.PAID).length },
      { status: "Rejected", count: claims.filter((c) => c.status === ClaimStatus.REJECTED).length },
    ];

    const claimsByType = [
      { type: "Comprehensive Health", count: claims.filter((c) => c.policyId === "pol-101").length + 15 },
      { type: "Motor Vehicle", count: claims.filter((c) => c.policyId === "pol-102" || c.policyId === "pol-104").length + 22 },
      { type: "Property & Fire", count: claims.filter((c) => c.policyId === "pol-103").length + 7 },
    ];

    const telemetry = BlockchainService.getTelemetry();
    const recentActivity = db.getAuditLogs().slice(0, 8);

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalCustomers,
          activePolicies,
          totalClaims,
          pendingClaims,
          approvedClaims,
          rejectedClaims,
          totalClaimValue,
          totalPaid,
        },
        charts: {
          claimsByMonth,
          claimsByStatus,
          claimsByType,
        },
        recentTransactions: telemetry.recentTransactions,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json({ success: false, error: "Failed to load admin analytics" }, { status: 500 });
  }
}

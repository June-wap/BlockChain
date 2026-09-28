import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { BlockchainService } from "@/server/services/blockchain.service";
import { AuditAction, ClaimStatus, NotificationType, PaymentStatus, UserRole } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { RbacGuard } from "@/server/core/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Valid authentication session required." },
        { status: 401 }
      );
    }

    try {
      RbacGuard.assertCanManagePayments(user);
    } catch {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only FINANCE or ADMIN roles can disburse payments." },
        { status: 403 }
      );
    }

    const payment = db.getPayments().get(params.id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment record not found." }, { status: 404 });
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return NextResponse.json(
        { success: false, error: "Payment has already been successfully disbursed. Double payout prohibited." },
        { status: 400 }
      );
    }

    // Call blockchain service to execute payment release
    const bcResult = await BlockchainService.recordPaymentDisbursement(
      payment.id,
      payment.claimId,
      payment.amount,
      payment.recipientWallet || "0x71C8366453AB548A31D08f237B855D282126B39a"
    );

    // Update payment
    payment.status = PaymentStatus.SUCCESS;
    payment.blockchainTxHash = bcResult.txHash;
    payment.processedAt = new Date().toISOString();
    db.getPayments().set(payment.id, payment);

    // Update claim status to PAID
    const claim = db.getClaims().get(payment.claimId);
    if (claim) {
      claim.status = ClaimStatus.PAID;
      claim.blockchainTxHash = bcResult.txHash;
      claim.updatedAt = new Date().toISOString();
      db.getClaims().set(claim.id, claim);
    }

    // Audit log with real authenticated actor
    db.logAudit({
      actorId: user.id,
      actorName: user.fullName,
      role: user.role,
      action: AuditAction.PAYMENT_COMPLETED,
      entityType: "PAYMENT",
      entityId: payment.id,
      metadata: { amount: payment.amount, txHash: bcResult.txHash },
    });

    // Notify customer
    const notifId = `notif-${Date.now()}`;
    db.getNotifications().set(notifId, {
      id: notifId,
      userId: payment.customerId,
      title: "Giải ngân bồi thường thành công",
      message: `Khoản tiền bồi thường $${payment.amount.toLocaleString()} đã được chuyển tới ví ${payment.recipientWallet}. Mã giao dịch: ${bcResult.txHash.slice(0, 10)}...`,
      type: NotificationType.PAYMENT_SUCCESS,
      read: false,
      linkUrl: "/customer/payments",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: { payment, claim, txHash: bcResult.txHash },
      message: "Payment disbursed successfully via smart contract.",
    });
  } catch (error: any) {
    console.error("POST /api/payments/:id/disburse error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to disburse payment" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { BlockchainService } from "@/server/services/blockchain.service";
import { AuditAction, PaymentStatus, UserRole } from "@/types";
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
        { success: false, error: "Forbidden: Only FINANCE or ADMIN roles can retry payments." },
        { status: 403 }
      );
    }

    const payment = db.getPayments().get(params.id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    // Check if on-chain state already has confirmed payment
    for (const tx of db.getBlockchainTransactions().values()) {
      if (tx.paymentId === payment.id && tx.status === "CONFIRMED") {
        payment.status = PaymentStatus.SUCCESS;
        payment.blockchainTxHash = tx.txHash;
        db.getPayments().set(payment.id, payment);
        return NextResponse.json({
          success: true,
          data: payment,
          message: "Payment reconciliation: Transaction was already confirmed on-chain.",
        });
      }
    }

    // Execute retry
    const bcResult = await BlockchainService.recordPaymentDisbursement(
      payment.id,
      payment.claimId,
      payment.amount,
      payment.recipientWallet || "0x71C8366453AB548A31D08f237B855D282126B39a"
    );

    payment.status = PaymentStatus.SUCCESS;
    payment.blockchainTxHash = bcResult.txHash;
    payment.processedAt = new Date().toISOString();
    db.getPayments().set(payment.id, payment);

    db.logAudit({
      actorId: user.id,
      actorName: user.fullName,
      role: user.role,
      action: AuditAction.PAYMENT_RETRIED,
      entityType: "PAYMENT",
      entityId: payment.id,
      metadata: { txHash: bcResult.txHash },
    });

    return NextResponse.json({
      success: true,
      data: payment,
      message: "Payment successfully retried.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

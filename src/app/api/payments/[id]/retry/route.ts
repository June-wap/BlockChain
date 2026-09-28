import { NextRequest, NextResponse } from "next/server";
import { BlockchainService } from "@/server/services/blockchain.service";
import { AuditAction, PaymentStatus } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { RbacGuard } from "@/server/core/rbac";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { BlockchainTransactionRepository } from "@/server/repositories/blockchain-tx.repository";
import { AuditRepository } from "@/server/repositories/audit.repository";

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

    const payment = await PaymentRepository.findById(params.id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    // Check if on-chain state already has confirmed payment in PostgreSQL
    const existingTx = await BlockchainTransactionRepository.findByPaymentId(payment.id);
    if (existingTx && existingTx.status === "CONFIRMED") {
      payment.status = PaymentStatus.SUCCESS;
      payment.blockchainTxHash = existingTx.txHash;
      await PaymentRepository.update(payment);
      return NextResponse.json({
        success: true,
        data: payment,
        message: "Payment reconciliation: Transaction was already confirmed on-chain.",
      });
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
    await PaymentRepository.update(payment);

    await AuditRepository.create({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorId: user.id,
      actorName: user.fullName,
      role: user.role,
      action: AuditAction.PAYMENT_RETRIED,
      entityType: "PAYMENT",
      entityId: payment.id,
      metadata: { txHash: bcResult.txHash },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: payment,
      message: "Payment successfully retried.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

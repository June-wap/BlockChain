import { NextRequest, NextResponse } from "next/server";
import { BlockchainService } from "@/server/services/blockchain.service";
import { AuditAction, PaymentStatus } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { RbacGuard } from "@/server/core/rbac";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { BlockchainTransactionRepository } from "@/server/repositories/blockchain-tx.repository";
import { AuditRepository } from "@/server/repositories/audit.repository";
import { UserRepository } from "@/server/repositories/user.repository";
import { ethers } from "ethers";

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

    // Resolve recipient wallet for crypto payout
    let recipientWallet = payment.recipientWallet;
    if (!recipientWallet) {
      const customer = await UserRepository.findById(payment.customerId);
      if (customer?.walletAddress) {
        recipientWallet = customer.walletAddress;
        payment.recipientWallet = recipientWallet;
      }
    }

    const isCryptoPayment = payment.paymentMethod !== "FIAT_BANK_TRANSFER";
    if (isCryptoPayment) {
      if (!recipientWallet || !ethers.isAddress(recipientWallet.toLowerCase())) {
        return NextResponse.json(
          {
            success: false,
            error: "CUSTOMER_WALLET_NOT_VERIFIED: A verified EVM customer wallet is required for smart contract disbursement.",
            code: "CUSTOMER_WALLET_NOT_VERIFIED",
          },
          { status: 400 }
        );
      }
      recipientWallet = ethers.getAddress(recipientWallet.toLowerCase());
      payment.recipientWallet = recipientWallet;
    }

    // Execute retry
    const bcResult = await BlockchainService.recordPaymentDisbursement(
      payment.id,
      payment.claimId,
      payment.amount,
      recipientWallet!
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

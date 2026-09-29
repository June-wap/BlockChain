import { NextRequest, NextResponse } from "next/server";
import { BlockchainService } from "@/server/services/blockchain.service";
import { AuditAction, ClaimStatus, NotificationType, PaymentStatus, UserRole } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { RbacGuard } from "@/server/core/rbac";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { ClaimRepository } from "@/server/repositories/claim.repository";
import { OutboxRepository } from "@/server/repositories/outbox.repository";
import { AuditRepository } from "@/server/repositories/audit.repository";
import { NotificationRepository } from "@/server/repositories/notification.repository";
import { UserRepository } from "@/server/repositories/user.repository";
import { dbConnection } from "@/server/db/postgres";
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
        { success: false, error: "Forbidden: Only FINANCE or ADMIN roles can disburse payments." },
        { status: 403 }
      );
    }

    const payment = await PaymentRepository.findById(params.id);
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment record not found." }, { status: 404 });
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return NextResponse.json(
        { success: false, error: "Payment has already been successfully disbursed. Double payout prohibited." },
        { status: 400 }
      );
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

    const isCryptoPayment =
      payment.paymentMethod !== "FIAT_BANK_TRANSFER";

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

    let outboxId: string;

    // 1. Atomic database state transition: PENDING -> PROCESSING
    await dbConnection.transaction(async (client) => {
      payment.status = PaymentStatus.PROCESSING;
      await PaymentRepository.update(payment, client);

      const claim = await ClaimRepository.findById(payment.claimId, client);
      if (claim && claim.status === ClaimStatus.APPROVED) {
        await ClaimRepository.updateStatusWithOptimisticLock(
          claim.id,
          ClaimStatus.PAYMENT_PENDING,
          claim.version ?? 1,
          {},
          client
        );
      }

      outboxId = await OutboxRepository.create(
        {
          aggregateType: "PAYMENT",
          aggregateId: payment.id,
          eventType: "PAYMENT_DISBURSED",
          payload: {
            paymentId: payment.id,
            claimId: payment.claimId,
            amount: payment.amount,
            recipientWallet: recipientWallet || null,
          },
        },
        client
      );

      await AuditRepository.create(
        {
          id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: new Date().toISOString(),
          actorId: user.id,
          actorName: user.fullName,
          role: user.role,
          action: AuditAction.PAYMENT_COMPLETED,
          entityType: "PAYMENT",
          entityId: payment.id,
          metadata: { amount: payment.amount, stage: "DISBURSE_REQUESTED" },
        },
        client
      );
    });

    // 2. Execute payment disbursement on blockchain
    const bcResult = await BlockchainService.recordPaymentDisbursement(
      payment.id,
      payment.claimId,
      payment.amount,
      recipientWallet!
    );

    // 3. Atomic finalize: mark payment SUCCESS and claim PAID
    let finalizedPayment = payment;
    let finalizedClaim: any = null;

    await dbConnection.transaction(async (client) => {
      payment.status = PaymentStatus.SUCCESS;
      payment.blockchainTxHash = bcResult.txHash;
      payment.processedAt = new Date().toISOString();
      await PaymentRepository.update(payment, client);
      finalizedPayment = payment;

      const claim = await ClaimRepository.findById(payment.claimId, client);
      if (claim) {
        finalizedClaim = await ClaimRepository.updateStatusWithOptimisticLock(
          claim.id,
          ClaimStatus.PAID,
          claim.version ?? 1,
          { blockchainTxHash: bcResult.txHash },
          client
        );
      }

      await OutboxRepository.markProcessed(outboxId, bcResult.txHash, client);

      await NotificationRepository.create(
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: payment.customerId,
          title: "Giải ngân bồi thường thành công",
          message: `Khoản tiền bồi thường $${payment.amount.toLocaleString()} đã được chuyển tới ví ${payment.recipientWallet}. Mã giao dịch: ${bcResult.txHash.slice(0, 10)}...`,
          type: NotificationType.PAYMENT_SUCCESS,
          read: false,
          linkUrl: "/customer/payments",
          createdAt: new Date().toISOString(),
        },
        client
      );
    });

    return NextResponse.json({
      success: true,
      data: { payment: finalizedPayment, claim: finalizedClaim, txHash: bcResult.txHash },
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

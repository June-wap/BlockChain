import { OutboxRepository, OutboxEvent } from "../repositories/outbox.repository";
import { ClaimRepository } from "../repositories/claim.repository";
import { PaymentRepository } from "../repositories/payment.repository";
import { BlockchainService } from "../services/blockchain.service";
import { db } from "../db/store";

export interface OutboxProcessResult {
  processed: number;
  failed: number;
  results: Array<{
    eventId: string;
    aggregateId: string;
    eventType: string;
    status: "PROCESSED" | "FAILED";
    txHash?: string;
    error?: string;
  }>;
}

export class OutboxWorker {
  /**
   * Processes a batch of pending events from outbox_events table
   */
  public static async processBatch(batchSize: number = 10): Promise<OutboxProcessResult> {
    const pendingEvents = await OutboxRepository.getPendingEvents(batchSize);
    const summary: OutboxProcessResult = {
      processed: 0,
      failed: 0,
      results: [],
    };

    for (const event of pendingEvents) {
      try {
        let txHash: string | undefined;

        switch (event.eventType) {
          case "CLAIM_APPROVED": {
            const claimId = event.aggregateId;
            const approvedAmount = Number(event.payload.approvedAmount || 0);

            const result = await BlockchainService.recordClaimApproval(
              claimId,
              approvedAmount,
              undefined,
              {
                policyId: event.payload.policyId,
                requestedAmount: event.payload.requestedAmount,
              }
            );

            txHash = result.txHash;

            // Update Claim record with on-chain txHash
            await ClaimRepository.updateBlockchainTx(claimId, txHash).catch(() => {});
            const memoryClaim = db.getClaims().get(claimId);
            if (memoryClaim) {
              memoryClaim.blockchainTxHash = txHash;
            }
            break;
          }

          case "PAYMENT_DISBURSED": {
            const paymentId = event.aggregateId;
            const claimId = event.payload.claimId;
            const amount = Number(event.payload.amount || 0);
            const recipientWallet =
              event.payload.recipientWallet || "0x71C8366453AB548A31D08f237B855D282126B39a";

            const result = await BlockchainService.recordPaymentDisbursement(
              paymentId,
              claimId,
              amount,
              recipientWallet
            );

            txHash = result.txHash;

            // Update Payment record in PostgreSQL and memory
            const payment = await PaymentRepository.findById(paymentId);
            if (payment) {
              payment.blockchainTxHash = txHash;
              await PaymentRepository.update(payment).catch(() => {});
            }
            const memoryPayment = db.getPayments().get(paymentId);
            if (memoryPayment) {
              memoryPayment.blockchainTxHash = txHash;
            }
            break;
          }

          case "CLAIM_SUBMITTED": {
            const claimId = event.aggregateId;
            const policyId = event.payload.policyId || "pol-default";
            const requestedAmount = Number(event.payload.requestedAmount || 1000);
            const claimantWallet =
              event.payload.claimantWallet || "0x71C8366453AB548A31D08f237B855D282126B39a";

            const result = await BlockchainService.recordClaimSubmission(
              claimId,
              policyId,
              claimantWallet,
              requestedAmount
            );

            txHash = result.txHash;
            break;
          }

          default:
            // Generic event: mark as processed without blockchain call
            break;
        }

        await OutboxRepository.markProcessed(event.id, txHash);
        summary.processed++;
        summary.results.push({
          eventId: event.id,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          status: "PROCESSED",
          txHash,
        });
      } catch (err: any) {
        const errorMsg = err?.message || "Unknown error processing outbox event";
        await OutboxRepository.markFailed(event.id, errorMsg);
        summary.failed++;
        summary.results.push({
          eventId: event.id,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          status: "FAILED",
          error: errorMsg,
        });
      }
    }

    return summary;
  }
}

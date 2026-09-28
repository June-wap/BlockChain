import { describe, it, expect } from "vitest";
import { BlockchainService } from "@/server/services/blockchain.service";
import { PaymentStatus } from "@/types";

describe("Payments & Settlements Lifecycle (FE-13 & FE-19)", () => {
  it("should successfully disburse an approved claim payment on-chain", async () => {
    const paymentId = "pay-test-101";
    const claimId = "clm-test-101";
    const recipientWallet = "0x71C8366453AB548A31D08f237B855D282126B39a";

    const result = await BlockchainService.recordPaymentDisbursement(
      paymentId,
      claimId,
      1200,
      recipientWallet
    );

    expect(result.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.status).toBe("CONFIRMED");
    expect(result.gasUsed).toBeGreaterThan(0);
  });

  it("should strictly prevent double payouts for the same claim", async () => {
    const paymentId = "pay-double-test";
    const claimId = "clm-double-test";
    const recipientWallet = "0x71C8366453AB548A31D08f237B855D282126B39a";

    // First disbursement succeeds
    await BlockchainService.recordPaymentDisbursement(
      paymentId,
      claimId,
      800,
      recipientWallet
    );

    // Second disbursement for same claim must be rejected to prevent duplicate payout
    await expect(
      BlockchainService.recordPaymentDisbursement(
        paymentId + "-dup",
        claimId,
        800,
        recipientWallet
      )
    ).rejects.toThrow(/Double-payment prevented/);
  });
});

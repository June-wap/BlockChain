import crypto from "crypto";
import { ethers } from "ethers";
import { WalletChallengeRepository, WalletChallenge } from "../repositories/wallet-challenge.repository";
import { UserRepository } from "../repositories/user.repository";
import { AuditRepository } from "../repositories/audit.repository";
import { dbConnection } from "../db/postgres";
import { AuditAction, UserRole } from "@/types";
import { ValidationError, AuthenticationError, NotFoundError } from "../core/errors";
import { HARDHAT_LOCAL_CHAIN_ID } from "@/lib/web3/config";

export interface ChallengeResponse {
  nonce: string;
  message: string;
  expiresAt: string;
  walletAddress: string;
  chainId: number;
}

export interface VerificationResult {
  walletAddress: string;
  verified: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    walletAddress?: string;
  };
}

export class WalletService {
  public static readonly CHALLENGE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Generates a cryptographically secure, single-use ownership challenge
   * bound to the authenticated user and specified EVM wallet address.
   */
  public static async generateChallenge(
    userId: string,
    rawAddress: string,
    chainId: number = HARDHAT_LOCAL_CHAIN_ID
  ): Promise<ChallengeResponse> {
    if (!userId) {
      throw new AuthenticationError("Authentication required to request a wallet challenge.");
    }

    if (!rawAddress || typeof rawAddress !== "string") {
      throw new ValidationError("Wallet address is required.");
    }

    const cleanAddress = rawAddress.trim();
    if (!ethers.isAddress(cleanAddress)) {
      throw new ValidationError("Invalid EVM wallet address format.");
    }

    const checksumAddress = ethers.getAddress(cleanAddress);
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }

    const nonce = crypto.randomBytes(32).toString("hex");
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.CHALLENGE_DURATION_MS);

    const message = [
      "Insurance Claim Processing System",
      "Wallet ownership verification",
      "",
      `Address: ${checksumAddress}`,
      `Nonce: ${nonce}`,
      `Chain ID: ${chainId}`,
      `Issued At: ${issuedAt.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`,
    ].join("\n");

    const challengeId = `wch-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await WalletChallengeRepository.create({
      id: challengeId,
      userId,
      walletAddress: checksumAddress,
      nonce,
      message,
      chainId,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      nonce,
      message,
      expiresAt: expiresAt.toISOString(),
      walletAddress: checksumAddress,
      chainId,
    };
  }

  /**
   * Cryptographically verifies the challenge signature against the recovered address,
   * validates nonce expiration and replay protection, and persists the verified
   * wallet address to the authoritative user record.
   */
  public static async verifyWalletOwnership(
    userId: string,
    input: {
      address: string;
      signature: string;
      nonce: string;
      message?: string;
    }
  ): Promise<VerificationResult> {
    if (!userId) {
      throw new AuthenticationError("Authentication required to verify wallet.");
    }

    const { address, signature, nonce, message } = input;

    if (!address || typeof address !== "string" || !ethers.isAddress(address.trim())) {
      throw new ValidationError("A valid EVM wallet address is required.");
    }

    if (!signature || typeof signature !== "string" || signature.trim().length === 0) {
      throw new ValidationError("Cryptographic signature is required.");
    }

    if (!nonce || typeof nonce !== "string" || nonce.trim().length === 0) {
      throw new ValidationError("Challenge nonce is required.");
    }

    const submittedChecksum = ethers.getAddress(address.trim());
    const challenge = await WalletChallengeRepository.findByNonce(nonce.trim());

    if (!challenge) {
      throw new ValidationError("Challenge nonce not found. Please request a new challenge.");
    }

    // Single-use guard: reject if already used
    if (challenge.used) {
      throw new ValidationError("Challenge nonce has already been used (replay detected). Please request a new challenge.");
    }

    // Expiration guard: reject if expired
    const now = new Date();
    const expiresAt = new Date(challenge.expiresAt);
    if (now > expiresAt) {
      throw new ValidationError("Challenge nonce has expired. Please request a new challenge.");
    }

    // User binding guard: reject if belongs to different user
    if (challenge.userId !== userId) {
      throw new AuthenticationError("Challenge was issued to a different user account.");
    }

    // Target address binding guard
    const challengeChecksum = ethers.getAddress(challenge.walletAddress);
    if (challengeChecksum.toLowerCase() !== submittedChecksum.toLowerCase()) {
      throw new ValidationError("Submitted wallet address does not match challenge target address.");
    }

    // Message integrity check if provided
    if (message && message !== challenge.message) {
      throw new ValidationError("Message content does not match original server challenge.");
    }

    // Cryptographic signature recovery via ethers v6 verifyMessage
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(challenge.message, signature.trim());
    } catch (err: any) {
      throw new ValidationError("Failed to verify cryptographic signature: " + (err?.message || "Invalid signature format"));
    }

    const recoveredChecksum = ethers.getAddress(recoveredAddress);
    if (recoveredChecksum.toLowerCase() !== submittedChecksum.toLowerCase()) {
      throw new ValidationError("Signature verification failed: recovered signer address does not match submitted wallet address.");
    }

    // Atomic transaction: mark nonce used, persist verified wallet, log audit
    await dbConnection.transaction(async (client) => {
      await WalletChallengeRepository.markUsed(challenge.id, client);
      await UserRepository.updateWalletAddress(userId, recoveredChecksum, client);

      await AuditRepository.create(
        {
          id: `aud-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
          timestamp: new Date().toISOString(),
          actorId: userId,
          actorName: (await UserRepository.findById(userId, client))?.fullName || "User",
          role: (await UserRepository.findById(userId, client))?.role || UserRole.CUSTOMER,
          action: AuditAction.USER_ACTIVATED, // or wallet action
          entityType: "USER",
          entityId: userId,
          metadata: {
            walletAddress: recoveredChecksum,
            chainId: challenge.chainId,
            verifiedAt: new Date().toISOString(),
          },
        },
        client
      );
    });

    const updatedUser = await UserRepository.findById(userId);
    if (!updatedUser) {
      throw new NotFoundError("User", userId);
    }

    return {
      walletAddress: recoveredChecksum,
      verified: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        walletAddress: updatedUser.walletAddress,
      },
    };
  }

  /**
   * Unlinks the verified wallet from the user account.
   */
  public static async unlinkWallet(userId: string): Promise<void> {
    if (!userId) {
      throw new AuthenticationError("Authentication required.");
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }

    await dbConnection.transaction(async (client) => {
      await UserRepository.updateWalletAddress(userId, null, client);
      await AuditRepository.create(
        {
          id: `aud-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
          timestamp: new Date().toISOString(),
          actorId: userId,
          actorName: user.fullName,
          role: user.role,
          action: AuditAction.USER_ACTIVATED,
          entityType: "USER",
          entityId: userId,
          metadata: {
            previousWallet: user.walletAddress,
            action: "WALLET_UNLINKED",
          },
        },
        client
      );
    });
  }
}

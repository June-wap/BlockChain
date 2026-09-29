import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { WalletService } from "@/server/services/wallet.service";
import { handleApiError, AuthenticationError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new AuthenticationError("Authentication required to verify wallet ownership.");
    }

    const body = await request.json().catch(() => ({}));
    const { address, signature, nonce, message } = body;

    const result = await WalletService.verifyWalletOwnership(user.id, {
      address,
      signature,
      nonce,
      message,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Wallet ownership verified and linked successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

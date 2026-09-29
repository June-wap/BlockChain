import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { WalletService } from "@/server/services/wallet.service";
import { handleApiError, AuthenticationError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    await WalletService.unlinkWallet(user.id);

    return NextResponse.json({
      success: true,
      message: "Wallet unlinked successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { WalletService } from "@/server/services/wallet.service";
import { handleApiError, AuthenticationError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new AuthenticationError("Authentication required to request a wallet challenge.");
    }

    const body = await request.json().catch(() => ({}));
    const { address, chainId } = body;

    const challenge = await WalletService.generateChallenge(
      user.id,
      address,
      chainId ? Number(chainId) : undefined
    );

    return NextResponse.json({
      success: true,
      data: challenge,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

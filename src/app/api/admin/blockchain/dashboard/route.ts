import { NextRequest, NextResponse } from "next/server";
import { BlockchainService } from "@/server/services/blockchain.service";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAuthenticatedUser(request);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    try {
      const telemetry = BlockchainService.getTelemetry();
      return NextResponse.json({ success: true, data: telemetry });
    } catch {
      // Degraded fallback when provider is unreachable (BE-30 requirement)
      return NextResponse.json({
        success: true,
        data: {
          network: BlockchainService.getNetworkName(),
          connectionStatus: "DEGRADED_FALLBACK",
          contractAddress: "0x3918a10982301982b81092830192839182390182",
          operatorAddress: "0x0A9213894b91819c9e8310d2918e91823901b891",
          latestBlock: 0,
          contractBalance: "N/A",
          stats: {
            totalTransactions: 0,
            claimsRecorded: 0,
            approvalsRecorded: 0,
            paymentsRecorded: 0,
            failedTransactions: 0,
          },
          recentTransactions: [],
          notice: "Blockchain RPC node unreachable. Operating in fallback telemetry mode.",
        },
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

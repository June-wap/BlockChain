import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));

    let txs = Array.from(db.getBlockchainTransactions().values());

    if (search) {
      txs = txs.filter(
        (t) =>
          t.txHash.toLowerCase().includes(search) ||
          (t.claimId && t.claimId.toLowerCase().includes(search)) ||
          t.action.toLowerCase().includes(search)
      );
    }

    txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = txs.length;
    const startIndex = (page - 1) * limit;
    const paginatedTxs = txs.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedTxs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

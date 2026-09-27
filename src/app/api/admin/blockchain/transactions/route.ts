import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = request.cookies.get("auth_role")?.value;
    if (role && role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim();

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

    return NextResponse.json({ success: true, data: txs });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to load transactions" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { BlockchainService } from "@/server/services/blockchain.service";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = request.cookies.get("auth_role")?.value;
    if (role && role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const telemetry = BlockchainService.getTelemetry();
    return NextResponse.json({ success: true, data: telemetry });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to load blockchain telemetry" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = (request.cookies.get("auth_role")?.value as UserRole) || UserRole.CUSTOMER;
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || "usr_customer_default";
    const status = searchParams.get("status") || "ALL";

    let payments = Array.from(db.getPayments().values());

    // Customer can only view their own payments
    if (role === UserRole.CUSTOMER) {
      payments = payments.filter((p) => p.customerId === customerId);
    }

    if (status && status !== "ALL") {
      payments = payments.filter((p) => p.status === status);
    }

    payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: payments,
      meta: { total: payments.length },
    });
  } catch (error) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json({ success: false, error: "Failed to retrieve payments" }, { status: 500 });
  }
}

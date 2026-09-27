import { NextRequest, NextResponse } from "next/server";
import { PolicyService } from "@/server/services/policy.service";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = (request.cookies.get("auth_role")?.value as UserRole) || UserRole.CUSTOMER;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";

    if (role === UserRole.CUSTOMER) {
      // Customer: Only retrieve own policies
      const customerId = searchParams.get("customerId") || "usr_customer_default";
      const result = PolicyService.getCustomerPolicies(customerId, { status, search });
      return NextResponse.json({ success: true, data: result.policies, meta: { total: result.total } });
    }

    // Staff or Admin: retrieve policies according to role scope
    const result = PolicyService.getAllPolicies({ status, search });
    return NextResponse.json({ success: true, data: result.policies, meta: { total: result.total } });
  } catch (error) {
    console.error("GET /api/policies error:", error);
    return NextResponse.json({ success: false, error: "Failed to retrieve policies" }, { status: 500 });
  }
}

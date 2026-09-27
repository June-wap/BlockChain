import { NextRequest, NextResponse } from "next/server";
import { PolicyService } from "@/server/services/policy.service";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = (request.cookies.get("auth_role")?.value as UserRole) || UserRole.CUSTOMER;
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || "usr_customer_default";

    const result = PolicyService.getPolicyById(params.id, {
      id: customerId,
      role,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true, data: result.policy });
  } catch (error) {
    console.error(`GET /api/policies/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

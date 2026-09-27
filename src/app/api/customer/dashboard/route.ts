import { NextRequest, NextResponse } from "next/server";
import { CustomerDashboardService } from "@/server/services/dashboard.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authRole = request.cookies.get("auth_role")?.value;
    const { searchParams } = new URL(request.url);
    const forceEmpty = searchParams.get("empty") === "true";
    const customerId = searchParams.get("customerId") || "usr_customer_default";

    // In non-dev or strict mode, ensure caller has appropriate permissions
    if (authRole && authRole !== "CUSTOMER" && authRole !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only CUSTOMER role can access this dashboard API.",
        },
        { status: 403 }
      );
    }

    const data = CustomerDashboardService.getDashboardData(customerId, forceEmpty);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in /api/customer/dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error retrieving customer dashboard data",
      },
      { status: 500 }
    );
  }
}

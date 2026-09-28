import { NextRequest, NextResponse } from "next/server";
import { PolicyService } from "@/server/services/policy.service";
import { handleApiError, AuthenticationError, ForbiddenError } from "@/server/core/errors";
import { UserRole } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required to access policies.");
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";
    const requestedCustomerId = searchParams.get("customerId");

    if (user.role === UserRole.CUSTOMER) {
      // IDOR Protection: If customer specifies a customerId query param that is not their own, forbid it
      if (requestedCustomerId && requestedCustomerId !== user.id) {
        throw new ForbiddenError("Forbidden: You cannot access policies belonging to another customer.");
      }
      const result = PolicyService.getCustomerPolicies(user.id, { status, search });
      return NextResponse.json({ success: true, data: result.policies, meta: { total: result.total } });
    }

    // Staff or Admin: Can filter by customerId if provided, or retrieve all
    if (requestedCustomerId) {
      const result = PolicyService.getCustomerPolicies(requestedCustomerId, { status, search });
      return NextResponse.json({ success: true, data: result.policies, meta: { total: result.total } });
    }

    const result = PolicyService.getAllPolicies({ status, search });
    return NextResponse.json({ success: true, data: result.policies, meta: { total: result.total } });
  } catch (error) {
    return handleApiError(error);
  }
}

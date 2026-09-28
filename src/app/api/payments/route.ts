import { NextRequest, NextResponse } from "next/server";
import { PaymentRepository } from "@/server/repositories/payment.repository";
import { handleApiError, AuthenticationError, ForbiddenError } from "@/server/core/errors";
import { UserRole } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const { searchParams } = new URL(request.url);
    const requestedCustomerId = searchParams.get("customerId");
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    let targetCustomerId: string | undefined = undefined;

    // Customer can only view their own payments
    if (user.role === UserRole.CUSTOMER) {
      if (requestedCustomerId && requestedCustomerId !== user.id) {
        throw new ForbiddenError("Forbidden: You cannot access payment records belonging to another user.");
      }
      targetCustomerId = user.id;
    } else if (requestedCustomerId) {
      targetCustomerId = requestedCustomerId;
    }

    const allMatching = await PaymentRepository.findAll({
      customerId: targetCustomerId,
      status: status !== "ALL" ? status : undefined,
    });

    const total = allMatching.length;
    const startIndex = (page - 1) * limit;
    const paginatedPayments = allMatching.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: paginatedPayments,
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

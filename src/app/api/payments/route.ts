import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { AuthService } from "@/server/services/auth.service";
import { handleApiError, AuthenticationError, ForbiddenError } from "@/server/core/errors";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const roleCookie = request.cookies.get("auth_role")?.value;
    const user = AuthService.resolveUser(token, roleCookie);

    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const { searchParams } = new URL(request.url);
    const requestedCustomerId = searchParams.get("customerId");
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    let payments = Array.from(db.getPayments().values());

    // Customer can only view their own payments
    if (user.role === UserRole.CUSTOMER) {
      if (requestedCustomerId && requestedCustomerId !== user.id) {
        throw new ForbiddenError("Forbidden: You cannot access payment records belonging to another user.");
      }
      payments = payments.filter((p) => p.customerId === user.id);
    } else if (requestedCustomerId) {
      // Staff / Admin filtered by customer
      payments = payments.filter((p) => p.customerId === requestedCustomerId);
    }

    if (status && status !== "ALL") {
      payments = payments.filter((p) => p.status === status);
    }

    payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = payments.length;
    const startIndex = (page - 1) * limit;
    const paginatedPayments = payments.slice(startIndex, startIndex + limit);

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

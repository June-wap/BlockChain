import { NextRequest, NextResponse } from "next/server";
import { ClaimService, CreateClaimInput } from "@/server/services/claim.service";
import { ClaimRepository } from "@/server/repositories/claim.repository";
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
    const search = searchParams.get("search")?.toLowerCase().trim() || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    let targetCustomerId: string | undefined = undefined;

    // Role-based scoping & IDOR Protection:
    if (user.role === UserRole.CUSTOMER) {
      if (requestedCustomerId && requestedCustomerId !== user.id) {
        throw new ForbiddenError("Forbidden: You cannot access claims belonging to another customer.");
      }
      targetCustomerId = user.id;
    } else if (requestedCustomerId) {
      targetCustomerId = requestedCustomerId;
    }

    const [paginatedClaims, allMatchingClaims] = await Promise.all([
      ClaimRepository.findAll({
        customerId: targetCustomerId,
        status: status !== "ALL" ? status : undefined,
        search,
        limit,
        offset,
      }),
      ClaimRepository.findAll({
        customerId: targetCustomerId,
        status: status !== "ALL" ? status : undefined,
        search,
      }),
    ]);

    const total = allMatchingClaims.length;

    return NextResponse.json({
      success: true,
      data: paginatedClaims,
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      throw new AuthenticationError("Authentication required to submit claims.");
    }

    const body: CreateClaimInput = await request.json();

    // STRICT: Customer identity is derived from verified user, NEVER from untrusted client input
    const customerId = user.id;
    const customerName = user.fullName;

    const result = await ClaimService.submitClaim(customerId, customerName, body);

    return NextResponse.json(
      {
        success: true,
        data: result.claim,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

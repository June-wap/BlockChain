import { NextRequest, NextResponse } from "next/server";
import { ClaimService, CreateClaimInput } from "@/server/services/claim.service";
import { db } from "@/server/db/store";
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
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

    let claims = Array.from(db.getClaims().values());

    // Role-based scoping & IDOR Protection:
    if (user.role === UserRole.CUSTOMER) {
      // If customer specifies a customerId that isn't their own, block it
      if (requestedCustomerId && requestedCustomerId !== user.id) {
        throw new ForbiddenError("Forbidden: You cannot access claims belonging to another customer.");
      }
      claims = claims.filter((c) => c.customerId === user.id);
    } else if (requestedCustomerId) {
      // Staff / Admin filtering by specific customer
      claims = claims.filter((c) => c.customerId === requestedCustomerId);
    }

    // Status filter
    if (status && status !== "ALL") {
      claims = claims.filter((c) => c.status === status);
    }

    // Search filter (Claim Number, Policy ID, or Customer Name)
    if (search) {
      claims = claims.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(search) ||
          c.id.toLowerCase().includes(search) ||
          c.policyId.toLowerCase().includes(search) ||
          (c.customerName && c.customerName.toLowerCase().includes(search))
      );
    }

    // Sort by createdAt descending
    claims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = claims.length;
    const startIndex = (page - 1) * limit;
    const paginatedClaims = claims.slice(startIndex, startIndex + limit);

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

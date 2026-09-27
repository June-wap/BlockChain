import { NextRequest, NextResponse } from "next/server";
import { ClaimService, CreateClaimInput } from "@/server/services/claim.service";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = (request.cookies.get("auth_role")?.value as UserRole) || UserRole.CUSTOMER;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";
    const customerId = searchParams.get("customerId") || "usr_customer_default";

    let claims = Array.from(db.getClaims().values());

    // Role-based scoping: Customers can strictly only access their own claims
    if (role === UserRole.CUSTOMER) {
      claims = claims.filter((c) => c.customerId === customerId);
    }

    // Status filter
    if (status && status !== "ALL") {
      claims = claims.filter((c) => c.status === status);
    }

    // Search filter (Claim Number, Policy ID, or Customer Name)
    if (search && search.trim() !== "") {
      const q = search.toLowerCase().trim();
      claims = claims.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.policyId.toLowerCase().includes(q) ||
          (c.customerName && c.customerName.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt descending
    claims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: claims,
      meta: { total: claims.length },
    });
  } catch (error) {
    console.error("GET /api/claims error:", error);
    return NextResponse.json({ success: false, error: "Failed to retrieve claims" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = (request.cookies.get("auth_role")?.value as UserRole) || UserRole.CUSTOMER;
    const body: CreateClaimInput = await request.json();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || "usr_customer_default";

    // Lookup customer name
    const customerUser = db.getUsers().get(customerId);
    const customerName = customerUser?.fullName || "Nguyen Van A";

    const result = await ClaimService.submitClaim(customerId, customerName, body);

    return NextResponse.json({
      success: true,
      data: result.claim,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/claims error:", error);
    const isClientError =
      error.message.includes("exceeds") ||
      error.message.includes("Invalid") ||
      error.message.includes("Cannot") ||
      error.message.includes("must") ||
      error.message.includes("required");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit claim" },
      { status: isClientError ? 400 : 500 }
    );
  }
}

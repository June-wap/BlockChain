import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { RbacGuard } from "@/server/core/rbac";
import { handleApiError, AuthenticationError } from "@/server/core/errors";
import { UserRole } from "@/types";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAuthenticatedUser(request);

    if (!adminUser) {
      throw new AuthenticationError("Admin authentication required.");
    }

    RbacGuard.assertCanAdministerSystem(adminUser);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const status = searchParams.get("status") || "ALL";

    let users = Array.from(db.getUsers().values()).filter((u) => u.role === UserRole.CUSTOMER);

    if (status && status !== "ALL") {
      users = users.filter((u) => u.status === status);
    }

    if (search) {
      users = users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.id.toLowerCase().includes(search)
      );
    }

    const policies = Array.from(db.getPolicies().values());
    const claims = Array.from(db.getClaims().values());

    const result = users.map((u) => {
      // NEVER expose password hash
      const { passwordHash: _, ...safe } = u;
      const userPolicies = policies.filter((p) => p.customerId === u.id);
      const userClaims = claims.filter((c) => c.customerId === u.id);
      return {
        ...safe,
        policyCount: userPolicies.length,
        claimCount: userClaims.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: { total: result.length },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

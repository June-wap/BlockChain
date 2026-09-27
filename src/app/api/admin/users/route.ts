import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const role = request.cookies.get("auth_role")?.value;
    if (role && role !== UserRole.ADMIN) {
      return NextResponse.json({ success: false, error: "Forbidden: Admin role required" }, { status: 403 });
    }

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
    return NextResponse.json({ success: false, error: "Failed to load users" }, { status: 500 });
  }
}

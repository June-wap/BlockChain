import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/store";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || "usr_customer_default";

    const user = db.getUsers().get(customerId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ success: true, data: safeUser });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, fullName, phoneNumber, walletAddress } = body;

    const targetId = customerId || "usr_customer_default";
    const user = db.getUsers().get(targetId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Role cannot be edited by customer
    if (body.role && body.role !== user.role) {
      return NextResponse.json({ success: false, error: "Forbidden: Cannot alter user role." }, { status: 403 });
    }

    if (fullName && fullName.trim().length >= 2) {
      user.fullName = fullName.trim();
    }
    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber.trim();
    }
    if (walletAddress !== undefined) {
      // Validate EVM wallet format if provided
      if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return NextResponse.json(
          { success: false, error: "Invalid Ethereum wallet address format (must be 0x followed by 40 hex characters)." },
          { status: 400 }
        );
      }
      user.walletAddress = walletAddress.trim();
    }

    db.getUsers().set(user.id, user);

    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({
      success: true,
      data: safeUser,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}

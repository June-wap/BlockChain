import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/server/repositories/user.repository";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUser = await getAuthenticatedUser(request);
    const customerId = searchParams.get("customerId") || authUser?.id || "usr_customer_default";

    const user = await UserRepository.findById(customerId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phoneNumber: user.phoneNumber,
        walletAddress: user.walletAddress,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, fullName, phoneNumber, walletAddress } = body;

    const authUser = await getAuthenticatedUser(request);
    const targetId = customerId || authUser?.id || "usr_customer_default";
    const user = await UserRepository.findById(targetId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Role cannot be edited by customer
    if (body.role && body.role !== user.role) {
      return NextResponse.json({ success: false, error: "Forbidden: Cannot alter user role." }, { status: 403 });
    }

    // Validate EVM wallet format if provided
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid Ethereum wallet address format (must be 0x followed by 40 hex characters)." },
        { status: 400 }
      );
    }

    await UserRepository.updateProfile(user.id, {
      fullName: fullName && fullName.trim().length >= 2 ? fullName.trim() : undefined,
      phoneNumber: phoneNumber !== undefined ? phoneNumber.trim() : undefined,
      walletAddress: walletAddress !== undefined ? walletAddress.trim() : undefined,
    });

    const updatedUser = await UserRepository.findById(user.id);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        fullName: updatedUser!.fullName,
        role: updatedUser!.role,
        phoneNumber: updatedUser!.phoneNumber,
        walletAddress: updatedUser!.walletAddress,
        status: updatedUser!.status,
        createdAt: updatedUser!.createdAt,
      },
      message: "Profile updated successfully.",
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}

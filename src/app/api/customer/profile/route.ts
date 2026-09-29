import { NextRequest, NextResponse } from "next/server";
import { UserRepository } from "@/server/repositories/user.repository";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Active authentication session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryCustomerId = searchParams.get("customerId");

    // Only ADMIN may query another user's profile
    let targetId = authUser.id;
    if (queryCustomerId && queryCustomerId !== authUser.id) {
      if (authUser.role === UserRole.ADMIN) {
        targetId = queryCustomerId;
      } else {
        return NextResponse.json(
          { success: false, error: "Forbidden: You may only view your own profile." },
          { status: 403 }
        );
      }
    }

    const user = await UserRepository.findById(targetId);
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
  } catch (err: any) {
    console.error("GET /api/customer/profile error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Active authentication session required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { customerId, fullName, phoneNumber, walletAddress, role } = body;

    // A customer can only update their own profile; reject attempts to target another user
    if (customerId && customerId !== authUser.id && authUser.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot modify another user's profile." },
        { status: 403 }
      );
    }

    // Role cannot be edited by customer
    if (role && role !== authUser.role) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Cannot alter user role." },
        { status: 403 }
      );
    }

    // Cryptographic security enforcement: walletAddress cannot be manually typed or injected
    if (walletAddress !== undefined && walletAddress !== null) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Manual wallet assignment prohibited. Connect MetaMask and verify cryptographic ownership via signature.",
        },
        { status: 400 }
      );
    }

    const targetId = authUser.role === UserRole.ADMIN && customerId ? customerId : authUser.id;
    const user = await UserRepository.findById(targetId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    await UserRepository.updateProfile(user.id, {
      fullName: fullName && fullName.trim().length >= 2 ? fullName.trim() : undefined,
      phoneNumber: phoneNumber !== undefined ? phoneNumber.trim() : undefined,
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
  } catch (err: any) {
    console.error("PUT /api/customer/profile error:", err);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}

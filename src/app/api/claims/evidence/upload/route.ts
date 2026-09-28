import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { EvidenceService } from "@/server/services/evidence.service";
import { handleApiError, AuthenticationError, ValidationError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new AuthenticationError("Authentication required to upload evidence.");
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      throw new ValidationError("Request must be multipart/form-data.");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const claimId = (formData.get("claimId") as string) || undefined;

    if (!file) {
      throw new ValidationError("No file provided. 'file' field is required in form-data.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const evidence = await EvidenceService.processUpload(
      buffer,
      file.name,
      file.type,
      user,
      claimId
    );

    return NextResponse.json(
      {
        success: true,
        data: evidence,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

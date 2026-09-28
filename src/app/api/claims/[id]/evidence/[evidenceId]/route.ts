import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/server/core/auth-extractor";
import { EvidenceService } from "@/server/services/evidence.service";
import { handleApiError, AuthenticationError } from "@/server/core/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; evidenceId: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    const evidence = await EvidenceService.getEvidenceBinary(
      params.id,
      params.evidenceId,
      user
    );

    const searchParams = request.nextUrl.searchParams;
    const isDownload = searchParams.get("download") === "true";
    const isRaw = searchParams.get("raw") === "true";
    const isStream = searchParams.get("stream") === "1";
    const acceptHeader = request.headers.get("accept") || "";

    // If client explicitly requests metadata as JSON (and didn't ask for download/raw/stream)
    const wantsJson =
      searchParams.get("metadata") === "true" ||
      (acceptHeader.includes("application/json") && !isDownload && !isRaw && !isStream);

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        data: {
          id: params.evidenceId,
          claimId: params.id,
          fileName: evidence.fileName,
          fileSize: evidence.fileSize,
          mimeType: evidence.mimeType,
          fileHash: evidence.fileHash,
        },
      });
    }

    // Binary response from private storage
    const dispositionType = isDownload ? "attachment" : "inline";
    return new NextResponse(evidence.buffer, {
      status: 200,
      headers: {
        "Content-Type": evidence.mimeType,
        "Content-Length": evidence.fileSize.toString(),
        "Content-Disposition": `${dispositionType}; filename="${evidence.fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "ETag": `"${evidence.fileHash}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

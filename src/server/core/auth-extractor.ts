import { NextRequest } from "next/server";
import { AuthService } from "../services/auth.service";
import { User } from "@/types";

/**
 * Extracts authentication token from HTTP Authorization header (Bearer ...)
 * or from HttpOnly auth_token cookie.
 */
export function extractAuthToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }
  return request.cookies.get("auth_token")?.value;
}

/**
 * Resolves the cryptographically authenticated user for this request.
 * Returns null if no valid token exists, token is expired, or signature is invalid.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  const token = extractAuthToken(request);
  return AuthService.resolveUser(token);
}

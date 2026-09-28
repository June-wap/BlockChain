import * as jose from "jose";
import { UserRole } from "@/types";

const ISSUER = "insurance-system";
const AUDIENCE = "insurance-app";
const EXPIRATION_TIME = "7d";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export class JwtService {
  /**
   * Resolves and validates JWT secret with fail-fast security in production
   */
  public static getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
      if (!secret || secret.trim().length < 32) {
        throw new Error(
          "FATAL: JWT_SECRET environment variable must be provided in production and be at least 32 characters long."
        );
      }
      return new TextEncoder().encode(secret.trim());
    }

    if (secret !== undefined && secret !== null) {
      if (secret.trim().length < 32) {
        throw new Error(
          "JWT_SECRET is insecure: minimum length of 32 characters is required."
        );
      }
      return new TextEncoder().encode(secret.trim());
    }

    // Safe fallback for local development & unit tests only
    return new TextEncoder().encode(
      "antigravity-insurance-claim-processing-system-production-secret-key-32-chars-min!"
    );
  }

  /**
   * Generates a cryptographically signed JWT using HS256 with standard claims (iat, exp, iss, aud)
   */
  public static async signToken(payload: TokenPayload): Promise<string> {
    const secret = this.getSecret();
    const jwt = await new jose.SignJWT({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime(EXPIRATION_TIME)
      .sign(secret);

    return jwt;
  }

  public static async generateToken(payload: TokenPayload): Promise<string> {
    return this.signToken(payload);
  }

  /**
   * Verifies signature, expiration, issuer, and audience of candidate JWT.
   * Rejects tampered, forged, or expired tokens.
   */
  public static async verifyToken(token: string): Promise<TokenPayload | null> {
    if (!token || typeof token !== "string") return null;

    try {
      const secret = this.getSecret();
      const { payload } = await jose.jwtVerify(token, secret, {
        issuer: ISSUER,
        audience: AUDIENCE,
      });

      if (!payload.userId || !payload.role || !payload.email) {
        return null;
      }

      return {
        userId: payload.userId as string,
        email: payload.email as string,
        role: payload.role as UserRole,
        fullName: (payload.fullName as string) || (payload.email as string),
      };
    } catch {
      return null;
    }
  }
}

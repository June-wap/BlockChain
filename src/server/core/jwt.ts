import * as jose from "jose";
import { UserRole } from "@/types";

const JWT_SECRET_STRING =
  process.env.JWT_SECRET ||
  "antigravity-insurance-claim-processing-system-production-secret-key-32-chars-min!";

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
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
   * Generates a cryptographically signed JWT using HS256 with standard claims (iat, exp, iss, aud)
   */
  public static async signToken(payload: TokenPayload): Promise<string> {
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
      .sign(JWT_SECRET);

    return jwt;
  }

  /**
   * Verifies signature, expiration, issuer, and audience of candidate JWT.
   * Rejects tampered, forged, or expired tokens.
   */
  public static async verifyToken(token: string): Promise<TokenPayload | null> {
    if (!token || typeof token !== "string") return null;

    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
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

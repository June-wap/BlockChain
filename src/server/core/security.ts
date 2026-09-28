import crypto from "crypto";

/**
 * Cryptographically secure password hashing and verification using PBKDF2 (SHA-512)
 */
export class SecurityUtils {
  private static readonly ITERATIONS = 100000;
  private static readonly KEY_LENGTH = 64;
  private static readonly DIGEST = "sha512";

  /**
   * Hashes a plaintext password with a random 16-byte cryptographically secure salt.
   * Format: pbkdf2$iterations$salt$hash
   */
  public static hashPassword(password: string): string {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = crypto.pbkdf2Sync(
      password,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      this.DIGEST
    );
    return `pbkdf2$${this.ITERATIONS}$${salt}$${derivedKey.toString("hex")}`;
  }

  /**
   * Verifies a candidate password against a stored hash using timing-safe comparison.
   */
  public static verifyPassword(password: string, storedHash: string): boolean {
    if (!password || !storedHash) return false;

    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }

    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];

    const derivedKey = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      this.KEY_LENGTH,
      this.DIGEST
    );

    const derivedHex = derivedKey.toString("hex");
    const bufA = Buffer.from(derivedHex, "utf8");
    const bufB = Buffer.from(originalHash, "utf8");

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Sanitizes filenames to prevent Directory Traversal (LFI) and code execution attacks.
   */
  public static sanitizeFilename(fileName: string): string {
    if (!fileName) return "unnamed_document";
    // Strip path elements, null bytes, and non-printable characters
    const base = fileName.replace(/^.*[\\\/]/, "").replace(/\0/g, "");
    // Replace non-alphanumeric (except standard dots, underscores, dashes)
    const sanitized = base.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    // Prevent hidden files or extension bypasses
    const clean = sanitized.replace(/^\.+/, "");
    return clean.slice(0, 100) || "unnamed_document";
  }

  /**
   * Computes deterministic SHA-256 hash of a buffer or string.
   */
  public static sha256(data: string | Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Deeply sanitizes an object to remove sensitive keys (passwords, tokens, private keys)
   * before audit logging or returning to clients.
   */
  public static sanitizeMetadata<T = unknown>(obj: T): T {
    if (!obj || typeof obj !== "object") return obj;

    const SENSITIVE_KEYS = new Set([
      "password",
      "passwordhash",
      "secret",
      "privatekey",
      "authorization",
      "jwt",
      "token",
      "apikey",
      "cookie",
    ]);

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeMetadata(item)) as unknown as T;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, "");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        cleaned[key] = "[REDACTED]";
      } else if (value && typeof value === "object") {
        cleaned[key] = this.sanitizeMetadata(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned as T;
  }
}

/**
 * In-memory sliding window rate limiter for brute-force prevention on authentication endpoints
 */
class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number }> = new Map();

  public isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    if (now - record.firstAttempt > windowMs) {
      // Window expired, reset
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count += 1;
    return true;
  }

  public reset(key: string) {
    this.attempts.delete(key);
  }
}

export const authRateLimiter = new RateLimiter();

import { db } from "../db/store";
import { AuditAction, User, UserRole, UserStatus } from "@/types";
import { SecurityUtils, authRateLimiter } from "../core/security";
import {
  AuthenticationError,
  ConflictError,
  ForbiddenError,
  ValidationError,
  AppError,
  ErrorCode,
} from "../core/errors";

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  walletAddress?: string;
}

export interface LoginResult {
  user: User;
  token: string;
  capabilities: string[];
}

export class AuthService {
  /**
   * Determine granular user capabilities based on role
   */
  public static getCapabilities(role: UserRole): string[] {
    switch (role) {
      case UserRole.CUSTOMER:
        return ["canSubmitClaims", "canViewOwnPolicies", "canViewOwnClaims", "canViewOwnPayments"];
      case UserRole.CLAIM_REVIEWER:
        return ["canReviewClaims", "canApproveClaims", "canRejectClaims", "canViewClaimQueue"];
      case UserRole.FINANCE:
        return ["canDisbursePayments", "canRetryPayments", "canViewAllPayments", "canAuditFinancials"];
      case UserRole.ADMIN:
        return [
          "canManageUsers",
          "canManageStaff",
          "canManagePolicies",
          "canReviewClaims",
          "canDisbursePayments",
          "canViewBlockchain",
          "canViewAuditLogs",
          "canSystemConfigure",
        ];
      default:
        return [];
    }
  }

  /**
   * Register a new user - STRICT: ALWAYS creates CUSTOMER only
   */
  public static async register(input: RegisterInput): Promise<{ user: User; token: string }> {
    const { fullName, email, password, phone, walletAddress } = input;

    if (!fullName || fullName.trim().length < 2) {
      throw new ValidationError("Full legal name is required (minimum 2 characters).");
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError("A valid email address is required.");
    }

    if (!password || password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existing = Array.from(db.getUsers().values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      throw new ConflictError("An account with this email address already exists.");
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = SecurityUtils.hashPassword(password);

    const newUser = {
      id: userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      phone: phone?.trim(),
      walletAddress: walletAddress?.trim(),
      role: UserRole.CUSTOMER, // HARD-CODED: No client role injection permitted
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString(),
      passwordHash,
    };

    db.getUsers().set(userId, newUser);

    // Audit log
    db.logAudit({
      actorId: userId,
      actorName: newUser.fullName,
      role: UserRole.CUSTOMER,
      action: AuditAction.LOGIN,
      entityType: "USER",
      entityId: userId,
      metadata: { action: "REGISTER" },
    });

    const token = `jwt_${userId}_${Date.now()}`;
    const { passwordHash: _, ...safeUser } = newUser;

    return {
      user: safeUser,
      token,
    };
  }

  /**
   * Authenticate user with password and return safe credentials
   */
  public static async login(
    emailInput: string,
    passwordInput: string,
    ipAddress: string = "127.0.0.1"
  ): Promise<LoginResult> {
    if (!emailInput || !passwordInput) {
      throw new ValidationError("Email and password are required.");
    }

    const email = emailInput.trim().toLowerCase();

    // Rate limiter: Max 5 attempts per minute per email
    if (!authRateLimiter.isAllowed(email, 5, 60000)) {
      throw new AppError("Too many login attempts. Please try again after 1 minute.", ErrorCode.RATE_LIMIT_EXCEEDED, 429);
    }

    const userEntry = Array.from(db.getUsers().values()).find(
      (u) => u.email.toLowerCase() === email
    );

    if (!userEntry) {
      throw new AuthenticationError("Invalid email or credentials.");
    }

    if (userEntry.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError("Account suspended. Please contact system administrator.");
    }

    const isValid = SecurityUtils.verifyPassword(passwordInput, userEntry.passwordHash);
    if (!isValid) {
      throw new AuthenticationError("Invalid email or credentials.");
    }

    // Reset rate limiter on successful authentication
    authRateLimiter.reset(email);

    const token = `jwt_${userEntry.id}_${Date.now()}`;
    const { passwordHash: _, ...safeUser } = userEntry;

    // Log audit
    db.logAudit({
      actorId: userEntry.id,
      actorName: userEntry.fullName,
      role: userEntry.role,
      action: AuditAction.LOGIN,
      entityType: "AUTH",
      entityId: userEntry.id,
      ipAddress,
    });

    return {
      user: safeUser,
      token,
      capabilities: this.getCapabilities(userEntry.role),
    };
  }

  /**
   * Resolve user from session token or cookies
   */
  public static resolveUser(token?: string, fallbackRole?: string): User | null {
    if (token) {
      const parts = token.split("_");
      const userId = parts[1];
      if (userId) {
        const u = db.getUsers().get(userId);
        if (u) {
          const { passwordHash: _, ...safe } = u;
          return safe;
        }
      }
    }

    if (fallbackRole) {
      const defaultUser = Array.from(db.getUsers().values()).find((u) => u.role === fallbackRole);
      if (defaultUser) {
        const { passwordHash: _, ...safe } = defaultUser;
        return safe;
      }
    }

    return null;
  }
}

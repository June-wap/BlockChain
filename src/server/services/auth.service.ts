import { UserRepository } from "../repositories/user.repository";
import { AuditRepository } from "../repositories/audit.repository";
import { dbConnection } from "../db/postgres";
import { AuditAction, User, UserRole, UserStatus } from "@/types";
import { SecurityUtils, authRateLimiter } from "../core/security";
import { JwtService } from "../core/jwt";
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
   * Register a new user - STRICT: ALWAYS creates CUSTOMER only.
   * Atomically persists to PostgreSQL with audit log.
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

    // Check duplicate email against authoritative PostgreSQL
    const existing = await UserRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError("An account with this email address already exists.");
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = SecurityUtils.hashPassword(password);
    const createdAt = new Date().toISOString();

    const newUserRecord = {
      id: userId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      phoneNumber: phone?.trim(),
      walletAddress: walletAddress?.trim(),
      role: UserRole.CUSTOMER, // HARD-CODED: No client role injection permitted
      status: UserStatus.ACTIVE,
      createdAt,
      passwordHash,
    };

    // Atomic SQL transaction for user insertion and initial audit log
    await dbConnection.transaction(async (client) => {
      await UserRepository.create(newUserRecord, client);

      await AuditRepository.create(
        {
          id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: createdAt,
          actorId: userId,
          actorName: newUserRecord.fullName,
          role: UserRole.CUSTOMER,
          action: AuditAction.LOGIN,
          entityType: "USER",
          entityId: userId,
          metadata: { action: "REGISTER" },
        },
        client
      );
    });

    const token = await JwtService.signToken({
      userId,
      email: normalizedEmail,
      role: UserRole.CUSTOMER,
      fullName: newUserRecord.fullName,
    });

    const safeUser: User = {
      id: userId,
      email: normalizedEmail,
      fullName: newUserRecord.fullName,
      role: UserRole.CUSTOMER,
      phoneNumber: newUserRecord.phoneNumber,
      walletAddress: newUserRecord.walletAddress,
      status: UserStatus.ACTIVE,
      createdAt,
    };

    return {
      user: safeUser,
      token,
    };
  }

  /**
   * Authenticate user with password against PostgreSQL and return safe credentials
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

    // Query authoritative database record
    const userEntry = await UserRepository.findByEmail(email);

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

    const token = await JwtService.signToken({
      userId: userEntry.id,
      email: userEntry.email,
      role: userEntry.role,
      fullName: userEntry.fullName,
    });

    const safeUser: User = {
      id: userEntry.id,
      email: userEntry.email,
      fullName: userEntry.fullName,
      role: userEntry.role,
      phoneNumber: userEntry.phoneNumber,
      walletAddress: userEntry.walletAddress,
      status: userEntry.status,
      createdAt: userEntry.createdAt,
    };

    // Log audit to PostgreSQL
    await AuditRepository.create({
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actorId: userEntry.id,
      actorName: userEntry.fullName,
      role: userEntry.role,
      action: AuditAction.LOGIN,
      entityType: "AUTH",
      entityId: userEntry.id,
      ipAddress,
    }).catch(() => {});

    return {
      user: safeUser,
      token,
      capabilities: this.getCapabilities(userEntry.role),
    };
  }

  /**
   * Resolve user from cryptographically verified session token.
   * Single source of truth: PostgreSQL dictates active status and current role.
   */
  public static async resolveUser(token?: string): Promise<User | null> {
    if (!token || typeof token !== "string") {
      return null;
    }

    const payload = await JwtService.verifyToken(token);
    if (!payload || !payload.userId) {
      return null;
    }

    // Always fetch live entity from PostgreSQL
    const userEntry = await UserRepository.findById(payload.userId);
    if (!userEntry) {
      return null;
    }

    // Suspended accounts immediately lose access
    if (userEntry.status === UserStatus.SUSPENDED) {
      return null;
    }

    return {
      id: userEntry.id,
      email: userEntry.email,
      fullName: userEntry.fullName,
      role: userEntry.role,
      phoneNumber: userEntry.phoneNumber,
      walletAddress: userEntry.walletAddress,
      status: userEntry.status,
      createdAt: userEntry.createdAt,
    };
  }
}

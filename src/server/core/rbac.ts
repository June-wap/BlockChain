import { User, UserRole } from "@/types";
import { ForbiddenError, AuthenticationError } from "./errors";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  role: UserRole;
  walletAddress?: string;
}

export class RbacGuard {
  /**
   * Asserts that an authenticated user exists and belongs to one of the authorized roles.
   */
  public static assertRole(user: AuthenticatedUser | null | undefined, allowedRoles: UserRole[]): AuthenticatedUser {
    if (!user) {
      throw new AuthenticationError("Authentication required.");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Access denied. Role '${user.role}' is not authorized to access this resource. Required roles: ${allowedRoles.join(", ")}`
      );
    }

    return user;
  }

  /**
   * Asserts IDOR protection: A CUSTOMER can only access resources belonging to themselves.
   * Reviewers, Finance, and Admins are permitted based on role scope.
   */
  public static assertOwnership(
    resourceOwnerId: string,
    user: AuthenticatedUser,
    options: {
      allowStaff?: boolean;
      allowAdmin?: boolean;
    } = { allowStaff: true, allowAdmin: true }
  ): void {
    if (user.role === UserRole.ADMIN && options.allowAdmin !== false) {
      return;
    }

    if (
      (user.role === UserRole.CLAIM_REVIEWER || user.role === UserRole.FINANCE) &&
      options.allowStaff !== false
    ) {
      return;
    }

    if (user.role === UserRole.CUSTOMER) {
      if (resourceOwnerId !== user.id) {
        throw new ForbiddenError("Forbidden: You do not have permission to access or modify this resource.");
      }
      return;
    }

    throw new ForbiddenError("Forbidden: Insufficient privileges.");
  }

  /**
   * Validates if a user can review or process a claim.
   */
  public static assertCanReviewClaims(user: AuthenticatedUser): void {
    this.assertRole(user, [UserRole.CLAIM_REVIEWER, UserRole.ADMIN]);
  }

  /**
   * Validates if a user can disburse or retry payments.
   */
  public static assertCanManagePayments(user: AuthenticatedUser): void {
    this.assertRole(user, [UserRole.FINANCE, UserRole.ADMIN]);
  }

  /**
   * Validates if a user can administer users, staff, or blockchain infrastructure.
   */
  public static assertCanAdministerSystem(user: AuthenticatedUser): void {
    this.assertRole(user, [UserRole.ADMIN]);
  }
}

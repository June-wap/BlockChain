import { NextResponse } from "next/server";

export enum ErrorCode {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  BLOCKCHAIN_ERROR = "BLOCKCHAIN_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.VALIDATION_FAILED, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required to access this resource.") {
    super(message, ErrorCode.UNAUTHENTICATED, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action.") {
    super(message, ErrorCode.FORBIDDEN, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string = "Resource", identifier?: string) {
    super(
      identifier ? `${entity} with identifier '${identifier}' was not found.` : `${entity} not found.`,
      ErrorCode.NOT_FOUND,
      404
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.CONFLICT, 409, details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.BUSINESS_RULE_VIOLATION, 422, details);
  }
}

export class BlockchainError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCode.BLOCKCHAIN_ERROR, 502, details);
  }
}

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    timestamp: string;
  };
}

export function apiSuccess<T>(data: T, meta?: Omit<StandardApiResponse["meta"], "timestamp">, statusCode: number = 200) {
  const body: StandardApiResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  };
  return NextResponse.json(body, { status: statusCode });
}

export function apiError(
  message: string,
  code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
  statusCode: number = 500,
  details?: unknown
) {
  const body: StandardApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  return NextResponse.json(body, { status: statusCode });
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return apiError(error.message, error.code, error.statusCode, error.details);
  }

  if (error instanceof Error) {
    // Check if error message indicates common domain errors
    if (error.message.startsWith("Forbidden")) {
      return apiError(error.message, ErrorCode.FORBIDDEN, 403);
    }
    if (error.message.includes("not found")) {
      return apiError(error.message, ErrorCode.NOT_FOUND, 404);
    }
    if (error.message.startsWith("Cannot") || error.message.includes("exceeds") || error.message.includes("Invalid state")) {
      return apiError(error.message, ErrorCode.BUSINESS_RULE_VIOLATION, 422);
    }
    return apiError(error.message, ErrorCode.INTERNAL_SERVER_ERROR, 500);
  }

  return apiError("An unexpected server error occurred.", ErrorCode.INTERNAL_SERVER_ERROR, 500);
}

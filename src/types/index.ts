/**
 * Insurance Claim Processing System - Shared Types & Enums
 */

// ==========================================
// ROLES & AUTH
// ==========================================
export enum UserRole {
  CUSTOMER = "CUSTOMER",
  CLAIM_REVIEWER = "CLAIM_REVIEWER",
  FINANCE = "FINANCE",
  ADMIN = "ADMIN",
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  walletAddress?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ==========================================
// POLICY
// ==========================================
export enum PolicyStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  SUSPENDED = "SUSPENDED",
}

export interface Policy {
  id: string;
  policyNumber: string;
  customerId: string;
  customerName?: string;
  type: string; // e.g., 'Health', 'Vehicle', 'Property', 'Life'
  coverageAmount: number;
  premiumAmount: number;
  startDate: string;
  endDate: string;
  status: PolicyStatus;
  termsUri?: string;
}

// ==========================================
// CLAIM
// ==========================================
export enum ClaimStatus {
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAID = "PAID",
}

export interface EvidenceItem {
  id: string;
  claimId: string;
  fileName: string;
  fileUrl: string;
  fileHash?: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  customerId: string;
  customerName?: string;
  requestedAmount: number;
  approvedAmount?: number;
  description: string;
  incidentDate: string;
  status: ClaimStatus;
  reviewNotes?: string;
  reviewerId?: string;
  blockchainTxHash?: string;
  createdAt: string;
  updatedAt: string;
  evidence?: EvidenceItem[];
}

// ==========================================
// PAYMENT
// ==========================================
export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REJECTED = "REJECTED",
}

export interface Payment {
  id: string;
  claimId: string;
  policyId: string;
  customerId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: "FIAT_BANK_TRANSFER" | "CRYPTO_SMART_CONTRACT";
  recipientWallet?: string;
  recipientBankAccount?: string;
  blockchainTxHash?: string;
  processedAt?: string;
  createdAt: string;
}

// ==========================================
// NAVIGATION & UI
// ==========================================
export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  badge?: string | number;
  roles?: UserRole[];
}

// ==========================================
// USER STATUS & DETAILS
// ==========================================
export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING = "PENDING",
}

// ==========================================
// POLICY COVERAGE DETAILS
// ==========================================
export interface CoverageItem {
  name: string;
  maxAmount: number;
  description: string;
}

export interface PolicyDetail extends Policy {
  policyHolder: string;
  coverages: CoverageItem[];
  deductible: number;
  termsAndConditions: string;
}

// ==========================================
// CLAIM REVIEW
// ==========================================
export interface ClaimReview {
  id: string;
  claimId: string;
  reviewerId: string;
  reviewerName?: string;
  decision: "APPROVED" | "REJECTED";
  approvedAmount?: number;
  reason?: string;
  notes?: string;
  createdAt: string;
}

// ==========================================
// NOTIFICATIONS
// ==========================================
export enum NotificationType {
  CLAIM_SUBMITTED = "CLAIM_SUBMITTED",
  CLAIM_UNDER_REVIEW = "CLAIM_UNDER_REVIEW",
  CLAIM_APPROVED = "CLAIM_APPROVED",
  CLAIM_REJECTED = "CLAIM_REJECTED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  POLICY_EXPIRING = "POLICY_EXPIRING",
  SECURITY_ALERT = "SECURITY_ALERT",
}

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}

// ==========================================
// BLOCKCHAIN TRANSACTIONS
// ==========================================
export enum BlockchainTxStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
}

export interface BlockchainTransaction {
  id: string;
  txHash: string;
  network: string;
  action: "CLAIM_RECORDED" | "CLAIM_APPROVED" | "CLAIM_REJECTED" | "PAYMENT_DISBURSED";
  claimId?: string;
  paymentId?: string;
  fromAddress: string;
  contractAddress: string;
  blockNumber: number;
  gasUsed: number;
  status: BlockchainTxStatus;
  confirmationCount: number;
  timestamp: string;
  errorMessage?: string;
}

// ==========================================
// AUDIT LOGS
// ==========================================
export enum AuditAction {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  POLICY_CREATED = "POLICY_CREATED",
  POLICY_UPDATED = "POLICY_UPDATED",
  POLICY_SUSPENDED = "POLICY_SUSPENDED",
  POLICY_CANCELLED = "POLICY_CANCELLED",
  CLAIM_CREATED = "CLAIM_CREATED",
  CLAIM_VIEWED = "CLAIM_VIEWED",
  CLAIM_REVIEW_STARTED = "CLAIM_REVIEW_STARTED",
  CLAIM_APPROVED = "CLAIM_APPROVED",
  CLAIM_REJECTED = "CLAIM_REJECTED",
  PAYMENT_STARTED = "PAYMENT_STARTED",
  PAYMENT_COMPLETED = "PAYMENT_COMPLETED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_RETRIED = "PAYMENT_RETRIED",
  USER_SUSPENDED = "USER_SUSPENDED",
  USER_ACTIVATED = "USER_ACTIVATED",
  ROLE_CHANGED = "ROLE_CHANGED",
  BLOCKCHAIN_TRANSACTION_SUBMITTED = "BLOCKCHAIN_TRANSACTION_SUBMITTED",
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  role: UserRole;
  action: AuditAction;
  entityType: "USER" | "POLICY" | "CLAIM" | "PAYMENT" | "BLOCKCHAIN" | "AUTH";
  entityId: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

// ==========================================
// API RESPONSE WRAPPER
// ==========================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  validationErrors?: Record<string, string>;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

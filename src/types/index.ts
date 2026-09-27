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

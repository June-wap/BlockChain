import { ClaimStatus, PolicyStatus, PaymentStatus, UserRole } from "@/types";

/**
 * Currency Formatting
 */
export function formatCurrency(
  amount: number,
  currency: "USD" | "VND" | "ETH" | "USDC" = "USD",
  locale: string = "en-US"
): string {
  if (isNaN(amount)) return "0";

  if (currency === "ETH") {
    return `${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ETH`;
  }

  if (currency === "USDC") {
    return `${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
  }

  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Date Formatting
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  options: {
    includeTime?: boolean;
    locale?: string;
  } = {}
): string {
  if (!dateInput) return "N/A";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Invalid date";

  const { includeTime = false, locale = "en-US" } = options;

  if (includeTime) {
    return date.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Relative time formatting (e.g. "2 hours ago", "yesterday")
 */
export function formatRelativeTime(
  dateInput: string | number | Date | null | undefined
): string {
  if (!dateInput) return "N/A";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Invalid date";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }

  return formatDate(date);
}

/**
 * Status Visual Configurations
 */
export interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
}

export function getClaimStatusConfig(status: ClaimStatus): StatusConfig {
  switch (status) {
    case ClaimStatus.SUBMITTED:
      return {
        label: "Submitted",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
        dotClass: "bg-blue-500",
        description: "Claim submitted and awaiting reviewer assignment.",
      };
    case ClaimStatus.UNDER_REVIEW:
      return {
        label: "Under Review",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
        description: "Claim is currently being assessed by insurance staff.",
      };
    case ClaimStatus.APPROVED:
      return {
        label: "Approved",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        dotClass: "bg-emerald-500",
        description: "Claim assessment approved. Ready for payment scheduling.",
      };
    case ClaimStatus.REJECTED:
      return {
        label: "Rejected",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
        dotClass: "bg-rose-500",
        description: "Claim rejected due to policy conditions or evidence mismatch.",
      };
    case ClaimStatus.PAYMENT_PENDING:
      return {
        label: "Payment Pending",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
        description: "Approved payment is queued for smart contract or bank disbursement.",
      };
    case ClaimStatus.PAID:
      return {
        label: "Paid",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        dotClass: "bg-emerald-600",
        description: "Funds disbursed successfully and confirmed on blockchain/receipt.",
      };
    default:
      return {
        label: status || "Unknown",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
        dotClass: "bg-slate-500",
        description: "Status unrecognized.",
      };
  }
}

export function getPolicyStatusConfig(status: PolicyStatus): StatusConfig {
  switch (status) {
    case PolicyStatus.ACTIVE:
      return {
        label: "Active",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        dotClass: "bg-emerald-500",
        description: "Policy is in effect and eligible for claims.",
      };
    case PolicyStatus.PENDING:
      return {
        label: "Pending",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
        description: "Policy application is undergoing underwriting.",
      };
    case PolicyStatus.EXPIRED:
      return {
        label: "Expired",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
        dotClass: "bg-slate-500",
        description: "Policy term has concluded.",
      };
    case PolicyStatus.CANCELLED:
      return {
        label: "Cancelled",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
        dotClass: "bg-rose-500",
        description: "Policy cancelled by customer or insurer.",
      };
    case PolicyStatus.SUSPENDED:
      return {
        label: "Suspended",
        badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
        dotClass: "bg-orange-500",
        description: "Policy temporarily suspended.",
      };
    default:
      return {
        label: status || "Unknown",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
        dotClass: "bg-slate-500",
        description: "Status unrecognized.",
      };
  }
}

export function getPaymentStatusConfig(status: PaymentStatus): StatusConfig {
  switch (status) {
    case PaymentStatus.PENDING:
      return {
        label: "Pending",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
        description: "Payment initiated and waiting execution.",
      };
    case PaymentStatus.PROCESSING:
      return {
        label: "Processing",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
        dotClass: "bg-blue-500",
        description: "Transaction submitted to blockchain or payment gateway.",
      };
    case PaymentStatus.SUCCESS:
      return {
        label: "Success",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        dotClass: "bg-emerald-500",
        description: "Payout confirmed successfully.",
      };
    case PaymentStatus.FAILED:
      return {
        label: "Failed",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
        dotClass: "bg-rose-500",
        description: "Transaction failed or reverted.",
      };
    case PaymentStatus.REJECTED:
      return {
        label: "Rejected",
        badgeClass: "bg-red-100 text-red-800 border-red-200",
        dotClass: "bg-red-500",
        description: "Payment declined by financial controller.",
      };
    default:
      return {
        label: status || "Unknown",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
        dotClass: "bg-slate-500",
        description: "Status unrecognized.",
      };
  }
}

export function getRoleConfig(role: UserRole): {
  label: string;
  badgeClass: string;
  description: string;
  defaultPath: string;
} {
  switch (role) {
    case UserRole.CUSTOMER:
      return {
        label: "Customer",
        badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
        description: "Insurance policyholder managing policies and claims.",
        defaultPath: "/customer/dashboard",
      };
    case UserRole.CLAIM_REVIEWER:
      return {
        label: "Claim Reviewer",
        badgeClass: "bg-violet-100 text-violet-800 border-violet-200",
        description: "Insurance staff assessing claims and evidence.",
        defaultPath: "/staff/dashboard",
      };
    case UserRole.FINANCE:
      return {
        label: "Finance Staff",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        description: "Financial officer executing and auditing payouts.",
        defaultPath: "/staff/dashboard",
      };
    case UserRole.ADMIN:
      return {
        label: "System Admin",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
        description: "Full system administration and blockchain governance.",
        defaultPath: "/admin/dashboard",
      };
    default:
      return {
        label: role,
        badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
        description: "User role.",
        defaultPath: "/",
      };
  }
}

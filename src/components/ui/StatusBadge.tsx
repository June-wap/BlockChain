import React from "react";
import { cn } from "@/lib/utils";
import { ClaimStatus, PolicyStatus, PaymentStatus, UserRole } from "@/types";

export interface StatusBadgeProps {
  status:
    | ClaimStatus
    | PolicyStatus
    | PaymentStatus
    | UserRole
    | string;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  dot = true,
  className,
}) => {
  // Strict status mapping requested by specification:
  // SUBMITTED → blue
  // UNDER_REVIEW → orange
  // APPROVED → green
  // REJECTED → red
  // PAYMENT_PENDING → orange
  // PAID → green
  const getClaimStyle = (claimStatus: string) => {
    switch (claimStatus) {
      case ClaimStatus.SUBMITTED:
      case "SUBMITTED":
        return {
          label: "Submitted",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
          dotClass: "bg-blue-600",
        };
      case ClaimStatus.UNDER_REVIEW:
      case "UNDER_REVIEW":
        return {
          label: "Under Review",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          dotClass: "bg-amber-500",
        };
      case ClaimStatus.APPROVED:
      case "APPROVED":
        return {
          label: "Approved",
          badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dotClass: "bg-emerald-600",
        };
      case ClaimStatus.REJECTED:
      case "REJECTED":
        return {
          label: "Rejected",
          badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
          dotClass: "bg-rose-600",
        };
      case ClaimStatus.PAYMENT_PENDING:
      case "PAYMENT_PENDING":
        return {
          label: "Payment Pending",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          dotClass: "bg-amber-500",
        };
      case ClaimStatus.PAID:
      case "PAID":
        return {
          label: "Paid",
          badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dotClass: "bg-emerald-600",
        };
      // Policy Status
      case PolicyStatus.ACTIVE:
      case "ACTIVE":
        return {
          label: "Active",
          badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dotClass: "bg-emerald-600",
        };
      case PolicyStatus.PENDING:
      case "PENDING":
        return {
          label: "Pending",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          dotClass: "bg-amber-500",
        };
      case PolicyStatus.EXPIRED:
      case "EXPIRED":
        return {
          label: "Expired",
          badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
          dotClass: "bg-slate-400",
        };
      case PolicyStatus.CANCELLED:
      case "CANCELLED":
        return {
          label: "Cancelled",
          badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
          dotClass: "bg-rose-600",
        };
      case PolicyStatus.SUSPENDED:
      case "SUSPENDED":
        return {
          label: "Suspended",
          badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
          dotClass: "bg-orange-500",
        };
      // Payment Status
      case PaymentStatus.SUCCESS:
      case "SUCCESS":
        return {
          label: "Success",
          badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dotClass: "bg-emerald-600",
        };
      case PaymentStatus.PROCESSING:
      case "PROCESSING":
        return {
          label: "Processing",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
          dotClass: "bg-blue-600",
        };
      case PaymentStatus.FAILED:
      case "FAILED":
        return {
          label: "Failed",
          badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
          dotClass: "bg-rose-600",
        };
      // Role Status
      case UserRole.CUSTOMER:
      case "CUSTOMER":
        return {
          label: "Customer",
          badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
          dotClass: "bg-sky-600",
        };
      case UserRole.CLAIM_REVIEWER:
      case "CLAIM_REVIEWER":
        return {
          label: "Claim Reviewer",
          badgeClass: "bg-violet-50 text-violet-800 border-violet-200",
          dotClass: "bg-violet-600",
        };
      case UserRole.FINANCE:
      case "FINANCE":
        return {
          label: "Finance Staff",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          dotClass: "bg-amber-600",
        };
      case UserRole.ADMIN:
      case "ADMIN":
        return {
          label: "Admin",
          badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
          dotClass: "bg-rose-600",
        };
      default:
        return {
          label: status,
          badgeClass: "bg-dark-100 text-dark-800 border-dark-200",
          dotClass: "bg-dark-500",
        };
    }
  };

  const { label, badgeClass, dotClass } = getClaimStyle(status);

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full border transition-colors select-none",
        badgeClass,
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />}
      <span>{label}</span>
    </span>
  );
};

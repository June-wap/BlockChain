"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate, getClaimStatusConfig } from "@/lib/formatters";
import { ClaimStatus } from "@/types";
import { FileCheck, ArrowUpRight, CheckCircle2, Clock, XCircle, DollarSign } from "lucide-react";

export default function StaffDashboardPage() {
  const { user } = useAuth();

  const reviewQueue = [
    {
      id: "clm-501",
      claimNumber: "CLM-2026-881",
      customerName: "Nguyen Van A",
      policyType: "Health Comprehensive",
      requestedAmount: 1850,
      status: ClaimStatus.SUBMITTED,
      submittedDate: "2026-09-26",
    },
    {
      id: "clm-503",
      claimNumber: "CLM-2026-904",
      customerName: "Tran Van Minh",
      policyType: "Motor Vehicle Premium",
      requestedAmount: 3400,
      status: ClaimStatus.UNDER_REVIEW,
      submittedDate: "2026-09-25",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="space-y-2 max-w-2xl">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 inline-block">
            Staff Operations Desk
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Review Desk: {user?.fullName || "Staff Member"}
          </h2>
          <p className="text-sm text-slate-300">
            Validate policy terms, inspect uploaded evidence hashes, and approve/reject claims with recorded justification.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/staff/claims"
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <FileCheck className="w-4 h-4" />
              Open Claims Queue
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Awaiting Assignment</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">12</h3>
          <p className="text-xs text-blue-600 font-medium mt-1">Submitted in last 24h</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Under Active Review</span>
            <FileCheck className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">5</h3>
          <p className="text-xs text-amber-600 font-medium mt-1">Requires evidence check</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Approved Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">8</h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">Total {formatCurrency(28400)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Payouts Pending</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">3</h3>
          <p className="text-xs text-indigo-600 font-medium mt-1">Ready for finance release</p>
        </div>
      </div>

      {/* Review Queue Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Priority Claims for Assessment</h3>
            <p className="text-xs text-slate-500">Click &apos;Review Claim&apos; to inspect evidence and execute determination</p>
          </div>
          <Link
            href="/staff/claims"
            className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1"
          >
            Full Queue
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {reviewQueue.map((item) => {
            const statusCfg = getClaimStatusConfig(item.status);
            return (
              <div
                key={item.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-900">
                      {item.claimNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.badgeClass}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                    <span>Applicant: <strong className="text-slate-700">{item.customerName}</strong></span>
                    <span>&middot;</span>
                    <span>Plan: {item.policyType}</span>
                    <span>&middot;</span>
                    <span>Submitted: {formatDate(item.submittedDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Claim Amount</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(item.requestedAmount)}
                    </span>
                  </div>
                  <Link
                    href={`/staff/claims/${item.id}/review`}
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs transition"
                  >
                    Review Claim
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

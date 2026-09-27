"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDate, getClaimStatusConfig, getPolicyStatusConfig } from "@/lib/formatters";
import { ClaimStatus, PolicyStatus } from "@/types";
import { ShieldCheck, PlusCircle, ArrowUpRight, Clock, AlertCircle } from "lucide-react";

export default function CustomerDashboardPage() {
  const { user } = useAuth();

  // Demonstration data showing use of shared types & formatters
  const samplePolicies = [
    {
      id: "pol-101",
      policyNumber: "POL-HLTH-2026-001",
      type: "Comprehensive Health",
      coverageAmount: 50000,
      status: PolicyStatus.ACTIVE,
      endDate: "2027-01-15",
    },
    {
      id: "pol-102",
      policyNumber: "POL-AUTO-2026-042",
      type: "Motor Vehicle Premium",
      coverageAmount: 25000,
      status: PolicyStatus.ACTIVE,
      endDate: "2026-12-31",
    },
  ];

  const sampleClaims = [
    {
      id: "clm-501",
      claimNumber: "CLM-2026-881",
      policyId: "pol-101",
      requestedAmount: 1850,
      status: ClaimStatus.UNDER_REVIEW,
      incidentDate: "2026-09-15",
    },
    {
      id: "clm-502",
      claimNumber: "CLM-2026-724",
      policyId: "pol-102",
      requestedAmount: 4200,
      status: ClaimStatus.PAYMENT_PENDING,
      incidentDate: "2026-08-20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-brand-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-brand-200 border border-white/10 inline-block">
            Customer Dashboard
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.fullName || "Policyholder"}
          </h2>
          <p className="text-sm text-slate-300">
            Monitor your policy coverages, submit evidence for claims, and receive automated smart contract claim disbursements.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/customer/claims/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              File New Claim
            </Link>
            <Link
              href="/customer/policies"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              View Policies
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Active Policies</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">2</h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Total coverage: {formatCurrency(75000)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Pending Claims</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">2</h3>
          <p className="text-xs text-amber-600 font-medium mt-1">
            1 Under Review &middot; 1 Payment Pending
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Disbursed Payouts</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(0)}</h3>
          <p className="text-xs text-slate-500 mt-1">Pending payout: {formatCurrency(4200)}</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policies List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">My Policies</h3>
            <Link
              href="/customer/policies"
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
            >
              See all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {samplePolicies.map((pol) => {
              const statusCfg = getPolicyStatusConfig(pol.status);
              return (
                <Link
                  key={pol.id}
                  href={`/customer/policies/${pol.id}`}
                  className="block p-4 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-slate-50/50 transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-slate-900 group-hover:text-brand-700">
                      {pol.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.badgeClass}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono">{pol.policyNumber}</span>
                    <span>Coverage: {formatCurrency(pol.coverageAmount)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Claims List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Recent Claims</h3>
            <Link
              href="/customer/claims"
              className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
            >
              See all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {sampleClaims.map((claim) => {
              const statusCfg = getClaimStatusConfig(claim.status);
              return (
                <Link
                  key={claim.id}
                  href={`/customer/claims/${claim.id}`}
                  className="block p-4 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-slate-50/50 transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-slate-900 group-hover:text-brand-700">
                      {claim.claimNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.badgeClass}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Incident: {formatDate(claim.incidentDate)}</span>
                    <span className="font-bold text-slate-800">
                      {formatCurrency(claim.requestedAmount)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

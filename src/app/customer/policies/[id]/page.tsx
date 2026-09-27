"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PolicyDetail, PolicyStatus } from "@/types";
import { fetchPolicyById } from "@/lib/api/policies";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Shield,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  User,
  PlusCircle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CustomerPolicyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const policyId = params?.id as string;

  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      if (!policyId) return;
      setIsLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        const data = await fetchPolicyById(policyId);
        setPolicy(data);
      } catch (err: any) {
        if (err.message.includes("403") || err.message.toLowerCase().includes("forbidden")) {
          setErrorStatus(403);
          setErrorMessage("Access Denied: You do not own this policy or have permission to view it.");
        } else if (err.message.includes("404") || err.message.toLowerCase().includes("not found")) {
          setErrorStatus(404);
          setErrorMessage("Policy Not Found: The requested policy number does not exist.");
        } else {
          setErrorStatus(500);
          setErrorMessage(err.message || "Failed to load policy details.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDetail();
  }, [policyId]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // 403 or 404 or Generic Error State
  if (errorStatus || !policy) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          {errorStatus === 403 ? <Lock className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {errorStatus === 403
            ? "Access Restricted (403)"
            : errorStatus === 404
            ? "Policy Not Found (404)"
            : "Unable to Load Policy"}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {errorMessage || "An error occurred while attempting to retrieve policy information."}
        </p>
        <div className="pt-4">
          <Link href="/customer/policies">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Policies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isEligibleForClaim = policy.status === PolicyStatus.ACTIVE;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Back button */}
      <div>
        <Link
          href="/customer/policies"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Policies List
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2.5 py-0.5 rounded-md border border-brand-200 dark:border-brand-800">
              {policy.policyNumber}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isEligibleForClaim
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              }`}
            >
              {policy.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {policy.type}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Policyholder: <strong className="font-medium text-slate-700 dark:text-slate-300">{policy.policyHolder}</strong>
          </p>
        </div>

        {/* CTA Button */}
        <div>
          {isEligibleForClaim ? (
            <Link href={`/customer/claims/new?policyId=${policy.id}`}>
              <Button variant="primary" size="md" className="w-full md:w-auto shadow-md">
                <PlusCircle className="w-4 h-4 mr-2" />
                Submit Claim Under This Policy
              </Button>
            </Link>
          ) : (
            <div className="text-right">
              <Button variant="secondary" size="md" disabled className="w-full md:w-auto opacity-60">
                Submit Claim Unavailable
              </Button>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Claims can only be submitted on ACTIVE policies
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3 Metric Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Total Coverage Limit</span>
            <Shield className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(policy.coverageAmount)}
          </p>
          <span className="text-[11px] text-slate-400">Max indemnity payable</span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Annual Premium</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(policy.premiumAmount)}
          </p>
          <span className="text-[11px] text-slate-400">Billed annually</span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Coverage Window</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
            {formatDate(policy.startDate)}
          </p>
          <span className="text-[11px] text-slate-400">Through {formatDate(policy.endDate)}</span>
        </div>
      </div>

      {/* Coverage Breakdown Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Coverage Items & Sub-limits
        </h2>

        {policy.coverages && policy.coverages.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {policy.coverages.map((item, idx) => (
              <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">{item.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                </div>
                <div className="text-right sm:shrink-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Up to {formatCurrency(item.maxAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Standard full coverage under comprehensive policy terms.</p>
        )}
      </div>

      {/* Policy Terms & Conditions */}
      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
          <FileText className="w-4 h-4 text-slate-500" />
          Terms & Conditions Summary
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {policy.termsAndConditions ||
            "Claims filed under this policy are evaluated against documented evidence and verified on the blockchain ledger upon official settlement approval."}
        </p>
        {policy.termsUri && (
          <div className="pt-2">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5">
              <span>Smart Contract Verified Terms:</span>
              <span className="text-brand-600 dark:text-brand-400">{policy.termsUri}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

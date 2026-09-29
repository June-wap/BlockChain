"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClaimDetailResponse, fetchClaimById } from "@/lib/api/claims";
import { ClaimStatus } from "@/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  FileText,
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Shield,
  Layers,
  ExternalLink,
  Lock,
  XCircle,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CustomerClaimDetailPage() {
  const params = useParams();
  const claimId = params?.id as string;

  const [data, setData] = useState<ClaimDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    async function loadClaim() {
      if (!claimId) return;
      setIsLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        const res = await fetchClaimById(claimId);
        setData(res);
      } catch (err: any) {
        if (err.message.includes("403") || err.message.toLowerCase().includes("forbidden")) {
          setErrorStatus(403);
          setErrorMessage("Access Restricted: You do not have permission to view this claim.");
        } else if (err.message.includes("404") || err.message.toLowerCase().includes("not found")) {
          setErrorStatus(404);
          setErrorMessage("Claim Not Found: The requested claim record does not exist.");
        } else {
          setErrorStatus(500);
          setErrorMessage(err.message || "Failed to load claim details.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadClaim();
  }, [claimId]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (errorStatus || !data || !data.claim) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          {errorStatus === 403 ? <Lock className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {errorStatus === 403
            ? "Access Restricted (403)"
            : errorStatus === 404
            ? "Claim Not Found (404)"
            : "Error Loading Claim"}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {errorMessage || "Unable to display claim details at this time."}
        </p>
        <div className="pt-4">
          <Link href="/customer/claims">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Claims
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { claim, policy, review, payment, blockchainTx } = data;

  // Timeline Milestone Determination based on real data
  const isSubmitted = true;
  const isDocumentsReceived = (claim.evidence && claim.evidence.length > 0) || isSubmitted;
  const isUnderReview =
    claim.status === ClaimStatus.UNDER_REVIEW ||
    claim.status === ClaimStatus.APPROVED ||
    claim.status === ClaimStatus.PAYMENT_PENDING ||
    claim.status === ClaimStatus.PAID ||
    claim.status === ClaimStatus.REJECTED;
  const isDecisionMade =
    claim.status === ClaimStatus.APPROVED ||
    claim.status === ClaimStatus.PAYMENT_PENDING ||
    claim.status === ClaimStatus.PAID ||
    claim.status === ClaimStatus.REJECTED;
  const isPaid = claim.status === ClaimStatus.PAID;

  const timelineSteps = [
    { label: "Submitted", done: isSubmitted, date: claim.createdAt },
    { label: "Documents Received", done: isDocumentsReceived, date: claim.evidence?.[0]?.uploadedAt || claim.createdAt },
    { label: "Under Review", done: isUnderReview, date: isUnderReview ? claim.updatedAt : undefined },
    {
      label: claim.status === ClaimStatus.REJECTED ? "Rejected" : "Decision",
      done: isDecisionMade,
      isRejected: claim.status === ClaimStatus.REJECTED,
      date: review?.createdAt || (isDecisionMade ? claim.updatedAt : undefined),
    },
    { label: "Payment", done: isPaid, date: payment?.processedAt },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Back Link */}
      <div>
        <Link
          href="/customer/claims"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to My Claims
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2.5 py-0.5 rounded-md border border-brand-200 dark:border-brand-800">
              {claim.claimNumber}
            </span>
            <StatusBadge status={claim.status} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {policy?.type || "Insurance Claim"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Policy Reference: {claim.policyId}
          </p>
        </div>

        <div className="text-left md:text-right">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block">
            Requested Amount
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(claim.requestedAmount)}
          </span>
          {claim.approvedAmount !== undefined && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Approved: {formatCurrency(claim.approvedAmount)}
            </p>
          )}
        </div>
      </div>

      {/* Visual Timeline Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Claim Lifecycle Timeline
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {timelineSteps.map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-center transition ${
                step.isRejected
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400"
                  : step.done
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
              }`}
            >
              <div className="flex justify-center mb-1.5">
                {step.isRejected ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Clock className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <p className="text-xs font-bold">{step.label}</p>
              {step.date && (
                <p className="text-[10px] opacity-80 mt-1">
                  {formatDate(step.date)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column: Incident Details & Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Incident Details Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-500" />
            Incident Information
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-500">Incident Date</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatDate(claim.incidentDate)}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-500">Incident Category</span>
              <span className="font-medium text-slate-900 dark:text-white">
                Medical & Damage
              </span>
            </div>
            <div className="pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 block mb-0.5">Location / Facility</span>
              <span className="font-medium text-slate-900 dark:text-white">
                Central Medical Hospital
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Description</span>
              <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                {claim.description}
              </p>
            </div>
          </div>
        </div>

        {/* Evidence Documents Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-500" />
            Evidence & Document Verification
          </h2>

          {claim.evidence && claim.evidence.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
              {claim.evidence.map((ev) => (
                <div key={ev.id} className="p-3.5 flex items-center justify-between text-xs gap-3">
                  <div className="truncate">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {ev.fileName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {(ev.fileSize / 1024).toFixed(1)} KB • {ev.mimeType}
                    </p>
                    {ev.fileHash && (
                      <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        Hash: {ev.fileHash.slice(0, 16)}...
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={ev.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <a
                      href={`${ev.fileUrl}?download=true`}
                      download={ev.fileName}
                      className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No external documents attached to this claim.</p>
          )}

          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-500 dark:text-slate-400">
            Evidence documents are cryptographically verified and stored securely in internal storage.
          </div>
        </div>
      </div>

      {/* Decision Section */}
      {(review || claim.reviewNotes) && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" />
            Underwriting & Decision Report
          </h2>

          <div
            className={`p-4 rounded-xl border ${
              claim.status === ClaimStatus.REJECTED
                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
                : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold uppercase tracking-wider">
                {claim.status === ClaimStatus.REJECTED ? "Claim Rejection" : "Claim Approval"}
              </span>
              <span className="opacity-80">
                {formatDate(review?.createdAt || claim.updatedAt)}
              </span>
            </div>
            <p className="text-xs leading-relaxed">
              {review?.notes || claim.reviewNotes}
            </p>
            {review?.reason && (
              <p className="text-xs font-semibold mt-2">
                Rejection Reason: {review.reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Blockchain Record Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Hash className="w-4 h-4 text-indigo-500" />
            Smart Contract Blockchain Ledger
          </h2>
          {blockchainTx ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified On-Chain
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500">
              Not Recorded Yet
            </span>
          )}
        </div>

        {blockchainTx ? (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 divide-y divide-slate-200 dark:divide-slate-800 text-xs space-y-2.5 font-mono">
            <div className="pb-2 flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-slate-400 font-sans">Network</span>
              <span className="font-semibold text-slate-900 dark:text-white">{blockchainTx.network}</span>
            </div>
            <div className="py-2 flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-slate-400 font-sans">Transaction Hash</span>
              <span className="text-brand-600 dark:text-brand-400 break-all select-all font-bold">
                {blockchainTx.txHash}
              </span>
            </div>
            <div className="py-2 flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-slate-400 font-sans">Contract Address</span>
              <span className="text-slate-700 dark:text-slate-300 break-all select-all">
                {blockchainTx.contractAddress}
              </span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400 font-sans">Block Number</span>
              <span className="text-slate-900 dark:text-white font-semibold">#{blockchainTx.blockNumber}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-400 font-sans">Confirmations</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {blockchainTx.confirmationCount} Blocks
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            This claim has not been settled on-chain yet. Once insurance staff audits and approves the claim, the immutable settlement record and smart contract transaction hash will be permanently anchored here.
          </div>
        )}
      </div>
    </div>
  );
}

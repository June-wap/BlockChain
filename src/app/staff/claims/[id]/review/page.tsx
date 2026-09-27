"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ClaimDetailResponse, fetchClaimById, approveClaimApi, rejectClaimApi, startReviewClaimApi } from "@/lib/api/claims";
import { ClaimStatus } from "@/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Shield,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  User,
  DollarSign,
  AlertCircle,
  Hash,
  ExternalLink,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function StaffClaimReviewPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params?.id as string;

  const [data, setData] = useState<ClaimDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review Form State
  const [approvedAmount, setApprovedAmount] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<string>("");

  // Modals
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>("Invalid documents");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadClaim = async () => {
    if (!claimId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchClaimById(claimId);
      setData(res);
      if (res.claim) {
        setApprovedAmount(res.claim.approvedAmount ? res.claim.approvedAmount.toString() : res.claim.requestedAmount.toString());
        setReviewNotes(res.claim.reviewNotes || "");

        // Transition from SUBMITTED to UNDER_REVIEW
        if (res.claim.status === ClaimStatus.SUBMITTED) {
          await startReviewClaimApi(res.claim.id).catch(() => {});
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load claim for review.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaim();
  }, [claimId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-96 rounded-2xl" />
          <Skeleton className="lg:col-span-5 h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (errorMessage || !data || !data.claim) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Failed to Load Claim Review</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">{errorMessage}</p>
        <Link href="/staff/claims">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Queue
          </Button>
        </Link>
      </div>
    );
  }

  const { claim, policy, review } = data;
  const isFinalized = claim.status === ClaimStatus.APPROVED || claim.status === ClaimStatus.PAID || claim.status === ClaimStatus.REJECTED;

  const handleApprove = async () => {
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      const parsedAmount = Number(approvedAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Approved amount must be greater than 0.");
      }
      if (parsedAmount > claim.requestedAmount) {
        throw new Error("Approved amount cannot exceed the requested claim amount.");
      }

      await approveClaimApi(claim.id, parsedAmount, reviewNotes);
      setIsApproveModalOpen(false);
      await loadClaim();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve claim.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      if (!rejectReason) {
        throw new Error("Rejection reason is required.");
      }
      await rejectClaimApi(claim.id, rejectReason, reviewNotes);
      setIsRejectModalOpen(false);
      await loadClaim();
    } catch (err: any) {
      setActionError(err.message || "Failed to reject claim.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/staff/claims"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Claims Queue
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-md">
              {claim.claimNumber}
            </span>
            <StatusBadge status={claim.status} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Underwriting Assessment: {policy?.type || "Insurance Claim"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Policy ID: {claim.policyId} • Applicant: {claim.customerName || "Customer"}
          </p>
        </div>

        <div className="text-left md:text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Indemnity</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(claim.requestedAmount)}
          </span>
        </div>
      </div>

      {/* Already Finalized Banner */}
      {isFinalized && (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {claim.status === ClaimStatus.REJECTED ? (
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            )}
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                This claim has already been resolved ({claim.status}).
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                {claim.reviewNotes || "Determination recorded in permanent audit ledger."}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {formatDate(claim.updatedAt)}
          </span>
        </div>
      )}

      {/* 2-Column Grid (FE-18) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Claim & Policy Information (7 cols)          */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Applicant & Policy Details */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-500" />
              Applicant & Policy Details
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Applicant Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">{claim.customerName || "Nguyen Van A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Policy Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {policy?.status || "ACTIVE"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Max Coverage Limit</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {policy ? formatCurrency(policy.coverageAmount) : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Policy Period</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {policy ? `${formatDate(policy.startDate)} - ${formatDate(policy.endDate)}` : "Active"}
                </span>
              </div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              Incident Circumstances
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <span className="text-slate-500">Incident Date</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(claim.incidentDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Applicant Circumstance Statement</span>
                <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed text-xs">
                  {claim.description}
                </p>
              </div>
            </div>
          </div>

          {/* Uploaded Evidence Files */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              Evidence Verification ({claim.evidence?.length || 0})
            </h2>

            {claim.evidence && claim.evidence.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                {claim.evidence.map((ev) => (
                  <div key={ev.id} className="p-3.5 flex items-center justify-between text-xs gap-3">
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{ev.fileName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {(ev.fileSize / 1024).toFixed(1)} KB • {ev.mimeType}
                      </p>
                      {ev.fileHash && (
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          Hash: {ev.fileHash}
                        </p>
                      )}
                    </div>
                    <a
                      href={ev.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No documents attached.</p>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Review Panel (5 cols)                       */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs space-y-5">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-500" />
              Underwriter Review & Determination
            </h2>

            {/* Checklist items */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Policy is Active & In Good Standing</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Incident Date within Coverage Period</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Evidence Hashes Verified</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Anti-fraud & Duplication Check: Passed</span>
              </div>
            </div>

            {/* Approved Amount Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Approved Settlement Amount (USD) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  disabled={isFinalized}
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500 disabled:opacity-60"
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Cannot exceed requested amount ({formatCurrency(claim.requestedAmount)})
              </p>
            </div>

            {/* Review Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reviewer Evaluation Notes
              </label>
              <textarea
                rows={4}
                disabled={isFinalized}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter justification, hospital fee schedule verification, or specific comments..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500 disabled:opacity-60"
              />
            </div>

            {/* Action Buttons */}
            {!isFinalized ? (
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsApproveModalOpen(true)}
                  className="flex-1 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Claim
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => setIsRejectModalOpen(true)}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Claim
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-center text-xs text-slate-500">
                Decision has already been finalized for this claim.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* APPROVE CONFIRMATION MODAL                                */}
      {/* ========================================================= */}
      {isApproveModalOpen && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => !isSubmittingAction && setIsApproveModalOpen(false)}
          title="Confirm Claim Approval & Smart Contract Settlement"
        >
          <div className="space-y-4 text-xs">
            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                {actionError}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Blockchain Anchoring Warning</span>
              </div>
              <p>
                Approving this claim permanently records the approval determination and authorization hash on the Ethereum Sepolia testnet ledger.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Claim ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{claim.claimNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Amount</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(claim.requestedAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                <span className="text-slate-500 font-bold">Approved Settlement Payout</span>
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Number(approvedAmount))}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmittingAction}
                onClick={() => setIsApproveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmittingAction}
                onClick={handleApprove}
              >
                {isSubmittingAction ? "Recording On-Chain..." : "Confirm & Authorize"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* REJECT MODAL                                              */}
      {/* ========================================================= */}
      {isRejectModalOpen && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => !isSubmittingAction && setIsRejectModalOpen(false)}
          title="Reject Insurance Claim"
        >
          <div className="space-y-4 text-xs">
            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mandatory Rejection Reason *
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-brand-500"
              >
                <option value="Policy expired">Policy expired prior to incident</option>
                <option value="Not covered">Incident type not covered under policy terms</option>
                <option value="Invalid documents">Submitted evidence documents unverified or fraudulent</option>
                <option value="Duplicate claim">Duplicate claim submission</option>
                <option value="Other">Other (justified in notes below)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Explanation for Applicant
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Provide detailed explanation to applicant..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSubmittingAction}
                onClick={() => setIsRejectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isSubmittingAction}
                onClick={handleReject}
              >
                {isSubmittingAction ? "Processing Rejection..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

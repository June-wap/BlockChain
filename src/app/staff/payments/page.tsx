"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Payment, PaymentStatus, UserRole } from "@/types";
import { fetchPayments, disbursePaymentApi, retryPaymentApi } from "@/lib/api/payments";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Coins,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function StaffPaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Disbursement Modal
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isFinanceAuthorized = user?.role === UserRole.FINANCE || user?.role === UserRole.ADMIN;

  const loadPayments = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPayments(selectedStatus);
      setPayments(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load staff payments list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [selectedStatus]);

  const handleDisburse = async () => {
    if (!activePayment) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await disbursePaymentApi(activePayment.id);
      setActivePayment(null);
      await loadPayments();
    } catch (err: any) {
      setActionError(err.message || "Failed to disburse payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async (paymentId: string) => {
    setIsLoading(true);
    try {
      await retryPaymentApi(paymentId);
      await loadPayments();
    } catch (err: any) {
      alert(err.message || "Failed to retry payment.");
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.SUCCESS:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            PAID
          </span>
        );
      case PaymentStatus.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            PROCESSING
          </span>
        );
      case PaymentStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
      case PaymentStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      default:
        return <span className="text-xs font-semibold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Payout Disbursements & Settlements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Finance desk queue for executing smart contract payouts on approved insurance claims
          </p>
        </div>

        {!isFinanceAuthorized && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>View-only mode: Payout actions require FINANCE role.</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["ALL", PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.SUCCESS, PaymentStatus.FAILED].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedStatus === s
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {s === "ALL" ? "All Queue" : s === "SUCCESS" ? "PAID" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadPayments}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Table & Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          title="No disbursements found"
          description="There are currently no claims queued for payout."
          icon="Coins"
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Claim</th>
                  <th className="py-3 px-4">Approved Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recipient Wallet</th>
                  <th className="py-3 px-4">Blockchain TX</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {p.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-brand-600 dark:text-brand-400">
                      {p.claimId}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {p.recipientWallet ? `${p.recipientWallet.slice(0, 8)}...${p.recipientWallet.slice(-6)}` : "Fiat Transfer"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {p.blockchainTxHash ? (
                        <span className="text-brand-600 dark:text-brand-400 font-bold">
                          {p.blockchainTxHash.slice(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === PaymentStatus.PENDING && isFinanceAuthorized && (
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => setActivePayment(p)}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Disburse
                        </Button>
                      )}
                      {p.status === PaymentStatus.FAILED && isFinanceAuthorized && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleRetry(p.id)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                      )}
                      {p.status === PaymentStatus.SUCCESS && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {p.id}
                    </span>
                    <p className="text-[11px] text-brand-600 dark:text-brand-400 font-mono">
                      Claim: {p.claimId}
                    </p>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Approved Amount
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Wallet
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {p.recipientWallet ? `${p.recipientWallet.slice(0, 6)}...` : "Fiat"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  {p.status === PaymentStatus.PENDING && isFinanceAuthorized && (
                    <Button
                      variant="primary"
                      size="xs"
                      className="w-full"
                      onClick={() => setActivePayment(p)}
                    >
                      <Zap className="w-3.5 h-3.5 mr-1" />
                      Disburse Payment Now
                    </Button>
                  )}
                  {p.status === PaymentStatus.FAILED && isFinanceAuthorized && (
                    <Button
                      variant="secondary"
                      size="xs"
                      className="w-full"
                      onClick={() => handleRetry(p.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Retry Disbursement
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disburse Confirmation Modal */}
      {activePayment && (
        <Modal
          isOpen={!!activePayment}
          onClose={() => !isProcessing && setActivePayment(null)}
          title="Authorize Smart Contract Payout"
        >
          <div className="space-y-4 text-xs">
            {actionError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400">
                {actionError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment ID</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{activePayment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Claim</span>
                <span className="font-mono text-slate-900 dark:text-white">{activePayment.claimId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination Wallet</span>
                <span className="font-mono text-brand-600 dark:text-brand-400 break-all">
                  {activePayment.recipientWallet}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2">
                <span className="text-slate-500 font-bold">Disbursement Amount</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(activePayment.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Demo settlement conversion</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {(activePayment.amount / (Number(process.env.NEXT_PUBLIC_DEMO_USD_PER_ETH) || 1000)).toFixed(4)} ETH
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Blockchain Network</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {process.env.NEXT_PUBLIC_BLOCKCHAIN_CHAIN_ID === "31337" || !process.env.NEXT_PUBLIC_BLOCKCHAIN_CHAIN_ID
                    ? "Hardhat Local (Chain 31337)"
                    : "Ethereum Sepolia (Chain 11155111)"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300">
              <ShieldCheck className="w-4 h-4 inline mr-1.5" />
              Double-payment protection is actively enforced by smart contract nonce and database idempotency guards.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessing}
                onClick={() => setActivePayment(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isProcessing}
                onClick={handleDisburse}
              >
                {isProcessing ? "Releasing Payout..." : "Confirm & Execute Payout"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

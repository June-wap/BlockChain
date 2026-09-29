"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Payment, PaymentStatus } from "@/types";
import { fetchPayments } from "@/lib/api/payments";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  CreditCard,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal State
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  const loadPayments = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPayments(selectedStatus);
      setPayments(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load payments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [selectedStatus]);

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
            Payouts & Disbursements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review disbursements for approved claims, verified on the blockchain ledger
          </p>
        </div>
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
              {s === "ALL" ? "All Payments" : s === "SUCCESS" ? "PAID" : s}
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

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800"
            >
              <Skeleton className="h-5 w-40 mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payment records found"
          description={
            selectedStatus !== "ALL"
              ? `You currently do not have any disbursements with status '${selectedStatus}'.`
              : "Disbursements will appear here as soon as approved claims are scheduled for payment."
          }
          icon="CreditCard"
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Related Claim</th>
                  <th className="py-3 px-4">Approved Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Disbursed Date</th>
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
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {p.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-brand-600 dark:text-brand-400 hover:underline">
                      <Link href={`/customer/claims/${p.claimId}`}>
                        {p.claimId}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {p.processedAt ? formatDate(p.processedAt) : "Pending Review"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {p.blockchainTxHash ? (
                        <span className="text-brand-600 dark:text-brand-400 font-bold">
                          {p.blockchainTxHash.slice(0, 10)}...{p.blockchainTxHash.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not Disbursed</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setActivePayment(p)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>
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
                    <Link
                      href={`/customer/claims/${p.claimId}`}
                      className="block text-[11px] text-brand-600 dark:text-brand-400 font-mono mt-0.5 hover:underline"
                    >
                      Claim: {p.claimId}
                    </Link>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Amount
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">
                      Date
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {p.processedAt ? formatDate(p.processedAt) : "Pending"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <Button
                    variant="secondary"
                    size="xs"
                    className="w-full"
                    onClick={() => setActivePayment(p)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View Payment Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {activePayment && (
        <Modal
          isOpen={!!activePayment}
          onClose={() => setActivePayment(null)}
          title={`Payment Breakdown #${activePayment.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Status</span>
              <span>{getStatusBadge(activePayment.status)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Claim Reference</span>
              <span className="font-mono font-medium text-brand-600 dark:text-brand-400">
                {activePayment.claimId}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Approved Settlement Amount</span>
              <span className="text-base font-bold text-slate-900 dark:text-white text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activePayment.amount)}
              </span>
            </div>
            {(activePayment.paymentMethod === "CRYPTO_SMART_CONTRACT" || !!activePayment.recipientWallet) && (
              <>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Demo settlement conversion</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {(activePayment.amount / (Number(process.env.NEXT_PUBLIC_DEMO_USD_PER_ETH) || 1000)).toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Blockchain Network</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {process.env.NEXT_PUBLIC_BLOCKCHAIN_CHAIN_ID === "31337" || !process.env.NEXT_PUBLIC_BLOCKCHAIN_CHAIN_ID
                      ? "Hardhat Local (Chain 31337)"
                      : "Ethereum Sepolia (Chain 11155111)"}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Disbursement Method</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {activePayment.paymentMethod === "CRYPTO_SMART_CONTRACT"
                  ? "EVM Smart Contract Escrow"
                  : "Bank Electronic Transfer"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Created Timestamp</span>
              <span className="text-slate-700 dark:text-slate-300">
                {formatDate(activePayment.createdAt)}
              </span>
            </div>
            {activePayment.processedAt && (
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Processed / Paid Timestamp</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {formatDate(activePayment.processedAt)}
                </span>
              </div>
            )}
            {activePayment.recipientWallet && (
              <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block mb-1">Destination Web3 Wallet</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 p-2 rounded block break-all">
                  {activePayment.recipientWallet}
                </span>
              </div>
            )}
            {activePayment.blockchainTxHash && (
              <div>
                <span className="text-slate-500 block mb-1">Smart Contract Tx Hash</span>
                <span className="font-mono text-brand-600 dark:text-brand-400 bg-slate-100 dark:bg-slate-900 p-2 rounded block break-all font-bold">
                  {activePayment.blockchainTxHash}
                </span>
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setActivePayment(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

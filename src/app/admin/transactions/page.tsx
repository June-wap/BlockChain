"use client";

import React, { useEffect, useState } from "react";
import { BlockchainTransaction } from "@/types";
import { fetchBlockchainTransactions } from "@/lib/api/admin";
import { formatDate } from "@/lib/formatters";
import {
  Layers,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal
  const [activeTx, setActiveTx] = useState<BlockchainTransaction | null>(null);

  const loadTransactions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchBlockchainTransactions(searchQuery);
      setTransactions(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTransactions();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          On-Chain Blockchain Transactions Ledger
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cryptographically signed records for claim registrations, approvals, and payout disbursements
        </p>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
        <form onSubmit={handleSearch} className="relative sm:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Tx Hash, Claim ID, Action..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadTransactions}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Try modifying search keywords."
          icon="Layers"
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-sans font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tx Hash</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Claim Reference</th>
                <th className="py-3 px-4">From (Signer)</th>
                <th className="py-3 px-4">Block</th>
                <th className="py-3 px-4">Gas Used</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right font-sans">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {transactions.map((tx) => (
                <tr
                  key={tx.id || tx.txHash}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                >
                  <td className="py-3 px-4 font-bold text-brand-600 dark:text-brand-400">
                    {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
                  </td>
                  <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                    {tx.action}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {tx.claimId || "—"}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {tx.fromAddress.slice(0, 8)}...
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    #{tx.blockNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {tx.gasUsed.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500 dark:text-slate-400">
                    {formatDate(tx.timestamp)}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setActiveTx(tx)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Detail Modal (FE-27) */}
      {activeTx && (
        <Modal
          isOpen={!!activeTx}
          onClose={() => setActiveTx(null)}
          title="On-Chain Transaction Details"
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-sans block text-[11px] mb-1">Transaction Hash</span>
              <span className="text-brand-600 dark:text-brand-400 break-all select-all font-bold">
                {activeTx.txHash}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200 dark:border-slate-700 font-sans">
              <div>
                <span className="text-slate-500 block text-[11px]">Network</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeTx.network}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Block Number</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">#{activeTx.blockNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Status</span>
                <span className="text-emerald-600 font-bold">{activeTx.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Confirmations</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {activeTx.confirmationCount} Blocks
                </span>
              </div>
            </div>

            <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-sans block text-[11px] mb-1">Signer / From Address</span>
              <span className="text-slate-800 dark:text-slate-200 break-all">{activeTx.fromAddress}</span>
            </div>

            <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-sans block text-[11px] mb-1">Contract Address</span>
              <span className="text-slate-800 dark:text-slate-200 break-all">{activeTx.contractAddress}</span>
            </div>

            <div className="pb-2 border-b border-slate-200 dark:border-slate-700 font-sans flex justify-between">
              <span className="text-slate-500">Gas Consumed</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {activeTx.gasUsed.toLocaleString()} units
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setActiveTx(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

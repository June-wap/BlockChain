"use client";

import React, { useEffect, useState } from "react";
import { AuditLog } from "@/types";
import { fetchAuditLogs } from "@/lib/api/admin";
import { formatDate } from "@/lib/formatters";
import {
  Activity,
  Search,
  AlertTriangle,
  RefreshCw,
  Eye,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detail Modal
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAuditLogs({
        entity: selectedEntity,
        search: searchQuery,
      });
      setLogs(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load audit logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedEntity]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionBadge = (action: string) => {
    if (action.includes("APPROVED") || action.includes("COMPLETED")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {action}
        </span>
      );
    }
    if (action.includes("REJECTED") || action.includes("SUSPENDED")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Security & Regulatory Audit Logs
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Append-only, immutable record of user authorizations, claims determinations, and on-chain interactions
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["ALL", "CLAIM", "PAYMENT", "POLICY", "USER", "AUTH"].map((ent) => (
              <button
                key={ent}
                onClick={() => setSelectedEntity(ent)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedEntity === ent
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {ent === "ALL" ? "All Entities" : ent}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actor, action, entity..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadLogs}>
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
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit logs found"
          description="Try changing the entity filter or search keyword."
          icon="Activity"
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Security Role</th>
                <th className="py-3 px-4">Audit Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4 text-right">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                >
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {log.actorName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {log.entityType}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {log.entityId}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setActiveLog(log)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Detail Modal (FE-28: Never exposes passwords or secret tokens) */}
      {activeLog && (
        <Modal
          isOpen={!!activeLog}
          onClose={() => setActiveLog(null)}
          title={`Audit Event #${activeLog.id}`}
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700 font-sans">
              <span className="text-slate-500">Timestamp</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">{formatDate(activeLog.timestamp)}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700 font-sans">
              <span className="text-slate-500">Actor</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {activeLog.actorName} ({activeLog.role})
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700 font-sans">
              <span className="text-slate-500">Action</span>
              <span className="font-bold">{activeLog.action}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700 font-sans">
              <span className="text-slate-500">Target Entity</span>
              <span>
                {activeLog.entityType} #{activeLog.entityId}
              </span>
            </div>
            {activeLog.ipAddress && (
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700 font-sans">
                <span className="text-slate-500">IP Address</span>
                <span>{activeLog.ipAddress}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500 font-sans block mb-1">Sanitized Event Metadata</span>
              <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto text-[11px] text-slate-800 dark:text-slate-200">
                {JSON.stringify(activeLog.metadata || {}, null, 2)}
              </pre>
            </div>
            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setActiveLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

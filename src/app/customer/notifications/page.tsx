"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SystemNotification, NotificationType } from "@/types";
import { fetchNotifications, markNotificationReadApi } from "@/lib/api/notifications";
import { formatDate } from "@/lib/formatters";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  XCircle,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotifs = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchNotifications();
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkOne = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markNotificationReadApi(undefined, true);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.CLAIM_APPROVED:
      case NotificationType.PAYMENT_SUCCESS:
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case NotificationType.CLAIM_REJECTED:
      case NotificationType.PAYMENT_FAILED:
        return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case NotificationType.CLAIM_UNDER_REVIEW:
        return <Clock className="w-5 h-5 text-amber-500 shrink-0" />;
      case NotificationType.PAYMENT_PENDING:
        return <CreditCard className="w-5 h-5 text-blue-500 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-brand-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Notifications & Alerts
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-600 text-white">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stay updated with real-time audit milestones, claim reviews, and blockchain payouts
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAll}>
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex gap-3"
            >
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="All caught up!"
          description="You don't have any unread or pending notifications."
          icon="Bell"
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition flex items-start gap-3.5 ${
                notif.read
                  ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/70 opacity-80"
                  : "bg-brand-50/30 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800 shadow-xs"
              }`}
            >
              <div className="mt-0.5">{getNotifIcon(notif.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                    {notif.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatDate(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {notif.message}
                </p>

                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  {notif.linkUrl && (
                    <Link
                      href={notif.linkUrl}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <span>View Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkOne(notif.id)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

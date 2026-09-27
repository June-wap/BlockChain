import { SystemNotification } from "@/types";

export async function fetchNotifications(): Promise<{ data: SystemNotification[]; unreadCount: number }> {
  const res = await fetch("/api/customer/notifications", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load notifications");
  }

  const json = await res.json();
  return {
    data: json.data || [],
    unreadCount: json.unreadCount || 0,
  };
}

export async function markNotificationReadApi(notificationId?: string, markAll: boolean = false) {
  const res = await fetch("/api/customer/notifications/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationId, markAll }),
  });

  return res.json();
}

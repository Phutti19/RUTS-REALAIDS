"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import type { Notification } from "@/types";

const TYPE_ICON: Record<string, string> = {
  emergency: "🚨",
  appointment: "📅",
  stock_alert: "💊",
  expiry_alert: "⚠️",
  system: "🔔",
};

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    api.get<Notification[]>("/notifications?limit=50").then((res) => {
      if (res.success) {
        setNotifications(Array.isArray(res.data) ? (res.data as unknown as Notification[]) : []);
      }
      setLoading(false);
    });
  }, []);

  const markAllRead = async () => {
    setMarkingAll(true);
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const markOneRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">การแจ้งเตือน</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? `ยังไม่อ่าน ${unreadCount} รายการ` : "อ่านทั้งหมดแล้ว"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={16} />
            )}
            อ่านทั้งหมด
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markOneRead(n.id)}
                className={cn(
                  "flex gap-3 px-4 py-4 transition-colors",
                  !n.isRead ? "bg-blue-50/50 cursor-pointer hover:bg-blue-50" : "hover:bg-gray-50/60"
                )}
              >
                <div className="text-xl flex-shrink-0 pt-0.5">
                  {TYPE_ICON[n.type] ?? "🔔"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium", !n.isRead ? "text-gray-900" : "text-gray-700")}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

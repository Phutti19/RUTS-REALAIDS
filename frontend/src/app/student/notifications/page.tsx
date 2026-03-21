"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Loader2, CheckCheck } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Notification } from "@/types";

const TYPE_ICON: Record<string, { emoji: string; bg: string }> = {
  emergency:    { emoji: "🚨", bg: "bg-red-100 dark:bg-red-900/30" },
  appointment:  { emoji: "📅", bg: "bg-blue-100 dark:bg-blue-900/30" },
  stock_alert:  { emoji: "💊", bg: "bg-amber-100 dark:bg-amber-900/30" },
  expiry_alert: { emoji: "⚠️", bg: "bg-orange-100 dark:bg-orange-900/30" },
  system:       { emoji: "🔔", bg: "bg-gray-100 dark:bg-gray-700" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = () => {
    api.get<Notification[]>("/notifications?limit=50").then((res) => {
      if (res.success) {
        setNotifications(Array.isArray(res.data) ? (res.data as unknown as Notification[]) : []);
      }
      setLoading(false);
    });
  };

  useEffect(() => { fetchNotifications(); }, []);

  // Real-time: refresh when new notification arrives
  useWebSocket("notification:new", fetchNotifications, []);

  const markAllRead = async () => {
    setMarkingAll(true);
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const markRead = async (id: string) => {
    const n = notifications.find((n) => n.id === id);
    if (!n || n.isRead) return;
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="bg-slate-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <Link href="/student/dashboard" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">การแจ้งเตือน</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[18px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            {markingAll ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCheck size={13} />
            )}
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="px-3 py-2.5 space-y-2">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">ไม่มีการแจ้งเตือน</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">เมื่อมีการแจ้งเตือนใหม่จะแสดงที่นี่</p>
          </div>
        ) : (
          notifications.map((n) => {
            const typeInfo = TYPE_ICON[n.type] ?? TYPE_ICON.system!;
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "w-full text-left flex gap-3 p-3 rounded-xl transition-all",
                  !n.isRead
                    ? "bg-white dark:bg-gray-800 shadow-sm border border-blue-100 dark:border-blue-900/40"
                    : "bg-white/60 dark:bg-gray-800/60 border border-transparent hover:bg-white dark:hover:bg-gray-800"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base",
                  typeInfo.bg
                )}>
                  {typeInfo.emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm font-semibold leading-snug",
                      !n.isRead ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
                    )}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className={cn(
                    "text-xs mt-0.5 leading-relaxed line-clamp-2",
                    !n.isRead ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"
                  )}>
                    {n.message}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

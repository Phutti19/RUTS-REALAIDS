"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Loader2, CheckCheck } from "lucide-react";
import Link from "next/link";
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

export default function NotificationsPage() {
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/student/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-semibold text-gray-800">การแจ้งเตือน</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-xs text-blue-600 flex items-center gap-1"
          >
            {markingAll ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCheck size={14} />
            )}
            อ่านทั้งหมด
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex gap-3 px-4 py-4",
                !n.isRead && "bg-blue-50/40"
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
          ))
        )}
      </div>
    </div>
  );
}

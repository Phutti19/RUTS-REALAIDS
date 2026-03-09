"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import { cn, formatDateTime, statusLabel, incidentTypeLabel } from "@/lib/utils";
import type { Notification, Visit } from "@/types";

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingVisits, setLoadingVisits] = useState(true);

  useEffect(() => {
    // Wait for auth to resolve before making API calls
    if (!user) return;

    // Load notifications
    api.get<Notification[]>("/notifications?limit=5").then((res) => {
      if (res.success && res.data) {
        setNotifications(Array.isArray(res.data) ? (res.data as unknown as Notification[]) : []);
      }
    });

    // Load unread count
    api.get<{ count: number }>("/notifications/unread-count").then((res) => {
      if (res.success && res.data) setUnreadCount(res.data.count);
    });

    // Load recent visits
    api.get<Visit[]>("/visits?limit=5").then((res) => {
      if (res.success && res.data) {
        setRecentVisits(Array.isArray(res.data) ? (res.data as unknown as Visit[]) : []);
      }
      setLoadingVisits(false);
    });
  }, [user]);

  // Real-time: receive new notification
  useWebSocket<Notification>("notification:new", (notif) => {
    setNotifications((prev) => [notif, ...prev.slice(0, 4)]);
    setUnreadCount((c) => c + 1);
  }, []);

  const handleEmergencyPress = () => {
    router.push("/student/emergency/report");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 pt-10 pb-16 px-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm">สวัสดี,</p>
            <h1 className="text-xl font-bold">
              {user?.firstName} {user?.lastName}
            </h1>
            {user?.studentId && (
              <p className="text-blue-300 text-xs">{user.studentId}</p>
            )}
          </div>
          <Link href="/student/notifications" className="relative p-2">
            <Bell size={24} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Main content — card pulled up over header */}
      <div className="-mt-10 px-4 space-y-4">
        {/* Emergency Button */}
        <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
          <p className="text-sm text-gray-500 mb-4">กดปุ่มด้านล่างเพื่อแจ้งเหตุฉุกเฉิน</p>
          <button
            onClick={handleEmergencyPress}
            className={cn(
              "w-36 h-36 rounded-full mx-auto flex flex-col items-center justify-center gap-2 emergency-pulse",
              "bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200",
              "border-4 border-red-200"
            )}
          >
            <AlertTriangle size={44} className="text-white" />
            <span className="text-white font-bold text-base">แจ้งเหตุ</span>
            <span className="text-red-200 text-xs">ฉุกเฉิน</span>
          </button>

          {/* Emergency call */}
          <a
            href="tel:191"
            className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 font-medium hover:text-red-700"
          >
            📞 โทรฉุกเฉิน 191
          </a>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions grid grid-cols-3 gap-3">
          <Link
            href="/student/appointments"
            className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-700 text-center font-medium">นัดหมาย</span>
          </Link>

          <Link
            href="/student/history"
            className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <ClipboardList size={20} className="text-purple-600" />
            </div>
            <span className="text-xs text-gray-700 text-center font-medium">ประวัติ</span>
          </Link>

          <Link
            href="/student/profile"
            className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <ClipboardList size={20} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-700 text-center font-medium">โปรไฟล์</span>
          </Link>
        </div>

        {/* Recent visits */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">ประวัติการใช้บริการล่าสุด</h2>
            <Link href="/student/history" className="text-xs text-blue-600 flex items-center gap-0.5">
              ดูทั้งหมด <ChevronRight size={14} />
            </Link>
          </div>

          {loadingVisits ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : recentVisits.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              ยังไม่มีประวัติการใช้บริการ
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      visit.status === "completed"
                        ? "bg-green-100"
                        : "bg-blue-100"
                    )}
                  >
                    {visit.status === "completed" ? (
                      <CheckCircle2 size={16} className="text-green-600" />
                    ) : (
                      <Clock size={16} className="text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {visit.chiefComplaint}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(visit.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      visit.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {statusLabel(visit.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">การแจ้งเตือน</h2>
              <Link
                href="/student/notifications"
                className="text-xs text-blue-600 flex items-center gap-0.5"
              >
                ดูทั้งหมด <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {notifications.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 flex gap-3 items-start",
                    !n.isRead && "bg-blue-50/40"
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                      !n.isRead ? "bg-blue-500" : "bg-gray-300"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500 truncate">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

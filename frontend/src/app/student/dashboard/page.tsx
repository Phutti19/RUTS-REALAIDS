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
  Siren,
  User,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { api } from "@/lib/api";
import { cn, formatDateTime, statusLabel, incidentTypeLabel } from "@/lib/utils";
import type { Notification, Visit, Incident } from "@/types";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "สวัสดีตอนเช้า";
  if (h < 17) return "สวัสดีตอนบ่าย";
  if (h < 21) return "สวัสดีตอนเย็น";
  return "สวัสดีตอนดึก";
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [todayThai, setTodayThai] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setTodayThai(
      new Date().toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    );
    setGreeting(getGreeting());
  }, []);

  const initials =
    `${user?.firstName?.charAt(0) ?? ""}${user?.lastName?.charAt(0) ?? ""}`.toUpperCase() || "?";

  useEffect(() => {
    if (!user) return;

    api.get<Notification[]>("/notifications?limit=5").then((res) => {
      if (res.success && res.data)
        setNotifications(Array.isArray(res.data) ? (res.data as unknown as Notification[]) : []);
    });

    api.get<{ count: number }>("/notifications/unread-count").then((res) => {
      if (res.success && res.data) setUnreadCount(res.data.count);
    });

    api.get<Visit[]>("/visits?limit=5").then((res) => {
      if (res.success && res.data)
        setRecentVisits(Array.isArray(res.data) ? (res.data as unknown as Visit[]) : []);
      setLoadingVisits(false);
    });

    api.get<{ data: Incident[] }>("/incidents?limit=5").then((res) => {
      if (res.success && res.data) {
        const list: Incident[] = Array.isArray(res.data)
          ? (res.data as unknown as Incident[])
          : ((res.data as { data: Incident[] }).data ?? []);
        setActiveIncident(
          list.find((i) => i.status !== "completed" && i.status !== "cancelled") ?? null
        );
      }
    });
  }, [user]);

  useWebSocket<Notification>(
    "notification:new",
    (notif) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 4)]);
      setUnreadCount((c) => c + 1);
    },
    []
  );

  useWebSocket<Incident>(
    "incident:status_update",
    (incident) => {
      if (incident.status === "completed" || incident.status === "cancelled") {
        setActiveIncident((prev) => (prev?.id === incident.id ? null : prev));
      } else {
        setActiveIncident((prev) => (prev?.id === incident.id ? incident : prev ?? incident));
      }
    },
    []
  );

  useWebSocket<Incident>(
    "incident:accepted",
    (incident) => {
      setActiveIncident(incident);
    },
    []
  );

  return (
    <div className="bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              {greeting}
              {todayThai ? ` · ${todayThai}` : ""}
            </p>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">
              {user?.firstName} {user?.lastName}
            </h1>
            {user?.studentId && (
              <p className="text-xs text-gray-400 mt-0.5">{user.studentId}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle size={18} />
            <Link
              href="/student/notifications"
              className="relative w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl"
            >
              <Bell size={19} className="text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/student/profile"
              className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-sm"
            >
              {initials}
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Active incident banner */}
        {activeIncident && (
          <Link
            href={`/student/emergency/track/${activeIncident.id}`}
            className="flex items-center gap-3 bg-orange-500 text-white rounded-2xl px-4 py-3 shadow-lg shadow-orange-400/30"
          >
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Siren size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">เหตุฉุกเฉินกำลังดำเนินการ</p>
              <p className="text-xs text-orange-100 truncate">
                {incidentTypeLabel(activeIncident.incidentType)} · แตะเพื่อติดตามสถานะ
              </p>
            </div>
            <ChevronRight size={16} className="shrink-0" />
          </Link>
        )}

        {/* Emergency button card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 pt-5 pb-6 text-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-4">
            กดปุ่มด้านล่างเพื่อแจ้งเหตุฉุกเฉิน
          </p>

          <button
            onClick={() => router.push("/student/emergency/report")}
            className={cn(
              "w-40 h-40 rounded-full mx-auto flex flex-col items-center justify-center gap-1.5",
              "bg-gradient-to-b from-red-500 to-red-700",
              "shadow-[0_8px_32px_rgba(220,38,38,0.45)]",
              "border-[5px] border-red-200",
              "active:scale-95 transition-transform duration-100",
              "emergency-pulse"
            )}
          >
            <AlertTriangle size={46} className="text-white" />
            <span className="text-white font-extrabold text-base">แจ้งเหตุ</span>
            <span className="text-red-200 text-xs">ฉุกเฉิน</span>
          </button>

          <a
            href="tel:191"
            className="mt-5 inline-flex items-center gap-2 text-sm text-red-500 font-semibold hover:text-red-600 transition-colors"
          >
            <span>📞</span> โทรฉุกเฉิน 191
          </a>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              href: "/student/appointments",
              label: "นัดหมาย",
              icon: Calendar,
              bg: "bg-blue-50",
              fg: "text-blue-600",
            },
            {
              href: "/student/history",
              label: "ประวัติ",
              icon: ClipboardList,
              bg: "bg-purple-50",
              fg: "text-purple-600",
            },
            {
              href: "/student/profile",
              label: "โปรไฟล์",
              icon: User,
              bg: "bg-emerald-50",
              fg: "text-emerald-600",
            },
          ].map(({ href, label, icon: Icon, bg, fg }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm border border-gray-100 hover:shadow-md active:scale-95 transition-all"
            >
              <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", bg)}>
                <Icon size={22} className={fg} />
              </div>
              <span className="text-xs text-gray-700 font-semibold">{label}</span>
            </Link>
          ))}
        </div>

        {/* Recent visits */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">ประวัติล่าสุด</h2>
            <Link
              href="/student/history"
              className="text-xs text-blue-600 flex items-center gap-0.5 font-medium"
            >
              ดูทั้งหมด <ChevronRight size={13} />
            </Link>
          </div>

          {loadingVisits ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={22} className="animate-spin text-gray-300" />
            </div>
          ) : recentVisits.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardList size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">ยังไม่มีประวัติการใช้บริการ</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      visit.status === "completed" ? "bg-green-100" : "bg-blue-100"
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
                    <p className="text-xs text-gray-400">{formatDateTime(visit.createdAt)}</p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">การแจ้งเตือน</h2>
              <Link
                href="/student/notifications"
                className="text-xs text-blue-600 flex items-center gap-0.5 font-medium"
              >
                ดูทั้งหมด <ChevronRight size={13} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {notifications.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  className={cn("px-4 py-3 flex gap-3 items-start", !n.isRead && "bg-blue-50/40")}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                      !n.isRead ? "bg-blue-500" : "bg-gray-200"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500 truncate">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(n.createdAt)}</p>
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

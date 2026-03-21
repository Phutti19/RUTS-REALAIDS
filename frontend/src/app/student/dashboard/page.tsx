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
  Phone,
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
  const [emergencyContacts, setEmergencyContacts] = useState<{ id: string; name: string; category: string; phone: string }[]>([]);
  const [infirmaryPhone, setInfirmaryPhone] = useState<string | null>(null);

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

    api.get<{ id: string; name: string; category: string; phone: string }[]>("/emergency-contacts").then((res) => {
      if (res.success && Array.isArray(res.data)) setEmergencyContacts(res.data);
    });
    api.get<{ name: string; phone: string | null }>("/settings/infirmary").then((res) => {
      if (res.success && res.data?.phone) setInfirmaryPhone(res.data.phone);
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
    <div className="bg-slate-100 dark:bg-gray-900">
      {/* Top bar */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-950 px-4 pb-5 student-header">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-blue-200 truncate">
              {greeting}
              {todayThai ? ` · ${todayThai}` : ""}
            </p>
            <h1 className="text-lg font-bold text-white mt-0.5 truncate">
              {user?.firstName} {user?.lastName}
            </h1>
            {user?.studentId && (
              <p className="text-xs text-blue-300 mt-0.5">{user.studentId}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ThemeToggle size={16} />
            <Link
              href="/student/notifications"
              className="relative w-9 h-9 flex items-center justify-center bg-white/15 rounded-xl"
            >
              <Bell size={18} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold text-white px-0.5">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/student/profile"
              className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-xs shadow-sm"
            >
              {initials}
            </Link>
          </div>
        </div>
      </div>

      <div className="px-3 pt-4 pb-4 space-y-4">
        {/* Active incident banner */}
        {activeIncident && (
          <Link
            href={`/student/emergency/track/${activeIncident.id}`}
            className="flex items-center gap-3 bg-amber-600 text-white rounded-2xl px-4 py-3 shadow-lg shadow-amber-600/30"
          >
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Siren size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">เหตุฉุกเฉินกำลังดำเนินการ</p>
              <p className="text-xs text-amber-100 truncate">
                {incidentTypeLabel(activeIncident.incidentType)} · แตะเพื่อติดตามสถานะ
              </p>
            </div>
            <ChevronRight size={16} className="shrink-0" />
          </Link>
        )}

        {/* Emergency button card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm px-4 pt-5 pb-5 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-3">
            กดปุ่มด้านล่างเพื่อแจ้งเหตุฉุกเฉิน
          </p>

          <button
            onClick={() => router.push("/student/emergency/report")}
            className={cn(
              "w-36 h-36 rounded-full mx-auto flex flex-col items-center justify-center gap-1",
              "bg-gradient-to-b from-red-600 to-red-800",
              "shadow-[0_8px_32px_rgba(185,28,28,0.5)]",
              "border-4 border-red-300",
              "active:scale-95 transition-transform duration-100",
              "emergency-pulse"
            )}
          >
            <AlertTriangle size={40} className="text-white" />
            <span className="text-white font-extrabold text-base">แจ้งเหตุ</span>
            <span className="text-red-200 text-xs">ฉุกเฉิน</span>
          </button>

        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            {
              href: "/student/appointments",
              label: "นัดหมาย",
              icon: Calendar,
              bg: "bg-blue-100 dark:bg-blue-900/30",
              fg: "text-blue-700 dark:text-blue-400",
            },
            {
              href: "/student/history",
              label: "ประวัติ",
              icon: ClipboardList,
              bg: "bg-indigo-100 dark:bg-indigo-900/30",
              fg: "text-indigo-700 dark:text-indigo-400",
            },
            {
              href: "/student/profile",
              label: "โปรไฟล์",
              icon: User,
              bg: "bg-emerald-100 dark:bg-emerald-900/30",
              fg: "text-emerald-700 dark:text-emerald-400",
            },
          ].map(({ href, label, icon: Icon, bg, fg }) => (
            <Link
              key={href}
              href={href}
              className="bg-white dark:bg-gray-800 rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md active:scale-95 transition-all"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>
                <Icon size={20} className={fg} />
              </div>
              <span className="text-xs text-gray-700 dark:text-gray-200 font-semibold">{label}</span>
            </Link>
          ))}
        </div>

        {/* Recent visits */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">ประวัติล่าสุด</h2>
            <Link
              href="/student/history"
              className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-0.5 font-medium hover:underline"
            >
              ดูทั้งหมด <ChevronRight size={13} />
            </Link>
          </div>

          {loadingVisits ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : recentVisits.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardList size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">ยังไม่มีประวัติการใช้บริการ</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="px-4 py-3 flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      visit.status === "completed" ? "bg-green-100 dark:bg-green-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                    )}
                  >
                    {visit.status === "completed" ? (
                      <CheckCircle2 size={16} className="text-green-700 dark:text-green-400" />
                    ) : (
                      <Clock size={16} className="text-blue-700 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {visit.chiefComplaint}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{formatDateTime(visit.createdAt)}</p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                      visit.status === "completed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    )}
                  >
                    {statusLabel(visit.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency contacts */}
        {(infirmaryPhone || emergencyContacts.length > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-2">
                <Phone size={14} className="text-red-500" /> เบอร์ฉุกเฉิน
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {infirmaryPhone && (
                <a href={`tel:${infirmaryPhone}`} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors active:bg-blue-100">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">ห้องพยาบาล</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{infirmaryPhone}</p>
                  </div>
                </a>
              )}
              {emergencyContacts.map((c) => (
                <a key={c.id} href={`tel:${c.phone}`} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors active:bg-red-100">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{c.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{c.phone}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">การแจ้งเตือน</h2>
              <Link
                href="/student/notifications"
                className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-0.5 font-medium hover:underline"
              >
                ดูทั้งหมด <ChevronRight size={13} />
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  className={cn("px-4 py-3 flex gap-2.5 items-start", !n.isRead && "bg-blue-50/50 dark:bg-blue-950/20")}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                      !n.isRead ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{n.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.message}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDateTime(n.createdAt)}</p>
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

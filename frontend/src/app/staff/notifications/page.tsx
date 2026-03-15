"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bell, Loader2, CheckCheck, Siren, Calendar, Pill,
  AlertTriangle, Settings, ChevronRight, X, Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";

const TYPE_CONFIG: Record<NotificationType, {
  icon: React.ReactNode;
  label: string;
  unreadBg: string;
  border: string;
  iconBg: string;
  href: (n: Notification) => string;
}> = {
  emergency: {
    icon: <Siren size={15} />,
    label: "เหตุฉุกเฉิน",
    unreadBg: "bg-red-50",
    border: "border-l-red-400",
    iconBg: "bg-red-100 text-red-600",
    href: () => "/staff/emergency",
  },
  appointment: {
    icon: <Calendar size={15} />,
    label: "นัดหมาย",
    unreadBg: "bg-blue-50",
    border: "border-l-blue-400",
    iconBg: "bg-blue-100 text-blue-600",
    href: () => "/staff/appointments",
  },
  stock_alert: {
    icon: <Pill size={15} />,
    label: "คลังยา",
    unreadBg: "bg-orange-50",
    border: "border-l-orange-400",
    iconBg: "bg-orange-100 text-orange-600",
    href: (n) => n.referenceId ? `/staff/medicines/${n.referenceId}` : "/staff/medicines",
  },
  expiry_alert: {
    icon: <AlertTriangle size={15} />,
    label: "ใกล้หมดอายุ",
    unreadBg: "bg-amber-50",
    border: "border-l-amber-400",
    iconBg: "bg-amber-100 text-amber-600",
    href: () => "/staff/medicines",
  },
  system: {
    icon: <Settings size={15} />,
    label: "ระบบ",
    unreadBg: "bg-gray-50",
    border: "border-l-gray-300",
    iconBg: "bg-gray-100 text-gray-500",
    href: () => "/staff/settings",
  },
};

const TABS: { key: "all" | NotificationType; label: string }[] = [
  { key: "all",        label: "ทั้งหมด" },
  { key: "emergency",  label: "เหตุฉุกเฉิน" },
  { key: "appointment",label: "นัดหมาย" },
  { key: "stock_alert",label: "คลังยา" },
  { key: "expiry_alert",label: "ใกล้หมดอายุ" },
];

function dateGroup(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "วันนี้";
  if (sameDay(date, yesterday)) return "เมื่อวาน";
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

export default function StaffNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingRead, setClearingRead] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | NotificationType>("all");

  useEffect(() => {
    api.get<Notification[]>("/notifications?limit=100").then((res) => {
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

  const clearRead = async () => {
    const readOnes = notifications.filter((n) => n.isRead);
    if (readOnes.length === 0) return;
    setClearingRead(true);
    await Promise.all(readOnes.map((n) => api.delete(`/notifications/${n.id}`)));
    setNotifications((prev) => prev.filter((n) => !n.isRead));
    setClearingRead(false);
  };

  const deleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await api.patch(`/notifications/${n.id}/read`);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
    router.push((TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system).href(n));
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
  const readCount   = useMemo(() => notifications.filter((n) => n.isRead).length, [notifications]);

  const tabUnread = (t: "all" | NotificationType) =>
    t === "all"
      ? unreadCount
      : notifications.filter((n) => n.type === t && !n.isRead).length;

  const filtered = useMemo(() =>
    (tab === "all" ? notifications : notifications.filter((n) => n.type === tab))
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications, tab]
  );

  // Group by date
  const groups = useMemo(() => {
    const map = new Map<string, Notification[]>();
    for (const n of filtered) {
      const g = dateGroup(n.createdAt);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(n);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">การแจ้งเตือน</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? (
              <span className="text-blue-600 font-medium">ยังไม่อ่าน {unreadCount} รายการ</span>
            ) : (
              "อ่านทั้งหมดแล้ว"
            )}
            {notifications.length > 0 && ` · ทั้งหมด ${notifications.length} รายการ`}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {readCount > 0 && (
            <button
              onClick={clearRead}
              disabled={clearingRead}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
            >
              {clearingRead ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              ลบที่อ่านแล้ว ({readCount})
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
            >
              {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
              อ่านทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Type stats */}
      {!loading && notifications.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {(["emergency", "appointment", "stock_alert", "expiry_alert", "system"] as NotificationType[]).map((type) => {
            const cfg = TYPE_CONFIG[type];
            const count = notifications.filter((n) => n.type === type && !n.isRead).length;
            return (
              <button
                key={type}
                onClick={() => setTab(type)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2.5 rounded-2xl border transition-all",
                  tab === type
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-gray-100 bg-white hover:bg-gray-50"
                )}
              >
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", cfg.iconBg)}>
                  {cfg.icon}
                </div>
                {count > 0 ? (
                  <span className="text-xs font-bold text-red-500">{count}</span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {TABS.map(({ key, label }) => {
          const count = tabUnread(key);
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                tab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center",
                  tab === key ? "bg-white/20 text-white" : "bg-red-500 text-white"
                )}>
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-16 text-center border border-gray-100">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Bell size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400">ไม่มีการแจ้งเตือน</p>
          {tab !== "all" && (
            <button onClick={() => setTab("all")} className="text-xs text-blue-500 mt-1 hover:underline">
              ดูทั้งหมด
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([groupLabel, items]) => (
            <div key={groupLabel}>
              {/* Group label */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <p className="text-xs font-semibold text-gray-400">{groupLabel}</p>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300">{items.length} รายการ</span>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 divide-y divide-gray-50">
                {items.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                  const isDeleting = deletingId === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        "group relative flex gap-3 px-4 py-3.5 cursor-pointer transition-all border-l-4",
                        !n.isRead
                          ? cn(cfg.unreadBg, cfg.border)
                          : "hover:bg-gray-50/80 border-l-transparent"
                      )}
                    >
                      {/* Type icon */}
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105",
                        cfg.iconBg
                      )}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-start gap-2">
                          {!n.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                          <p className={cn(
                            "text-sm font-semibold leading-snug",
                            !n.isRead ? "text-gray-900" : "text-gray-500"
                          )}>
                            {n.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn("text-[11px] px-1.5 py-0.5 rounded-md font-medium", cfg.iconBg)}>
                            {cfg.label}
                          </span>
                          <span className="text-[11px] text-gray-400">{formatDateTime(n.createdAt)}</span>
                        </div>
                      </div>

                      {/* Right: navigate arrow + delete button */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {/* Delete button — visible on hover */}
                        <button
                          onClick={(e) => deleteOne(e, n.id)}
                          disabled={isDeleting}
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                            "opacity-0 group-hover:opacity-100",
                            "bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500",
                            "disabled:opacity-50"
                          )}
                          title="ลบการแจ้งเตือน"
                        >
                          {isDeleting
                            ? <Loader2 size={12} className="animate-spin" />
                            : <X size={12} />
                          }
                        </button>
                        <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

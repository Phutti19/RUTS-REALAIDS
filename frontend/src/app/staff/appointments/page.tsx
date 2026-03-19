"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Loader2, User,
  CheckCircle2, XCircle, Plus, Clock, AlertCircle,
  CalendarCheck, CalendarX, Users,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types";

/* ─── helpers ─────────────────────────────────────────────── */
function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500",
  "bg-amber-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const STATUS_CONFIG: Record<AppointmentStatus, {
  label: string; dot: string; badge: string; border: string;
}> = {
  scheduled:  { label: "นัดหมายแล้ว", dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",           border: "border-blue-400" },
  checked_in: { label: "เช็คอินแล้ว",  dot: "bg-green-500",  badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",         border: "border-green-400" },
  completed:  { label: "เสร็จสิ้น",    dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",                border: "border-gray-300 dark:border-gray-600" },
  cancelled:  { label: "ยกเลิก",       dot: "bg-red-400",    badge: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",                 border: "border-red-300 dark:border-red-700" },
  no_show:    { label: "ไม่มา",        dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",     border: "border-orange-300 dark:border-orange-700" },
};

type FilterTab = "all" | AppointmentStatus;

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ─── component ───────────────────────────────────────────── */
export default function StaffAppointmentsPage() {
  const todayStr = toLocalDateStr(new Date());
  const todayDate = new Date();

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    setLoading(true);
    api.get<Appointment[]>(`/appointments?date=${selectedDate}&limit=100`).then((res) => {
      setAppointments(Array.isArray(res.data) ? (res.data as unknown as Appointment[]) : []);
      setLoading(false);
    });
  }, [selectedDate]);

  useEffect(() => {
    const from = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const to = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${lastDay}`;
    api.get<Appointment[]>(`/appointments?from=${from}&to=${to}&limit=500`).then((res) => {
      const counts: Record<string, number> = {};
      if (Array.isArray(res.data)) {
        (res.data as unknown as Appointment[]).forEach((a) => {
          const d = a.appointmentDate;
          counts[d] = (counts[d] ?? 0) + 1;
        });
      }
      setMonthCounts(counts);
    });
  }, [viewYear, viewMonth]);

  const checkIn = async (id: string) => {
    setActionLoading(id);
    await api.patch(`/appointments/${id}/check-in`);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "checked_in" } : a)));
    setActionLoading(null);
  };
  const cancel = async (id: string) => {
    if (!confirm("ยืนยันยกเลิกนัด?")) return;
    setActionLoading(id);
    await api.patch(`/appointments/${id}/cancel`, { cancelReason: "ยกเลิกโดยเจ้าหน้าที่" });
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
    setActionLoading(null);
  };
  const markNoShow = async (id: string) => {
    if (!confirm("ยืนยันว่าผู้ป่วยไม่มา?")) return;
    setActionLoading(id);
    await api.patch(`/appointments/${id}/no-show`);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "no_show" } : a)));
    setActionLoading(null);
  };

  const stats = useMemo(() => ({
    total:      appointments.length,
    scheduled:  appointments.filter((a) => a.status === "scheduled").length,
    checked_in: appointments.filter((a) => a.status === "checked_in").length,
    completed:  appointments.filter((a) => a.status === "completed").length,
    cancelled:  appointments.filter((a) => a.status === "cancelled" || a.status === "no_show").length,
  }), [appointments]);

  const filtered = useMemo(() =>
    appointments
      .filter((a) => filter === "all" || a.status === filter)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime)),
    [appointments, filter]
  );

  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",        label: "ทั้งหมด",      count: stats.total },
    { key: "scheduled",  label: "นัดหมาย",      count: stats.scheduled },
    { key: "checked_in", label: "เช็คอินแล้ว",  count: stats.checked_in },
    { key: "completed",  label: "เสร็จสิ้น",    count: stats.completed },
    { key: "cancelled",  label: "ยกเลิก/ไม่มา", count: stats.cancelled },
  ];

  const DAY_HEADERS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  const monthGrid = getMonthGrid(viewYear, viewMonth);

  const selectedDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long",
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); setSelectedDate(todayStr);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("th-TH", {
    month: "long", year: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">การนัดหมาย</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">จัดการตารางนัดผู้ป่วย</p>
        </div>
        <Link href="/staff/appointments/slots"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
          <Plus size={17} /> จัดการช่วงเวลา
        </Link>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5 items-start">

        {/* ── Left: Calendar + Stats ─────────────────────── */}
        <div className="space-y-4">

          {/* Calendar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                <ChevronLeft size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-gray-800 dark:text-white">{monthLabel}</span>
                {(viewYear !== todayDate.getFullYear() || viewMonth !== todayDate.getMonth()) && (
                  <button onClick={goToday}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40">
                    เดือนนี้
                  </button>
                )}
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                <ChevronRight size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((date, i) => {
                if (!date) return <div key={`pad-${i}`} />;
                const dateStr = toLocalDateStr(date);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const count = monthCounts[dateStr] ?? 0;
                const isPast = date < new Date(todayStr + "T00:00:00");
                const isSunday = date.getDay() === 0;

                return (
                  <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-xl py-3 transition-all text-sm font-bold",
                      isSelected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : isToday
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-2 ring-blue-300 dark:ring-blue-700"
                        : isPast
                        ? isSunday ? "text-red-300 dark:text-red-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                   : "text-gray-400 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        : isSunday ? "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                                   : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    <span className="leading-none">{date.getDate()}</span>
                    {count > 0 && (
                      <span className={cn(
                        "mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "ทั้งหมด",      value: stats.total,      icon: <Users size={17} />,        color: "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700" },
              { label: "นัดหมาย",      value: stats.scheduled,  icon: <Clock size={17} />,         color: "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30" },
              { label: "เช็คอินแล้ว",  value: stats.checked_in, icon: <CalendarCheck size={17} />, color: "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30" },
              { label: "ยกเลิก/ไม่มา", value: stats.cancelled,  icon: <CalendarX size={17} />,    color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", s.color)}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{s.value}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Appointment list ─────────────────────── */}
        <div className="space-y-4">

          {/* Date label + filter tabs */}
          <div className="space-y-3">
            <p className="text-base font-bold text-gray-800 dark:text-gray-100">{selectedDateLabel}</p>

            {!loading && appointments.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {FILTER_TABS.map((tab) => (
                  <button key={tab.key} onClick={() => setFilter(tab.key)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all",
                      filter === tab.key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-700"
                    )}>
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={cn(
                        "text-xs font-bold px-1.5 py-0.5 rounded-full",
                        filter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Appointment list */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 size={28} className="animate-spin text-gray-300" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-14 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">ไม่มีนัดหมายในวันนี้</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">เลือกวันอื่น หรือรอผู้ป่วยทำนัดเข้ามา</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <AlertCircle size={26} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">ไม่มีนัดในสถานะนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((apt) => {
                const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.scheduled;
                const isLoading = actionLoading === apt.id;
                return (
                  <div key={apt.id} className={cn(
                    "bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-l-4 p-5 transition-all hover:shadow-md",
                    cfg.border,
                    apt.status === "cancelled" || apt.status === "no_show" ? "opacity-60" : ""
                  )}>
                    <div className="flex items-start gap-4">

                      {/* Time column */}
                      <div className="flex-shrink-0 text-center w-14">
                        <div className={cn("w-3 h-3 rounded-full mx-auto mb-2", cfg.dot)} />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                          {apt.appointmentTime.slice(0, 5)}
                        </span>
                        <p className="text-xs text-gray-400 dark:text-gray-500">น.</p>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold",
                              avatarColor(apt.patientId)
                            )}>
                              {getInitials(apt.patientName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{apt.patientName}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{apt.reason}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <User size={13} className="text-gray-300 dark:text-gray-600" />
                                <span className="text-xs text-gray-400 dark:text-gray-500">{apt.staffName}</span>
                              </div>
                            </div>
                          </div>
                          <span className={cn("flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full", cfg.badge)}>
                            {cfg.label}
                          </span>
                        </div>

                        {apt.notes && (
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 truncate">หมายเหตุ: {apt.notes}</p>
                        )}
                        {apt.cancelReason && apt.status === "cancelled" && (
                          <p className="text-sm text-red-400 dark:text-red-500 mt-2">เหตุผล: {apt.cancelReason}</p>
                        )}

                        {(apt.status === "scheduled" || apt.status === "checked_in") && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            {apt.status === "scheduled" && (
                              <button onClick={() => checkIn(apt.id)} disabled={isLoading}
                                className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50 font-semibold">
                                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                เช็คอิน
                              </button>
                            )}
                            {apt.status === "checked_in" && (
                              <button onClick={() => markNoShow(apt.id)} disabled={isLoading}
                                className="flex items-center gap-2 text-sm bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 font-semibold">
                                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
                                ไม่มา
                              </button>
                            )}
                            {apt.status === "scheduled" && (
                              <button onClick={() => cancel(apt.id)} disabled={isLoading}
                                className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 font-semibold">
                                <XCircle size={14} />
                                ยกเลิก
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

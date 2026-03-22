"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Loader2, User,
  CheckCircle2, XCircle, Plus, Clock, AlertCircle,
  CalendarCheck, CalendarX, Users, CalendarClock, X,
} from "lucide-react";
import Link from "next/link";
import { api, extractError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Appointment, AppointmentSlot, AppointmentStatus } from "@/types";

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

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule dialog state
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState<AppointmentSlot[]>([]);
  const [rescheduleSlot, setRescheduleSlot] = useState<AppointmentSlot | null>(null);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

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

  // Real-time: refresh when any appointment is created/updated/cancelled/rescheduled
  const refreshAppointments = useCallback(() => {
    api.get<Appointment[]>(`/appointments?date=${selectedDate}&limit=100`).then((res) => {
      setAppointments(Array.isArray(res.data) ? (res.data as unknown as Appointment[]) : []);
    });
    // Also refresh month counts
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
  }, [selectedDate, viewYear, viewMonth]);

  // Close reschedule/cancel dialogs if the target appointment is no longer 'scheduled'
  const handleAppointmentUpdate = useCallback(() => {
    refreshAppointments();
    // Close dialogs — the appointment may have been cancelled/updated by another user
    setRescheduleTarget((prev) => {
      if (prev) {
        setRescheduleError("นัดหมายถูกอัปเดตจากที่อื่น กรุณาลองใหม่");
        return null;
      }
      return prev;
    });
    setCancelTarget(null);
  }, [refreshAppointments]);

  useWebSocket("appointment:update", handleAppointmentUpdate, [handleAppointmentUpdate]);

  const checkIn = async (id: string) => {
    setActionLoading(id);
    await api.patch(`/appointments/${id}/check-in`);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "checked_in" } : a)));
    setActionLoading(null);
  };

  const openCancelDialog = (apt: Appointment) => {
    setCancelTarget(apt);
    setCancelReason("");
  };
  const confirmCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelLoading(true);
    await api.patch(`/appointments/${cancelTarget.id}/cancel`, { cancelReason: cancelReason.trim() });
    setAppointments((prev) => prev.map((a) => (a.id === cancelTarget.id ? { ...a, status: "cancelled", cancelReason: cancelReason.trim() } : a)));
    setCancelLoading(false);
    setCancelTarget(null);
  };

  const markNoShow = async (id: string) => {
    if (!confirm("ยืนยันว่าผู้ป่วยไม่มา?")) return;
    setActionLoading(id);
    await api.patch(`/appointments/${id}/no-show`);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "no_show" } : a)));
    setActionLoading(null);
  };

  // Reschedule handlers
  const openRescheduleDialog = (apt: Appointment) => {
    setRescheduleTarget(apt);
    setRescheduleDate("");
    setRescheduleSlots([]);
    setRescheduleSlot(null);
    setRescheduleError("");
    setRescheduleReason("");
  };
  const loadRescheduleSlots = async (date: string) => {
    setRescheduleDate(date);
    setRescheduleSlot(null);
    setRescheduleError("");
    if (!date) { setRescheduleSlots([]); return; }
    setRescheduleSlotsLoading(true);
    const res = await api.get<AppointmentSlot[]>(`/appointment-slots/available?date=${date}`);
    setRescheduleSlots(Array.isArray(res.data) ? (res.data as unknown as AppointmentSlot[]) : []);
    setRescheduleSlotsLoading(false);
  };
  const confirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleSlot || !rescheduleDate) return;
    setRescheduleLoading(true);
    setRescheduleError("");
    const res = await api.patch(`/appointments/${rescheduleTarget.id}/reschedule`, {
      slotId: rescheduleSlot.id,
      date: rescheduleDate,
      reason: rescheduleReason.trim() || undefined,
    });
    setRescheduleLoading(false);
    if (res.success) {
      setRescheduleTarget(null);
    } else {
      setRescheduleError(extractError(res));
    }
    // Always refresh appointments (whether success or error, status may have changed)
    setLoading(true);
    const refreshRes = await api.get<Appointment[]>(`/appointments?date=${selectedDate}&limit=100`);
    setAppointments(Array.isArray(refreshRes.data) ? (refreshRes.data as unknown as Appointment[]) : []);
    setLoading(false);
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
                            {apt.status === "scheduled" && (
                              <button onClick={() => openRescheduleDialog(apt)}
                                className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl transition-colors font-semibold">
                                <CalendarClock size={14} />
                                เลื่อนนัด
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
                              <button onClick={() => openCancelDialog(apt)}
                                className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-xl transition-colors font-semibold">
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

      {/* ── Cancel Dialog ─────────────────────────────────────── */}
      {cancelTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setCancelTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">ยกเลิกนัดหมาย</h3>
                <button onClick={() => setCancelTarget(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                ผู้ป่วย: <span className="font-semibold text-gray-700 dark:text-gray-200">{cancelTarget.patientName}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                เวลา: {cancelTarget.appointmentTime.slice(0, 5)} น. — {cancelTarget.reason}
              </p>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                เหตุผลในการยกเลิก <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="เช่น เจ้าหน้าที่ไม่ว่าง, ผู้ป่วยแจ้งยกเลิก..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setCancelTarget(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  ปิด
                </button>
                <button onClick={confirmCancel} disabled={!cancelReason.trim() || cancelLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {cancelLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  ยืนยันยกเลิก
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Reschedule Dialog ─────────────────────────────────── */}
      {rescheduleTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setRescheduleTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">เลื่อนนัดหมาย</h3>
                <button onClick={() => setRescheduleTarget(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                ผู้ป่วย: <span className="font-semibold text-gray-700 dark:text-gray-200">{rescheduleTarget.patientName}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                นัดเดิม: {rescheduleTarget.appointmentDate} เวลา {rescheduleTarget.appointmentTime.slice(0, 5)} น.
              </p>

              {/* Date picker */}
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">เลือกวันใหม่</label>
              <input
                type="date"
                value={rescheduleDate}
                min={toLocalDateStr(new Date())}
                onChange={(e) => loadRescheduleSlots(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 dark:bg-gray-700 dark:text-white mb-4"
              />

              {/* Available slots */}
              {rescheduleDate && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">เลือกช่วงเวลา</label>
                  {rescheduleSlotsLoading ? (
                    <div className="py-4 flex justify-center"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
                  ) : rescheduleSlots.length === 0 ? (
                    <p className="text-sm text-gray-400 py-3 text-center">ไม่มีช่วงเวลาว่างในวันนี้</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {rescheduleSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => setRescheduleSlot(slot)}
                          disabled={!!slot.isFull}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left transition-all text-sm",
                            slot.isFull
                              ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                              : rescheduleSlot?.id === slot.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                              : "border-gray-200 dark:border-gray-600 hover:border-blue-200 bg-white dark:bg-gray-700"
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-100">
                            <Clock size={13} className="text-blue-500" />
                            {slot.startTime.slice(0, 5)} น.
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <User size={11} /> {slot.staffName}
                          </div>
                          {slot.isFull && <p className="text-[10px] text-gray-400 mt-1">เต็มแล้ว</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  เหตุผลในการเลื่อน <span className="text-gray-400 text-xs">(ไม่บังคับ)</span>
                </label>
                <textarea
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="เช่น เจ้าหน้าที่ไม่ว่าง, ผู้ป่วยแจ้งเลื่อน..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-gray-50 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {rescheduleError && (
                <p className="text-red-600 text-xs mb-3 bg-red-50 dark:bg-red-900/20 rounded-xl p-2">{rescheduleError}</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setRescheduleTarget(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  ปิด
                </button>
                <button onClick={confirmReschedule} disabled={!rescheduleSlot || !rescheduleDate || rescheduleLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {rescheduleLoading ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={14} />}
                  ยืนยันเลื่อนนัด
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

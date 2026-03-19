"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  CheckCircle2,
  XCircle,
  Plus,
  Clock,
  AlertCircle,
  CalendarCheck,
  CalendarX,
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
  scheduled:  { label: "นัดหมายแล้ว", dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700",     border: "border-blue-400" },
  checked_in: { label: "เช็คอินแล้ว",  dot: "bg-green-500",  badge: "bg-green-100 text-green-700",   border: "border-green-400" },
  completed:  { label: "เสร็จสิ้น",    dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600",     border: "border-gray-300" },
  cancelled:  { label: "ยกเลิก",       dot: "bg-red-400",    badge: "bg-red-100 text-red-600",       border: "border-red-300" },
  no_show:    { label: "ไม่มา",        dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700", border: "border-orange-300" },
};

type FilterTab = "all" | AppointmentStatus;

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* calendar grid: returns cells (null = padding, Date = real day) */
function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday-first
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

  /* fetch selected-day appointments */
  useEffect(() => {
    setLoading(true);
    api
      .get<Appointment[]>(`/appointments?date=${selectedDate}&limit=100`)
      .then((res) => {
        setAppointments(Array.isArray(res.data) ? (res.data as unknown as Appointment[]) : []);
        setLoading(false);
      });
  }, [selectedDate]);

  /* fetch whole-month counts (light) */
  useEffect(() => {
    const from = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const to = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${lastDay}`;
    api
      .get<Appointment[]>(`/appointments?from=${from}&to=${to}&limit=500`)
      .then((res) => {
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

  /* actions */
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

  /* derived */
  const stats = useMemo(() => ({
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === "scheduled").length,
    checked_in: appointments.filter((a) => a.status === "checked_in").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled" || a.status === "no_show").length,
  }), [appointments]);

  const filtered = useMemo(() =>
    appointments
      .filter((a) => filter === "all" || a.status === filter)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime)),
    [appointments, filter]
  );

  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",        label: "ทั้งหมด",      count: stats.total },
    { key: "scheduled",  label: "นัดหมายแล้ว",  count: stats.scheduled },
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
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("th-TH", {
    month: "long", year: "numeric",
  });

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">การนัดหมาย</h1>
          <p className="text-sm text-gray-500">จัดการตารางนัดผู้ป่วย</p>
        </div>
        <Link
          href="/staff/appointments/slots"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> จัดการช่วงเวลา
        </Link>
      </div>

      {/* Monthly Calendar */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-800">{monthLabel}</span>
            {(viewYear !== todayDate.getFullYear() || viewMonth !== todayDate.getMonth()) && (
              <button
                onClick={goToday}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1 bg-blue-50 rounded-full transition-colors"
              >
                เดือนนี้
              </button>
            )}
          </div>

          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">
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
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl py-2.5 transition-all text-sm font-bold",
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : isToday
                    ? "bg-blue-50 text-blue-700 ring-1.5 ring-blue-300"
                    : isPast
                    ? isSunday ? "text-red-300 hover:bg-gray-50" : "text-gray-400 hover:bg-gray-50"
                    : isSunday ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span className="leading-none">{date.getDate()}</span>
                {count > 0 && (
                  <span className={cn(
                    "mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none",
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-blue-100 text-blue-600"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      {!loading && appointments.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "ทั้งหมด",     value: stats.total,      icon: <Calendar size={14} />,     color: "text-gray-700 bg-gray-100" },
            { label: "นัดหมาย",     value: stats.scheduled,  icon: <Clock size={14} />,         color: "text-blue-700 bg-blue-100" },
            { label: "เช็คอินแล้ว", value: stats.checked_in, icon: <CalendarCheck size={14} />, color: "text-green-700 bg-green-100" },
            { label: "ยกเลิก/ไม่มา",value: stats.cancelled,  icon: <CalendarX size={14} />,    color: "text-red-600 bg-red-100" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-3.5 text-center">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5", s.color)}>
                {s.icon}
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Date label + filter tabs */}
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-gray-700">{selectedDateLabel}</p>

        {!loading && appointments.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  filter === tab.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-500 hover:bg-gray-100 shadow-sm"
                )}
              >
                {tab.label}
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  filter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Appointment list */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Calendar size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">ไม่มีนัดหมายในวันนี้</p>
          <p className="text-xs text-gray-400 mt-1">เลือกวันอื่น หรือรอผู้ป่วยทำนัดเข้ามา</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <AlertCircle size={22} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">ไม่มีนัดในสถานะนี้</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-gray-100 z-0" />
          <div className="space-y-3">
            {filtered.map((apt) => {
              const cfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.scheduled;
              const isLoading = actionLoading === apt.id;
              return (
                <div key={apt.id} className="relative flex gap-3 items-start">
                  <div className="flex flex-col items-center flex-shrink-0 w-14 z-10 pt-3.5">
                    <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-white mb-1", cfg.dot)} />
                    <span className="text-xs font-bold text-gray-700 tabular-nums leading-none">
                      {apt.appointmentTime.slice(0, 5)}
                    </span>
                  </div>

                  <div className={cn(
                    "flex-1 bg-white rounded-2xl shadow-sm p-4 border-l-4 transition-all",
                    cfg.border,
                    apt.status === "cancelled" || apt.status === "no_show" ? "opacity-60" : ""
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold",
                        avatarColor(apt.patientId)
                      )}>
                        {getInitials(apt.patientName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate">{apt.patientName}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{apt.reason}</p>
                          </div>
                          <span className={cn("flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium", cfg.badge)}>
                            {cfg.label}
                          </span>
                        </div>

                        {apt.notes && (
                          <p className="text-xs text-gray-400 mt-1 truncate">หมายเหตุ: {apt.notes}</p>
                        )}
                        {apt.cancelReason && apt.status === "cancelled" && (
                          <p className="text-xs text-red-400 mt-1">เหตุผล: {apt.cancelReason}</p>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          <User size={11} className="text-gray-300" />
                          <span className="text-xs text-gray-400">{apt.staffName}</span>
                        </div>
                      </div>
                    </div>

                    {(apt.status === "scheduled" || apt.status === "checked_in") && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                        {apt.status === "scheduled" && (
                          <button
                            onClick={() => checkIn(apt.id)}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                            เช็คอิน
                          </button>
                        )}
                        {apt.status === "checked_in" && (
                          <button
                            onClick={() => markNoShow(apt.id)}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 size={11} className="animate-spin" /> : <AlertCircle size={11} />}
                            ไม่มา
                          </button>
                        )}
                        {apt.status === "scheduled" && (
                          <button
                            onClick={() => cancel(apt.id)}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <XCircle size={11} />
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

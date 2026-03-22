"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  PenLine,
  X,
  Stethoscope,
  FileText,
  AlertCircle,
} from "lucide-react";
import { api, extractError } from "@/lib/api";
import { cn, formatDate, formatDateTime, statusLabel } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Appointment, AppointmentSlot } from "@/types";

const DAY_TH: Record<string, string> = {
  monday: "จันทร์",
  tuesday: "อังคาร",
  wednesday: "พุธ",
  thursday: "พฤหัสบดี",
  friday: "ศุกร์",
  saturday: "เสาร์",
  sunday: "อาทิตย์",
};

const DOW_HEADER = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function isSlotPast(date: string, startTime: string): boolean {
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (date !== todayStr) return false;
  const now = new Date();
  const [h, m] = startTime.split(":").map(Number);
  const slotMinutes = (h ?? 0) * 60 + (m ?? 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= nowMinutes;
}

function getDayName(dateStr: string): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date(dateStr).getDay()]!;
}

/* ── Calendar Picker ─────────────────────────────────────────────────────── */

function CalendarPicker({
  selectedDate,
  onSelect,
  appointments,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  appointments: Appointment[];
}) {
  const today = new Date().toLocaleDateString("en-CA");
  const todayObj = new Date();

  const [viewYear, setViewYear] = useState(() => todayObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => todayObj.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = firstDay.getDay(); // 0 = Sun

  // Build grid cells: null = empty, string = date ISO
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(viewYear, viewMonth, d).toLocaleDateString("en-CA"));
  }

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const aptDates = new Set(appointments.map((a) => a.appointmentDate));

  // Min viewable = current month
  const isCurrentMonth =
    viewYear === todayObj.getFullYear() && viewMonth === todayObj.getMonth();

  const prevMonth = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          disabled={isCurrentMonth}
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
            isCurrentMonth
              ? "text-gray-200 cursor-not-allowed"
              : "text-gray-500 hover:bg-gray-100"
          )}
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-bold text-gray-800">{monthLabel}</p>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_HEADER.map((d, i) => (
          <div
            key={d}
            className={cn(
              "text-center text-xs font-medium py-1",
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;

          const isPast = date < today;
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const hasApt = aptDates.has(date);
          const dow = new Date(date).getDay();

          return (
            <button
              key={date}
              onClick={() => !isPast && onSelect(date)}
              disabled={isPast}
              className={cn(
                "relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all select-none",
                isPast
                  ? "text-gray-200 cursor-not-allowed"
                  : isSelected
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200 scale-105"
                  : isToday
                  ? "bg-blue-50 text-blue-600 ring-2 ring-blue-300"
                  : dow === 0
                  ? "text-red-500 hover:bg-red-50"
                  : dow === 6
                  ? "text-blue-500 hover:bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <span>{parseInt(date.split("-")[2] ?? "0")}</span>
              {hasApt && (
                <span
                  className={cn(
                    "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                    isSelected ? "bg-white/80" : "bg-blue-400"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          มีนัดหมาย
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-lg bg-blue-50 ring-2 ring-blue-300 inline-block" />
          วันนี้
        </span>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function StudentAppointmentsPage() {
  const [tab, setTab] = useState<"upcoming" | "create" | "history">("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(true);

  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookSuccess, setBookSuccess] = useState(false);
  const [detailApt, setDetailApt] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const refreshMyAppointments = useCallback(() => {
    api.get<Appointment[]>("/appointments/my").then((res) => {
      if (res.success)
        setAppointments(Array.isArray(res.data) ? (res.data as unknown as Appointment[]) : []);
      setLoadingApts(false);
    });
  }, []);

  useEffect(() => { refreshMyAppointments(); }, [refreshMyAppointments]);

  // Real-time: refresh when appointment is updated (e.g. staff reschedules/cancels)
  useWebSocket("appointment:update", refreshMyAppointments, [refreshMyAppointments]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    api
      .get<AppointmentSlot[]>(`/appointment-slots/available?date=${selectedDate}`)
      .then((res) => {
        if (res.success)
          setSlots(Array.isArray(res.data) ? (res.data as unknown as AppointmentSlot[]) : []);
        else setSlots([]);
        setLoadingSlots(false);
      });
  }, [selectedDate]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate || !reason.trim()) return;
    setBookError("");
    setBooking(true);

    const res = await api.post<Appointment>("/appointments", {
      slotId: selectedSlot.id,
      date: selectedDate,
      reason: reason.trim(),
      notes: notes.trim() || null,
    });

    setBooking(false);

    if (res.success && res.data) {
      setBookSuccess(true);
      setAppointments((prev) => [res.data!, ...prev]);
      setTimeout(() => {
        setTab("upcoming");
        setBookSuccess(false);
        setSelectedDate("");
        setSelectedSlot(null);
        setReason("");
        setNotes("");
      }, 2000);
    } else {
      setBookError(extractError(res));
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelLoading(true);
    const res = await api.patch(`/appointments/${cancelTarget.id}/cancel`, { cancelReason: cancelReason.trim() });
    setCancelLoading(false);
    if (res.success) {
      setAppointments((prev) => prev.map((a) => (a.id === cancelTarget.id ? { ...a, status: "cancelled" as const, cancelReason: cancelReason.trim() } : a)));
      setCancelTarget(null);
    }
  };

  const todayStr = new Date().toLocaleDateString("en-CA");
  const upcoming = appointments.filter(
    (a) => ["scheduled", "checked_in"].includes(a.status) && a.appointmentDate >= todayStr
  );
  const history = appointments.filter(
    (a) =>
      ["completed", "cancelled", "no_show"].includes(a.status) ||
      (["scheduled", "checked_in"].includes(a.status) && a.appointmentDate < todayStr)
  );

  const canBook =
    !!selectedSlot &&
    !!selectedDate &&
    reason.trim().length > 0 &&
    !booking &&
    !isSlotPast(selectedDate, selectedSlot?.startTime ?? "");

  return (
    <div className="bg-slate-100 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-950 px-4 pb-4 student-header">
        <h1 className="font-bold text-lg text-white">การนัดหมาย</h1>
        <p className="text-blue-200 text-xs mt-0.5">จองนัดพบห้องพยาบาล</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex sticky top-0 z-10">
        {[
          { key: "upcoming", label: "กำลังจะมาถึง" },
          { key: "create", label: "จองนัดใหม่" },
          { key: "history", label: "ประวัติ" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={cn(
              "flex-1 py-3 text-xs font-semibold border-b-2 transition-colors",
              tab === key
                ? "border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-3 py-4">
        {/* ── Upcoming ── */}
        {tab === "upcoming" && (
          <div className="space-y-3">
            {loadingApts ? (
              <div className="py-10 flex justify-center">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm border border-gray-200 dark:border-gray-700">
                <Calendar size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-600 dark:text-gray-300 text-base font-medium">ยังไม่มีนัดหมาย</p>
                <button
                  onClick={() => setTab("create")}
                  className="mt-3 text-blue-700 dark:text-blue-400 text-sm font-semibold hover:underline"
                >
                  จองนัดใหม่ →
                </button>
              </div>
            ) : (
              upcoming.map((apt) => (
                <AppointmentCard key={apt.id} apt={apt} onClick={() => setDetailApt(apt)}
                  onCancel={apt.status === "scheduled" ? () => { setCancelTarget(apt); setCancelReason(""); } : undefined} />
              ))
            )}
          </div>
        )}

        {/* ── Create ── */}
        {tab === "create" && (
          <div className="space-y-4">
            {bookSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
                <p className="font-bold text-green-800 text-base">จองนัดสำเร็จ!</p>
                <p className="text-sm text-green-600 mt-1">กำลังกลับไปหน้านัดหมาย...</p>
              </div>
            ) : (
              <>
                {/* Step 1: Calendar */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    เลือกวันนัดหมาย
                  </h2>
                  <CalendarPicker
                    selectedDate={selectedDate}
                    onSelect={setSelectedDate}
                    appointments={appointments}
                  />
                  {selectedDate && (
                    <p className="mt-3 text-xs text-center text-blue-600 font-semibold">
                      {formatDate(selectedDate)} ({DAY_TH[getDayName(selectedDate)]})
                    </p>
                  )}
                </div>

                {/* Step 2: Slot */}
                {selectedDate && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                        2
                      </span>
                      เลือกเวลา
                    </h2>
                    {loadingSlots ? (
                      <div className="py-4 flex justify-center">
                        <Loader2 size={20} className="animate-spin text-gray-300" />
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="py-4 text-center">
                        <p className="text-sm text-gray-400">ไม่มีช่วงเวลาว่างในวันนี้</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {slots.map((slot) => {
                          const past = isSlotPast(selectedDate, slot.startTime);
                          const unavailable = !!slot.isFull || past;
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot)}
                              disabled={unavailable}
                              className={cn(
                                "p-3 rounded-xl border-2 text-left transition-all",
                                unavailable
                                  ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                                  : selectedSlot?.id === slot.id
                                  ? "border-blue-500 bg-blue-50 shadow-sm"
                                  : "border-gray-200 hover:border-blue-200 bg-white"
                              )}
                            >
                              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                                <Clock size={13} className="text-blue-500" />
                                {slot.startTime.slice(0, 5)} น.
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <User size={11} /> {slot.staffName}
                              </div>
                              {past && <p className="text-[10px] text-gray-400 mt-1">เวลาผ่านไปแล้ว</p>}
                              {slot.isFull && !past && (
                                <p className="text-[10px] text-gray-400 mt-1">เต็มแล้ว</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Reason + Notes */}
                {selectedSlot && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                        3
                      </span>
                      รายละเอียดการนัด
                    </h2>

                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">
                        เหตุผลการนัด <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <PenLine size={14} className="absolute left-3 top-3 text-gray-400" />
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="เช่น ปวดศีรษะ มีไข้ ตรวจสุขภาพ..."
                          maxLength={255}
                          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">
                        หมายเหตุเพิ่มเติม{" "}
                        <span className="text-gray-400">(ไม่บังคับ)</span>
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="ข้อมูลเพิ่มเติมที่ต้องการแจ้งเจ้าหน้าที่..."
                        rows={2}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-gray-50"
                      />
                    </div>
                  </div>
                )}

                {/* Summary + Confirm */}
                {selectedSlot && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-sm font-bold text-blue-800 mb-2">สรุปการนัด</p>
                    <div className="space-y-1 text-sm text-blue-700">
                      <p>📅 {formatDate(selectedDate)} ({DAY_TH[getDayName(selectedDate)]})</p>
                      <p>⏰ {selectedSlot.startTime.slice(0, 5)} น.</p>
                      <p>👨‍⚕️ {selectedSlot.staffName}</p>
                      {reason && (
                        <p className="text-blue-600 text-xs mt-1 truncate">📋 {reason}</p>
                      )}
                    </div>

                    {bookError && (
                      <p className="text-red-600 text-xs mt-2 bg-red-50 rounded-xl p-2">
                        {bookError}
                      </p>
                    )}

                    <button
                      onClick={handleBook}
                      disabled={!canBook}
                      className={cn(
                        "mt-3 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                        canBook
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 active:scale-95"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {booking ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          กำลังจอง...
                        </>
                      ) : (
                        "ยืนยันการจอง"
                      )}
                    </button>
                    {!reason.trim() && selectedSlot && (
                      <p className="text-center text-xs text-gray-400 mt-2">
                        กรุณาระบุเหตุผลการนัดก่อนยืนยัน
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── History ── */}
        {tab === "history" && (
          <div className="space-y-3">
            {loadingApts ? (
              <div className="py-10 flex justify-center">
                <Loader2 size={24} className="animate-spin text-gray-300" />
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm border border-gray-200 dark:border-gray-700">
                <Calendar size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-base">ยังไม่มีประวัตินัดหมาย</p>
              </div>
            ) : (
              history.map((apt) => (
                <AppointmentCard key={apt.id} apt={apt} onClick={() => setDetailApt(apt)} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail bottom sheet */}
      {detailApt && (
        <AppointmentDetailSheet apt={detailApt} onClose={() => setDetailApt(null)} />
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setCancelTarget(null)} />
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl w-full max-w-md p-6 pb-8">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">ยกเลิกนัดหมาย</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                วันที่ {cancelTarget.appointmentDate} เวลา {cancelTarget.appointmentTime.slice(0, 5)} น.
              </p>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                เหตุผลในการยกเลิก <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="เช่น ไม่สะดวก, มีธุระ..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setCancelTarget(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  ปิด
                </button>
                <button onClick={confirmCancel} disabled={!cancelReason.trim() || cancelLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {cancelLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  ยืนยันยกเลิก
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function AppointmentDetailSheet({ apt, onClose }: { apt: Appointment; onClose: () => void }) {
  const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
    scheduled: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    checked_in: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    completed: { color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200" },
    cancelled: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    no_show: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  };
  const cfg = statusConfig[apt.status] ?? statusConfig.scheduled!;
  const d = new Date(apt.appointmentDate);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 pb-8 shadow-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">รายละเอียดการนัด</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100"
          >
            <X size={17} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 pt-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0">
              <span className="text-2xl font-extrabold leading-none">{d.getDate()}</span>
              <span className="text-blue-200 text-xs">
                {d.toLocaleDateString("th-TH", { month: "short" })}
              </span>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                <Clock size={16} className="text-blue-500" />
                {apt.appointmentTime.slice(0, 5)} น.
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {d.toLocaleDateString("th-TH", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold",
              cfg.bg,
              cfg.color,
              cfg.border
            )}
          >
            {apt.status === "cancelled" || apt.status === "no_show" ? (
              <XCircle size={15} />
            ) : (
              <CheckCircle2 size={15} />
            )}
            {statusLabel(apt.status)}
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <Row icon={<Stethoscope size={15} className="text-blue-500" />} label="เจ้าหน้าที่" value={apt.staffName} />
            <Row icon={<FileText size={15} className="text-purple-500" />} label="เหตุผลการนัด" value={apt.reason} />
            {apt.notes && (
              <Row icon={<AlertCircle size={15} className="text-orange-400" />} label="หมายเหตุ" value={apt.notes} />
            )}
            <Row icon={<Clock size={15} className="text-gray-400" />} label="สร้างเมื่อ" value={formatDateTime(apt.createdAt)} />
          </div>

          {apt.cancelReason && apt.status === "cancelled" && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                  <XCircle size={17} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">เหตุผลที่ถูกยกเลิก</p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1 leading-relaxed">{apt.cancelReason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function AppointmentCard({ apt, onClick, onCancel }: { apt: Appointment; onClick: () => void; onCancel?: () => void }) {
  const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    scheduled: {
      icon: <Calendar size={15} className="text-blue-600" />,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    checked_in: {
      icon: <CheckCircle2 size={15} className="text-green-600" />,
      color: "text-green-700",
      bg: "bg-green-50",
    },
    completed: {
      icon: <CheckCircle2 size={15} className="text-gray-500" />,
      color: "text-gray-600",
      bg: "bg-gray-100",
    },
    cancelled: {
      icon: <XCircle size={15} className="text-red-500" />,
      color: "text-red-700",
      bg: "bg-red-50",
    },
    no_show: {
      icon: <XCircle size={15} className="text-orange-500" />,
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
  };

  const cfg = statusConfig[apt.status] ?? statusConfig.scheduled!;
  const d = new Date(apt.appointmentDate);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex text-left active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="w-18 w-[72px] bg-blue-800 dark:bg-blue-900 flex flex-col items-center justify-center text-white flex-shrink-0 py-4">
        <span className="text-2xl font-extrabold leading-none">{d.getDate()}</span>
        <span className="text-blue-200 text-xs mt-0.5">
          {d.toLocaleDateString("th-TH", { month: "short" })}
        </span>
        <span className="text-blue-300 text-[10px] mt-0.5">
          {d.toLocaleDateString("th-TH", { year: "numeric" })}
        </span>
      </div>
      <div className="flex-1 min-w-0 p-3.5 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
            <Clock size={14} className="text-blue-600 dark:text-blue-400" />
            {apt.appointmentTime.slice(0, 5)} น.
          </p>
          <span
            className={cn(
              "text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0",
              cfg.bg,
              cfg.color
            )}
          >
            {statusLabel(apt.status)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
          <User size={13} /> {apt.staffName}
        </p>
        {apt.reason && <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{apt.reason}</p>}
        {apt.status === "cancelled" && apt.cancelReason && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate flex items-center gap-1">
            <XCircle size={11} className="flex-shrink-0" />
            {apt.cancelReason}
          </p>
        )}
        {onCancel && (
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(); }}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
          >
            <XCircle size={13} />
            ยกเลิกนัด
          </button>
        )}
      </div>
      <div className="flex items-center pr-3">
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </div>
  );
}

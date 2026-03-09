"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, statusLabel } from "@/lib/utils";
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

// Generate next 14 days
function getUpcomingDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getDayName(dateStr: string): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date(dateStr).getDay()];
}

export default function StudentAppointmentsPage() {
  const [tab, setTab] = useState<"upcoming" | "create" | "history">("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(true);

  // Create flow
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookSuccess, setBookSuccess] = useState(false);

  const dates = getUpcomingDates();

  useEffect(() => {
    api.get<Appointment[]>("/appointments/my").then((res) => {
      if (res.success) {
        setAppointments(Array.isArray(res.data) ? (res.data as unknown as Appointment[]) : []);
      }
      setLoadingApts(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedDate) { setSlots([]); return; }
    setLoadingSlots(true);
    setSelectedSlot(null);
    api.get<AppointmentSlot[]>(`/appointment-slots/available?date=${selectedDate}`).then((res) => {
      if (res.success) setSlots(Array.isArray(res.data) ? (res.data as unknown as AppointmentSlot[]) : []);
      else setSlots([]);
      setLoadingSlots(false);
    });
  }, [selectedDate]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate) return;
    setBookError("");
    setBooking(true);

    const res = await api.post<Appointment>("/appointments", {
      slotId: selectedSlot.id,
      date: selectedDate,
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
        setNotes("");
      }, 2000);
    } else {
      setBookError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local timezone
  const upcoming = appointments.filter((a) =>
    ["scheduled", "checked_in"].includes(a.status) && a.appointmentDate >= todayStr
  );
  const history = appointments.filter((a) =>
    ["completed", "cancelled", "no_show"].includes(a.status) ||
    (["scheduled", "checked_in"].includes(a.status) && a.appointmentDate < todayStr)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 pt-10 pb-4 px-4 text-white">
        <h1 className="text-xl font-bold">การนัดหมาย</h1>
        <p className="text-blue-200 text-sm">จองนัดพบแพทย์ห้องพยาบาล</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex sticky top-0 z-10">
        {[
          { key: "upcoming", label: "ที่กำลังจะมาถึง" },
          { key: "create", label: "จองนัดใหม่" },
          { key: "history", label: "ประวัติ" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={cn(
              "flex-1 py-3 text-xs font-medium border-b-2 transition-colors",
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {/* Upcoming */}
        {tab === "upcoming" && (
          <div className="space-y-3">
            {loadingApts ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">ยังไม่มีนัดหมาย</p>
                <button
                  onClick={() => setTab("create")}
                  className="mt-3 text-blue-600 text-sm font-medium hover:underline"
                >
                  จองนัดใหม่ →
                </button>
              </div>
            ) : (
              upcoming.map((apt) => (
                <AppointmentCard key={apt.id} apt={apt} />
              ))
            )}
          </div>
        )}

        {/* Create */}
        {tab === "create" && (
          <div className="space-y-4">
            {bookSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-green-800">จองนัดสำเร็จ!</p>
                <p className="text-sm text-green-600 mt-1">กำลังกลับไปหน้านัดหมาย...</p>
              </div>
            ) : (
              <>
                {/* Date picker */}
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">
                    เลือกวันนัดหมาย
                  </h2>
                  <div className="overflow-x-auto -mx-1">
                    <div className="flex gap-2 pb-1 px-1">
                      {dates.map((date) => {
                        const d = new Date(date);
                        const isSelected = selectedDate === date;
                        return (
                          <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={cn(
                              "flex-shrink-0 w-14 py-2 rounded-xl text-center transition-all",
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                          >
                            <div className="text-xs opacity-70">
                              {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][d.getDay()]}
                            </div>
                            <div className="text-lg font-bold leading-tight">
                              {d.getDate()}
                            </div>
                            <div className="text-xs opacity-70">
                              {d.toLocaleDateString("th-TH", { month: "short" })}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Slots */}
                {selectedDate && (
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">
                      ช่วงเวลาที่ว่าง
                    </h2>
                    {loadingSlots ? (
                      <div className="py-4 flex justify-center">
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        ไม่มีช่วงเวลาว่างในวันนี้
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            disabled={!!slot.isFull}
                            className={cn(
                              "p-3 rounded-xl border-2 text-left transition-all",
                              slot.isFull
                                ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                : selectedSlot?.id === slot.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-blue-300"
                            )}
                          >
                            <div className="flex items-center gap-1.5 text-sm font-semibold">
                              <Clock size={14} className="text-blue-500" />
                              {slot.startTime.slice(0, 5)} น.
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <User size={11} />
                              {slot.staffName}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {selectedSlot && (
                  <div className="bg-white rounded-2xl shadow-sm p-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">
                      หมายเหตุ / อาการเบื้องต้น
                    </h2>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ระบุอาการหรือเหตุผลการนัด..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  </div>
                )}

                {/* Summary + confirm */}
                {selectedSlot && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <h2 className="text-sm font-semibold text-blue-800 mb-2">สรุปการนัด</h2>
                    <div className="space-y-1 text-sm text-blue-700">
                      <p>📅 {formatDate(selectedDate)} ({DAY_TH[getDayName(selectedDate)]})</p>
                      <p>⏰ {selectedSlot.startTime.slice(0, 5)} น.</p>
                      <p>👨‍⚕️ {selectedSlot.staffName}</p>
                    </div>
                    {bookError && (
                      <p className="text-red-600 text-xs mt-2 bg-red-50 rounded-lg p-2">
                        {bookError}
                      </p>
                    )}
                    <button
                      onClick={handleBook}
                      disabled={booking}
                      className="mt-3 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      {booking ? (
                        <><Loader2 size={16} className="animate-spin" />กำลังจอง...</>
                      ) : (
                        "ยืนยันการจอง"
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="space-y-3">
            {loadingApts ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-gray-400 text-sm">ยังไม่มีประวัตินัดหมาย</p>
              </div>
            ) : (
              history.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ apt }: { apt: Appointment }) {
  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    scheduled: {
      icon: <Calendar size={16} className="text-blue-600" />,
      color: "bg-blue-50 text-blue-700",
    },
    checked_in: {
      icon: <CheckCircle2 size={16} className="text-green-600" />,
      color: "bg-green-50 text-green-700",
    },
    completed: {
      icon: <CheckCircle2 size={16} className="text-gray-500" />,
      color: "bg-gray-100 text-gray-600",
    },
    cancelled: {
      icon: <XCircle size={16} className="text-red-500" />,
      color: "bg-red-50 text-red-700",
    },
    no_show: {
      icon: <XCircle size={16} className="text-orange-500" />,
      color: "bg-orange-50 text-orange-700",
    },
  };

  const cfg = statusConfig[apt.status] ?? statusConfig.scheduled;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
      <div className="w-12 h-12 bg-blue-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-blue-700 font-bold text-lg leading-none">
          {new Date(apt.appointmentDate).getDate()}
        </span>
        <span className="text-blue-500 text-xs">
          {new Date(apt.appointmentDate).toLocaleDateString("th-TH", { month: "short" })}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800">
            {apt.appointmentTime.slice(0, 5)} น.
          </p>
          <span className={cn("text-xs px-2 py-0.5 rounded-full", cfg.color)}>
            {statusLabel(apt.status)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {apt.staffName}
        </p>
        {apt.reason && (
          <p className="text-xs text-gray-400 truncate">{apt.reason}</p>
        )}
      </div>

      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </div>
  );
}

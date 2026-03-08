"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn, statusLabel } from "@/lib/utils";
import type { Appointment } from "@/types";

function getWeekDates(refDate: Date): Date[] {
  const day = refDate.getDay();
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function StaffAppointmentsPage() {
  const [weekRef, setWeekRef] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const weekDates = getWeekDates(weekRef);

  useEffect(() => {
    setLoading(true);
    api
      .get<Appointment[]>(`/appointments?date=${selectedDate}&limit=50`)
      .then((res) => {
        if (res.success) {
          setAppointments(Array.isArray(res.data) ? (res.data as unknown as Appointment[]) : []);
        }
        setLoading(false);
      });
  }, [selectedDate]);

  const checkIn = async (id: string) => {
    setActionLoading(id);
    await api.patch(`/appointments/${id}/check-in`);
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "checked_in" } : a))
    );
    setActionLoading(null);
  };

  const cancel = async (id: string) => {
    if (!confirm("ยืนยันยกเลิกนัด?")) return;
    setActionLoading(id);
    await api.patch(`/appointments/${id}/cancel`, { cancelReason: "ยกเลิกโดยเจ้าหน้าที่" });
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
    );
    setActionLoading(null);
  };

  const DAY_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">การนัดหมาย</h1>
          <p className="text-sm text-gray-500">จัดการตารางนัดผู้ป่วย</p>
        </div>
        <Link
          href="/staff/appointments/slots"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> จัดการช่วงเวลา
        </Link>
      </div>

      {/* Week calendar */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              const d = new Date(weekRef);
              d.setDate(d.getDate() - 7);
              setWeekRef(d);
            }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {weekDates[0].toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => {
              const d = new Date(weekRef);
              d.setDate(d.getDate() + 7);
              setWeekRef(d);
            }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date) => {
            const dateStr = date.toISOString().split("T")[0];
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "flex flex-col items-center py-2 rounded-xl transition-all",
                  isSelected
                    ? "bg-blue-600 text-white"
                    : isToday
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-100 text-gray-600"
                )}
              >
                <span className="text-xs opacity-70">{DAY_SHORT[date.getDay()]}</span>
                <span className="text-base font-bold leading-tight">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-600">
          {new Date(selectedDate).toLocaleDateString("th-TH", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {" · "}
          <span className="text-blue-600">{appointments.length} นัด</span>
        </p>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <Calendar size={28} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">ไม่มีนัดหมายในวันนี้</p>
          </div>
        ) : (
          appointments
            .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
            .map((apt) => (
              <div key={apt.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
                <div className="w-14 text-center flex-shrink-0">
                  <p className="text-lg font-bold text-blue-600">
                    {apt.appointmentTime.slice(0, 5)}
                  </p>
                  <p className="text-xs text-gray-400">น.</p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {apt.patientName}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{apt.reason}</p>
                  {apt.notes && (
                    <p className="text-xs text-gray-400 truncate">{apt.notes}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      apt.status === "scheduled"
                        ? "bg-blue-100 text-blue-700"
                        : apt.status === "checked_in"
                        ? "bg-green-100 text-green-700"
                        : apt.status === "completed"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-600"
                    )}
                  >
                    {statusLabel(apt.status)}
                  </span>

                  {apt.status === "scheduled" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => checkIn(apt.id)}
                        disabled={actionLoading === apt.id}
                        className="flex items-center gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-lg transition-colors"
                      >
                        {actionLoading === apt.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={11} />
                        )}
                        เช็คอิน
                      </button>
                      <button
                        onClick={() => cancel(apt.id)}
                        disabled={actionLoading === apt.id}
                        className="flex items-center gap-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        <XCircle size={11} />
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AppointmentSlot } from "@/types";

const DAY_OPTIONS = [
  { value: "monday",    label: "วันจันทร์",    int: 1 },
  { value: "tuesday",   label: "วันอังคาร",    int: 2 },
  { value: "wednesday", label: "วันพุธ",       int: 3 },
  { value: "thursday",  label: "วันพฤหัสบดี", int: 4 },
  { value: "friday",    label: "วันศุกร์",     int: 5 },
  { value: "saturday",  label: "วันเสาร์",     int: 6 },
  { value: "sunday",    label: "วันอาทิตย์",  int: 0 },
];

const DAY_SHORT: Record<string, string> = {
  monday: "จ", tuesday: "อ", wednesday: "พ", thursday: "พฤ",
  friday: "ศ", saturday: "ส", sunday: "อา",
};

const DAY_HEADER_COLOR: Record<string, string> = {
  monday:    "bg-red-50 dark:bg-red-950/20",
  tuesday:   "bg-orange-50 dark:bg-orange-950/20",
  wednesday: "bg-green-50 dark:bg-green-950/20",
  thursday:  "bg-yellow-50 dark:bg-yellow-950/20",
  friday:    "bg-blue-50 dark:bg-blue-950/20",
  saturday:  "bg-purple-50 dark:bg-purple-950/20",
  sunday:    "bg-pink-50 dark:bg-pink-950/20",
};

const DAY_BADGE: Record<string, string> = {
  monday:    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  tuesday:   "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  wednesday: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  thursday:  "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  friday:    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  saturday:  "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  sunday:    "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
};

const DAY_TEXT: Record<string, string> = {
  monday:    "text-red-700 dark:text-red-400",
  tuesday:   "text-orange-700 dark:text-orange-400",
  wednesday: "text-green-700 dark:text-green-400",
  thursday:  "text-yellow-700 dark:text-yellow-400",
  friday:    "text-blue-700 dark:text-blue-400",
  saturday:  "text-purple-700 dark:text-purple-400",
  sunday:    "text-pink-700 dark:text-pink-400",
};

export default function SlotsPage() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotDuration, setSlotDuration] = useState(30);

  const load = () => {
    api.get<AppointmentSlot[]>("/appointment-slots?activeOnly=true").then((res) => {
      if (res.success) setSlots(Array.isArray(res.data) ? (res.data as unknown as AppointmentSlot[]) : []);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    const dayInt = DAY_OPTIONS.find((d) => d.value === dayOfWeek)?.int ?? 1;
    const res = await api.post<AppointmentSlot>("/appointment-slots", {
      dayOfWeek: dayInt, startTime, endTime, slotDurationMinutes: slotDuration,
    });
    setSaving(false);
    if (res.success && res.data) {
      setSlots((prev) => [...prev, res.data!]);
      setShowForm(false);
      setStartTime("08:00"); setEndTime("12:00"); setSlotDuration(30);
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const handleToggle = async (slot: AppointmentSlot) => {
    setTogglingId(slot.id);
    const res = await api.put<AppointmentSlot>(`/appointment-slots/${slot.id}`, { isActive: !slot.isActive });
    if (res.success && res.data) {
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, isActive: !s.isActive } : s)));
    }
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบช่วงเวลานี้?")) return;
    setDeletingId(id);
    await api.delete(`/appointment-slots/${id}`);
    setSlots((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  const daysWithSlots = DAY_OPTIONS.map(({ value, label, int }) => ({
    day: value, label,
    slots: slots.filter((s) => s.dayOfWeek === int),
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/staff/appointments" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการช่วงเวลานัด</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">กำหนดวันและเวลาที่พร้อมรับนัดหมาย</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors">
          <Plus size={17} /> เพิ่มช่วงเวลา
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-800 dark:text-white">เพิ่มช่วงเวลาใหม่</h2>

          <div>
            <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3 block">วัน</label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_OPTIONS.map(({ value }) => (
                <button key={value} onClick={() => setDayOfWeek(value)}
                  className={cn(
                    "py-2.5 rounded-xl text-sm font-bold transition-all",
                    dayOfWeek === value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}>
                  {DAY_SHORT[value]}
                </button>
              ))}
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-semibold">
              {DAY_OPTIONS.find((d) => d.value === dayOfWeek)?.label}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 block">เวลาเริ่ม</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 block">เวลาสิ้นสุด</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 block">ทุก (นาที)</label>
              <input type="number" min={10} max={120} step={5} value={slotDuration}
                onChange={(e) => setSlotDuration(parseInt(e.target.value) || 30)}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setShowForm(false); setError(""); }}
              className="px-5 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-base font-semibold transition-colors">
              ยกเลิก
            </button>
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-colors">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              เพิ่มช่วงเวลา
            </button>
          </div>
        </div>
      )}

      {/* Slots list */}
      {loading ? (
        <div className="py-14 flex justify-center">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      ) : slots.length === 0 && !showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-14 text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-base font-semibold text-gray-500 dark:text-gray-400">ยังไม่มีช่วงเวลานัดหมาย</p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            เพิ่มช่วงเวลาแรก
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {daysWithSlots.filter((g) => g.slots.length > 0).map(({ day, label, slots: daySlots }) => (
            <div key={day} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
              {/* Day header */}
              <div className={cn("px-5 py-3.5 flex items-center gap-3", DAY_HEADER_COLOR[day])}>
                <span className={cn("text-base font-bold", DAY_TEXT[day])}>{label}</span>
                <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full ml-auto", DAY_BADGE[day])}>
                  {daySlots.length} ช่วงเวลา
                </span>
              </div>

              {/* Slots */}
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => (
                  <div key={slot.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock size={18} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-800 dark:text-gray-100">
                        {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)} น.
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">ทุก {slot.slotDurationMinutes} นาที</p>
                    </div>
                    <span className={cn(
                      "text-sm font-semibold px-3 py-1 rounded-full",
                      slot.isActive
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    )}>
                      {slot.isActive ? "เปิดรับ" : "ปิด"}
                    </span>
                    <button onClick={() => handleToggle(slot)} disabled={togglingId === slot.id}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                      title={slot.isActive ? "ปิดรับนัด" : "เปิดรับนัด"}>
                      {togglingId === slot.id ? (
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                      ) : slot.isActive ? (
                        <ToggleRight size={24} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft size={24} className="text-gray-400" />
                      )}
                    </button>
                    <button onClick={() => handleDelete(slot.id)} disabled={deletingId === slot.id}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors text-red-400 hover:text-red-600 dark:hover:text-red-400">
                      {deletingId === slot.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AppointmentSlot } from "@/types";

// Backend: dayOfWeek = 0 (Sun) … 6 (Sat), matching JavaScript Date.getDay()
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

const DAY_COLOR: Record<string, string> = {
  monday: "bg-red-100 text-red-700",
  tuesday: "bg-orange-100 text-orange-700",
  wednesday: "bg-green-100 text-green-700",
  thursday: "bg-yellow-100 text-yellow-700",
  friday: "bg-blue-100 text-blue-700",
  saturday: "bg-purple-100 text-purple-700",
  sunday: "bg-pink-100 text-pink-700",
};

export default function SlotsPage() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotDuration, setSlotDuration] = useState(30);

  const load = () => {
    api.get<AppointmentSlot[]>("/appointment-slots").then((res) => {
      if (res.success) {
        setSlots(Array.isArray(res.data) ? (res.data as unknown as AppointmentSlot[]) : []);
      }
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    const dayInt = DAY_OPTIONS.find((d) => d.value === dayOfWeek)?.int ?? 1;
    const res = await api.post<AppointmentSlot>("/appointment-slots", {
      dayOfWeek: dayInt,
      startTime,
      endTime,
      slotDurationMinutes: slotDuration,
    });
    setSaving(false);
    if (res.success && res.data) {
      setSlots((prev) => [...prev, res.data!]);
      setShowForm(false);
      // Reset
      setStartTime("08:00");
      setEndTime("12:00");
      setSlotDuration(30);
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const handleToggle = async (slot: AppointmentSlot) => {
    setTogglingId(slot.id);
    const res = await api.put<AppointmentSlot>(`/appointment-slots/${slot.id}`, {
      isActive: !slot.isActive,
    });
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

  // Group by day (backend returns integer dayOfWeek)
  const grouped = DAY_OPTIONS.map(({ value, label, int }) => ({
    day: value,
    label,
    slots: slots.filter((s) => s.dayOfWeek === int),
  })).filter((g) => g.slots.length > 0 || showForm);

  const daysWithSlots = DAY_OPTIONS.map(({ value, label, int }) => ({
    day: value,
    label,
    slots: slots.filter((s) => s.dayOfWeek === int),
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/staff/appointments" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">จัดการช่วงเวลานัด</h1>
          <p className="text-sm text-gray-500">กำหนดวันและเวลาที่พร้อมรับนัดหมาย</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          เพิ่มช่วงเวลา
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">ช่วงเวลาใหม่</h2>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">วัน</label>
            <div className="grid grid-cols-7 gap-1">
              {DAY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDayOfWeek(value)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-medium transition-all",
                    dayOfWeek === value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {DAY_SHORT[value]}
                </button>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-1">{DAY_OPTIONS.find((d) => d.value === dayOfWeek)?.label}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">เวลาเริ่ม</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">เวลาสิ้นสุด</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ทุก (นาที)</label>
              <input
                type="number"
                min={10}
                max={120}
                step={5}
                value={slotDuration}
                onChange={(e) => setSlotDuration(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              เพิ่มช่วงเวลา
            </button>
          </div>
        </div>
      )}

      {/* Slots grouped by day */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : slots.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <Clock size={28} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm text-gray-400">ยังไม่มีช่วงเวลานัดหมาย</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            เพิ่มช่วงเวลาแรก
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {daysWithSlots.filter((g) => g.slots.length > 0).map(({ day, label, slots: daySlots }) => (
            <div key={day} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className={cn("px-4 py-2.5 flex items-center gap-2", DAY_COLOR[day])}>
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs opacity-70 ml-auto">{daySlots.length} ช่วงเวลา</span>
              </div>
              <div className="divide-y divide-gray-50">
                {daySlots
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((slot) => (
                    <div key={slot.id} className="flex items-center gap-3 px-4 py-3">
                      <Clock size={14} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)} น.
                        </p>
                        <p className="text-xs text-gray-400">ทุก {slot.slotDurationMinutes} นาที</p>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        slot.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {slot.isActive ? "เปิดรับ" : "ปิด"}
                      </span>
                      <button
                        onClick={() => handleToggle(slot)}
                        disabled={togglingId === slot.id}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                        title={slot.isActive ? "ปิดรับนัด" : "เปิดรับนัด"}
                      >
                        {togglingId === slot.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : slot.isActive ? (
                          <ToggleRight size={18} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        disabled={deletingId === slot.id}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600"
                      >
                        {deletingId === slot.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
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

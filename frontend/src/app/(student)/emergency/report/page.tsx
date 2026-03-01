"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type IncidentType = "injury" | "illness" | "accident" | "fainting" | "other";
type Severity = "low" | "medium" | "high" | "critical";

interface GpsState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string;
}

const INCIDENT_TYPES: { value: IncidentType; label: string; emoji: string }[] = [
  { value: "injury", label: "บาดเจ็บ", emoji: "🩹" },
  { value: "illness", label: "ป่วย", emoji: "🤒" },
  { value: "accident", label: "อุบัติเหตุ", emoji: "🚨" },
  { value: "fainting", label: "หมดสติ", emoji: "😵" },
  { value: "other", label: "อื่นๆ", emoji: "❓" },
];

const SEVERITIES: { value: Severity; label: string; color: string; desc: string }[] = [
  { value: "low", label: "ต่ำ", color: "border-green-400 bg-green-50 text-green-700", desc: "อาการน้อย" },
  { value: "medium", label: "ปานกลาง", color: "border-yellow-400 bg-yellow-50 text-yellow-700", desc: "ต้องดูแล" },
  { value: "high", label: "สูง", color: "border-orange-400 bg-orange-50 text-orange-700", desc: "เร่งด่วน" },
  { value: "critical", label: "วิกฤต", color: "border-red-500 bg-red-50 text-red-700", desc: "ฉุกเฉิน!" },
];

export default function EmergencyReportPage() {
  const router = useRouter();
  const [gps, setGps] = useState<GpsState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: true,
    error: "",
  });
  const [incidentType, setIncidentType] = useState<IncidentType | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Auto-get GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGps((s) => ({ ...s, loading: false, error: "อุปกรณ์ไม่รองรับ GPS" }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          loading: false,
          error: "",
        });
      },
      (err) => {
        setGps((s) => ({
          ...s,
          loading: false,
          error: err.code === 1 ? "กรุณาอนุญาต GPS" : "ไม่สามารถดึง GPS ได้",
        }));
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentType || !severity) return;
    setSubmitError("");
    setSubmitting(true);

    const res = await api.post<{ id: string }>("/incidents", {
      incidentType,
      severity,
      description: description.trim() || null,
      latitude: gps.lat,
      longitude: gps.lng,
      locationName: locationName.trim() || null,
    });

    setSubmitting(false);

    if (res.success && res.data) {
      router.push(`/student/emergency/track/${res.data.id}`);
    } else {
      setSubmitError(res.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  const canSubmit = incidentType !== "" && severity !== "" && !submitting;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1 hover:bg-red-700 rounded-lg">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="font-bold text-lg">แจ้งเหตุฉุกเฉิน</h1>
          <p className="text-red-200 text-xs">กรอกข้อมูลให้ครบถ้วน</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-5 pb-24">
        {/* GPS Status */}
        <div
          className={cn(
            "rounded-xl p-3 flex items-center gap-3",
            gps.loading
              ? "bg-blue-50 border border-blue-200"
              : gps.error
              ? "bg-yellow-50 border border-yellow-200"
              : "bg-green-50 border border-green-200"
          )}
        >
          {gps.loading ? (
            <Loader2 size={18} className="text-blue-500 animate-spin flex-shrink-0" />
          ) : gps.error ? (
            <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {gps.loading ? (
              <p className="text-sm text-blue-700">กำลังดึงตำแหน่ง GPS...</p>
            ) : gps.error ? (
              <p className="text-sm text-yellow-700">{gps.error}</p>
            ) : (
              <>
                <p className="text-sm text-green-700 font-medium">ดึง GPS สำเร็จ</p>
                <p className="text-xs text-green-600">
                  {gps.lat?.toFixed(5)}, {gps.lng?.toFixed(5)} ±{gps.accuracy}m
                </p>
              </>
            )}
          </div>
          <MapPin
            size={18}
            className={cn(
              "flex-shrink-0",
              gps.lat ? "text-green-500" : "text-gray-300"
            )}
          />
        </div>

        {/* Location name (optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            สถานที่ <span className="text-gray-400 font-normal">(ระบุเพิ่มเติม)</span>
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="เช่น อาคาร 3 ห้อง 302"
            maxLength={255}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
          />
        </div>

        {/* Incident Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ประเภทเหตุการณ์ <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {INCIDENT_TYPES.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => setIncidentType(value)}
                className={cn(
                  "py-3 rounded-xl border-2 text-center transition-all",
                  incidentType === value
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <div className="text-2xl">{emoji}</div>
                <div
                  className={cn(
                    "text-xs font-medium mt-1",
                    incidentType === value ? "text-red-700" : "text-gray-600"
                  )}
                >
                  {label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ความรุนแรง <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SEVERITIES.map(({ value, label, color, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSeverity(value)}
                className={cn(
                  "py-3 px-3 rounded-xl border-2 text-left transition-all",
                  severity === value
                    ? color + " border-current"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <div
                  className={cn(
                    "text-sm font-bold",
                    severity === value ? "" : "text-gray-700"
                  )}
                >
                  {label}
                </div>
                <div
                  className={cn(
                    "text-xs mt-0.5",
                    severity === value ? "opacity-70" : "text-gray-400"
                  )}
                >
                  {desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            รายละเอียดเพิ่มเติม
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายสิ่งที่เกิดขึ้น..."
            maxLength={1000}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {description.length}/1000
          </p>
        </div>

        {/* Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 items-start">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 flex gap-3">
          <a
            href="tel:191"
            className="flex-none flex items-center justify-center gap-2 px-5 py-3 border-2 border-red-500 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-50"
          >
            📞 โทร 191
          </a>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
              canSubmit
                ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" />กำลังส่ง...</>
            ) : (
              <>🆘 แจ้งเหตุฉุกเฉิน</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

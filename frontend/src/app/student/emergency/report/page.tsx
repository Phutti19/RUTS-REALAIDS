"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Navigation,
  Siren,
  MapPin,
  Phone,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[200px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
        <Loader2 size={20} className="text-gray-400 animate-spin" />
      </div>
    ),
  }
);

type IncidentType = "injury" | "illness" | "accident" | "fainting" | "other";
type Severity = "low" | "medium" | "high" | "critical";

interface GpsState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string;
}

const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? "7.1907");
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? "100.5930");

const INCIDENT_TYPES: { value: IncidentType; label: string; emoji: string; bg: string; activeBg: string }[] = [
  { value: "injury",   label: "บาดเจ็บ",   emoji: "🩹", bg: "bg-rose-50",   activeBg: "bg-rose-500" },
  { value: "illness",  label: "ป่วย",       emoji: "🤒", bg: "bg-amber-50",  activeBg: "bg-amber-500" },
  { value: "accident", label: "อุบัติเหตุ", emoji: "🚨", bg: "bg-red-50",    activeBg: "bg-red-500" },
  { value: "fainting", label: "หมดสติ",    emoji: "😵", bg: "bg-purple-50", activeBg: "bg-purple-500" },
  { value: "other",    label: "อื่นๆ",      emoji: "❓", bg: "bg-gray-50",   activeBg: "bg-gray-500" },
];

const SEVERITIES: {
  value: Severity; label: string; desc: string; emoji: string;
  activeGradient: string; activeText: string; bar: string;
}[] = [
  {
    value: "low", label: "ต่ำ", desc: "อาการเล็กน้อย", emoji: "🟢",
    activeGradient: "from-green-500 to-green-600",
    activeText: "text-white", bar: "w-1/4 bg-green-400",
  },
  {
    value: "medium", label: "ปานกลาง", desc: "ต้องการดูแล", emoji: "🟡",
    activeGradient: "from-yellow-400 to-yellow-500",
    activeText: "text-white", bar: "w-2/4 bg-yellow-400",
  },
  {
    value: "high", label: "สูง", desc: "เร่งด่วน", emoji: "🟠",
    activeGradient: "from-orange-500 to-orange-600",
    activeText: "text-white", bar: "w-3/4 bg-orange-400",
  },
  {
    value: "critical", label: "วิกฤต", desc: "ฉุกเฉินทันที!", emoji: "🔴",
    activeGradient: "from-red-600 to-red-700",
    activeText: "text-white", bar: "w-full bg-red-500",
  },
];

export default function EmergencyReportPage() {
  const router = useRouter();
  const [gps, setGps] = useState<GpsState>({ lat: null, lng: null, accuracy: null, loading: true, error: "" });
  const [pickedLat, setPickedLat] = useState(DEFAULT_LAT);
  const [pickedLng, setPickedLng] = useState(DEFAULT_LNG);
  const [incidentType, setIncidentType] = useState<IncidentType | "">("");
  const [severity, setSeverity] = useState<Severity | "">("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [gpsRetry, setGpsRetry] = useState(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGps((s) => ({ ...s, loading: false, error: "อุปกรณ์ไม่รองรับ GPS" }));
      return;
    }
    setGps((s) => ({ ...s, loading: true, error: "" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), loading: false, error: "" });
        setPickedLat(pos.coords.latitude);
        setPickedLng(pos.coords.longitude);
      },
      (err) => {
        setGps((s) => ({ ...s, loading: false, error: err.code === 1 ? "ไม่ได้รับอนุญาต GPS" : "ไม่สามารถดึง GPS ได้" }));
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [gpsRetry]);

  const handlePickedLocation = useCallback((lat: number, lng: number) => {
    setPickedLat(lat);
    setPickedLng(lng);
  }, []);

  const handleResetToGps = () => {
    setPickedLat(gps.lat ?? DEFAULT_LAT);
    setPickedLng(gps.lng ?? DEFAULT_LNG);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!incidentType || !severity) return;
    setSubmitError("");
    setSubmitting(true);
    const res = await api.post<{ id: string }>("/incidents", {
      incidentType, severity,
      description: description.trim() || null,
      latitude: pickedLat, longitude: pickedLng,
      locationName: locationName.trim() || null,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      router.push(`/student/emergency/track/${res.data.id}`);
    } else {
      setSubmitError(res.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };

  const canSubmit = incidentType !== "" && severity !== "" && !submitting && !gps.loading;
  const step = incidentType === "" ? 1 : severity === "" ? 2 : 3;
  const stepProgress = ((step - 1) / 2) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 via-red-600 to-rose-700 text-white px-4 pt-4 pb-5 sticky top-0 z-10 shadow-lg shadow-red-900/20">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Siren size={15} className="animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">แจ้งเหตุฉุกเฉิน</h1>
              <p className="text-red-200 text-[11px]">กรอกข้อมูลให้ครบก่อนส่ง</p>
            </div>
          </div>
          <a
            href="tel:191"
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors active:scale-95"
          >
            <Phone size={13} /> โทร 191
          </a>
        </div>

        {/* Step progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            {["ตำแหน่ง", "ประเภท & ความรุนแรง", "รายละเอียด"].map((label, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={cn(
                  "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all",
                  i + 1 <= step ? "bg-white text-red-600" : "bg-white/20 text-white/60"
                )}>
                  {i + 1 < step ? "✓" : i + 1}
                </div>
                <span className={cn("text-[10px] hidden sm:block", i + 1 <= step ? "text-white" : "text-red-300")}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, stepProgress)}%` }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4 pb-32">
        {/* GPS Status */}
        <div className={cn(
          "rounded-2xl p-3 flex items-center gap-3 border",
          gps.loading ? "bg-blue-50 border-blue-100" : gps.error ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"
        )}>
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
            gps.loading ? "bg-blue-100" : gps.error ? "bg-amber-100" : "bg-emerald-100"
          )}>
            {gps.loading ? (
              <Loader2 size={16} className="text-blue-500 animate-spin" />
            ) : gps.error ? (
              <AlertCircle size={16} className="text-amber-500" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {gps.loading ? (
              <p className="text-sm text-blue-700 font-medium">กำลังดึงตำแหน่ง GPS...</p>
            ) : gps.error ? (
              <>
                <p className="text-sm text-amber-700 font-medium">{gps.error}</p>
                <p className="text-xs text-amber-600">ปักหมุดตำแหน่งบนแผนที่ด้วยตนเอง</p>
              </>
            ) : (
              <>
                <p className="text-sm text-emerald-700 font-medium">ดึง GPS สำเร็จ ✓</p>
                <p className="text-xs text-emerald-600">ความแม่นยำ ±{gps.accuracy}ม. · ลากหมุดเพื่อปรับ</p>
              </>
            )}
          </div>
          {gps.error && (
            <button
              type="button"
              onClick={() => setGpsRetry((n) => n + 1)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
            >
              <RefreshCw size={12} /> ลองใหม่
            </button>
          )}
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ position: "relative", zIndex: 0 }}>
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                <MapPin size={14} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">ตำแหน่งเกิดเหตุ</p>
                <p className="text-[11px] text-gray-400 font-mono">
                  {gps.loading ? "รอ GPS..." : `${pickedLat.toFixed(5)}, ${pickedLng.toFixed(5)}`}
                </p>
              </div>
            </div>
            {!gps.loading && (
              <button
                type="button"
                onClick={handleResetToGps}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <Navigation size={12} />
                {gps.lat ? "ตำแหน่งฉัน" : "มทร.ศรีวิชัย"}
              </button>
            )}
          </div>
          <div className="px-3 pb-3">
            <LocationPicker lat={pickedLat} lng={pickedLng} onChange={handlePickedLocation} />
            <p className="text-xs text-gray-400 mt-2 text-center">แตะแผนที่หรือลากหมุดแดงเพื่อปรับตำแหน่ง</p>
          </div>
        </div>

        {/* Location name */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            สถานที่ <span className="text-gray-400 font-normal text-xs">(ระบุเพิ่มเติม)</span>
          </label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="เช่น อาคาร 3 ห้อง 302"
              maxLength={255}
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Incident Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center">2</div>
            <label className="text-sm font-semibold text-gray-800">
              ประเภทเหตุการณ์ <span className="text-red-500">*</span>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {INCIDENT_TYPES.map(({ value, label, emoji, activeBg }) => {
              const active = incidentType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIncidentType(value)}
                  className={cn(
                    "relative py-3.5 rounded-2xl border-2 text-center transition-all duration-200 active:scale-95",
                    active
                      ? `${activeBg} border-transparent shadow-md`
                      : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
                  )}
                >
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white/30 rounded-full flex items-center justify-center text-[9px] text-white font-bold">✓</span>
                  )}
                  <div className="text-2xl mb-1">{emoji}</div>
                  <div className={cn("text-xs font-semibold", active ? "text-white" : "text-gray-600")}>
                    {label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center">3</div>
            <label className="text-sm font-semibold text-gray-800">
              ความรุนแรง <span className="text-red-500">*</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SEVERITIES.map(({ value, label, desc, emoji, activeGradient, bar }) => {
              const active = severity === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSeverity(value)}
                  className={cn(
                    "relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95 overflow-hidden",
                    active
                      ? `bg-gradient-to-br ${activeGradient} border-transparent shadow-md`
                      : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
                  )}
                >
                  {active && value === "critical" && (
                    <span className="absolute inset-0 bg-white/5 animate-pulse rounded-2xl" />
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{emoji}</span>
                    {active && <span className="text-white/80 text-[10px] font-bold">✓ เลือก</span>}
                  </div>
                  <div className={cn("text-sm font-bold mb-0.5", active ? "text-white" : "text-gray-800")}>
                    {label}
                  </div>
                  <div className={cn("text-xs", active ? "text-white/80" : "text-gray-400")}>
                    {desc}
                  </div>
                  {/* Severity bar */}
                  <div className={cn("mt-2 h-1 rounded-full", active ? "bg-white/20" : "bg-gray-200")}>
                    <div className={cn("h-full rounded-full transition-all", active ? "bg-white/60" : bar)} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center">4</div>
            <label className="text-sm font-semibold text-gray-800">รายละเอียดเพิ่มเติม</label>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายสิ่งที่เกิดขึ้น เช่น อาการ จำนวนผู้บาดเจ็บ ..."
            maxLength={1000}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm resize-none bg-gray-50 focus:bg-white transition-colors"
          />
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden mr-3">
              <div
                className="h-full bg-red-400 rounded-full transition-all"
                style={{ width: `${(description.length / 1000) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 flex-shrink-0">{description.length}/1000</p>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex gap-2.5 items-start">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Bottom actions */}
        <div className="fixed bottom-[58px] left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200">
          <div className="max-w-md mx-auto px-4 py-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                canSubmit
                  ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" /> กำลังส่ง...</>
              ) : (
                <><Siren size={18} /> ส่งแจ้งเหตุ</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

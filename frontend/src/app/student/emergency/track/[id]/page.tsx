"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  CheckCircle2, Clock, Loader2, Phone, User,
  MapPin, Siren, Home, ShieldCheck, Navigation,
} from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn, formatDateTime, incidentTypeLabel, severityLabel } from "@/lib/utils";
import type { IncidentDetail } from "@/types";

const STATUS_STEPS: {
  key: string; label: string; desc: string;
  icon: React.ReactNode; activeIcon: React.ReactNode;
}[] = [
  {
    key: "pending",
    label: "รอรับเรื่อง",
    desc: "เจ้าหน้าที่จะรับเรื่องโดยเร็ว",
    icon: <Clock size={14} />,
    activeIcon: <Loader2 size={14} className="animate-spin" />,
  },
  {
    key: "accepted",
    label: "รับเรื่องแล้ว",
    desc: "เจ้าหน้าที่กำลังเตรียมตัว",
    icon: <CheckCircle2 size={14} />,
    activeIcon: <User size={14} />,
  },
  {
    key: "in_progress",
    label: "กำลังช่วยเหลือ",
    desc: "เจ้าหน้าที่กำลังเดินทาง",
    icon: <CheckCircle2 size={14} />,
    activeIcon: <Navigation size={14} className="animate-pulse" />,
  },
  {
    key: "completed",
    label: "เสร็จสิ้น",
    desc: "ได้รับการช่วยเหลือแล้ว",
    icon: <CheckCircle2 size={14} />,
    activeIcon: <ShieldCheck size={14} />,
  },
];

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  low:      { label: "ต่ำ",       color: "text-green-700",  bg: "bg-green-100",  dot: "bg-green-500" },
  medium:   { label: "ปานกลาง",  color: "text-yellow-700", bg: "bg-yellow-100", dot: "bg-yellow-500" },
  high:     { label: "สูง",       color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-500" },
  critical: { label: "วิกฤต",    color: "text-red-700",    bg: "bg-red-100",    dot: "bg-red-500" },
};

function getStepIndex(status: string): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

interface EmergencyContact {
  id: string;
  name: string;
  category: string;
  phone: string;
  note?: string;
}

export default function TrackIncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [infirmaryPhone, setInfirmaryPhone] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.get<IncidentDetail>(`/incidents/${id}`).then((res) => {
      if (res.success && res.data) setIncident(res.data);
      else setError("ไม่พบข้อมูลเหตุการณ์");
      setLoading(false);
    });
    // Fetch emergency contacts & infirmary phone
    api.get<EmergencyContact[]>("/emergency-contacts").then((res) => {
      if (res.success && Array.isArray(res.data)) setContacts(res.data);
    });
    api.get<{ name: string; phone: string | null }>("/settings/infirmary").then((res) => {
      if (res.success && res.data?.phone) setInfirmaryPhone(res.data.phone);
    });
    api.get<{ confirmed: boolean }>(`/incidents/${id}/confirmed`).then((res) => {
      if (res.success && res.data) setConfirmed(res.data.confirmed);
    });
  }, [id]);

  useWebSocket<IncidentDetail>("incident:status_update", (data) => {
    if (data.id === id) {
      setIncident((prev) =>
        prev ? { ...prev, status: data.status as IncidentDetail["status"], responder: data.responder ?? prev.responder } : prev
      );
    }
  }, [id]);

  useWebSocket<IncidentDetail>("incident:accepted", (data) => {
    if (data.id === id) {
      setIncident((prev) => prev ? { ...prev, status: "accepted", responder: data.responder } : prev);
    }
  }, [id]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await api.post<{ confirmed: boolean }>(`/incidents/${id}/confirm`);
      if (res.success) setConfirmed(true);
    } catch {
      // silently fail
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">กำลังโหลด...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-600">{error}</p>
        <Link href="/student/dashboard" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
          <Home size={14} /> กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const currentStep = getStepIndex(incident.status);
  const isCompleted = incident.status === "completed";
  const severityCfg = SEVERITY_CONFIG[incident.severity] ?? SEVERITY_CONFIG.medium;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className={cn(
        "relative overflow-hidden px-4 pb-6 text-white text-center student-header",
        isCompleted
          ? "bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700"
          : "bg-gradient-to-br from-red-500 via-rose-600 to-red-700"
      )}>
        {/* Background circles decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={cn(
            "absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10",
            isCompleted ? "bg-white" : "bg-white"
          )} />
          <div className={cn(
            "absolute -bottom-12 -left-10 w-52 h-52 rounded-full opacity-10",
            isCompleted ? "bg-teal-300" : "bg-rose-300"
          )} />
        </div>

        {/* Status icon */}
        <div className="relative z-10 flex justify-center mb-3">
          {isCompleted ? (
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <div className="w-11 h-11 bg-white/30 rounded-full flex items-center justify-center">
                <CheckCircle2 size={26} className="text-white" />
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 w-16 h-16 bg-white/20 rounded-full animate-ping" />
              <div className="relative w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-11 h-11 bg-white/30 rounded-full flex items-center justify-center">
                  <Siren size={22} className="text-white animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </div>

        <h1 className="relative z-10 text-lg font-bold mb-1">
          {isCompleted ? "ได้รับการช่วยเหลือแล้ว" : "กำลังรอความช่วยเหลือ"}
        </h1>
        <p className="relative z-10 text-white/70 text-xs">
          เหตุการณ์ #{id.slice(0, 8).toUpperCase()}
        </p>

        {/* Current status badge */}
        {!isCompleted && (
          <div className="relative z-10 inline-flex items-center gap-1.5 mt-3 bg-white/15 border border-white/20 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-medium">{STATUS_STEPS[currentStep]?.label ?? ""}</span>
          </div>
        )}
      </div>

      <div className="px-3 py-3 space-y-2.5 -mt-2">

        {/* Status timeline */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock size={12} className="text-blue-600" />
            </div>
            สถานะการช่วยเหลือ
          </h2>

          <div className="space-y-0">
            {STATUS_STEPS.map((step, idx) => {
              const done = idx <= currentStep;
              const active = idx === currentStep && !isCompleted;
              const isLast = idx === STATUS_STEPS.length - 1;
              return (
                <div key={step.key} className="flex gap-3">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center w-9 flex-shrink-0">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
                      active
                        ? "bg-blue-600 ring-4 ring-blue-100 shadow-lg shadow-blue-200"
                        : done
                        ? "bg-emerald-500 shadow-sm"
                        : "bg-gray-100"
                    )}>
                      {done && !active
                        ? <span className="text-white">{step.icon}</span>
                        : active
                        ? <span className="text-white">{step.activeIcon}</span>
                        : <span className="text-gray-400">{step.icon}</span>
                      }
                    </div>
                    {!isLast && (
                      <div className={cn(
                        "w-0.5 flex-1 min-h-[20px] mt-1 rounded-full transition-all duration-500",
                        done ? "bg-emerald-400" : "bg-gray-100"
                      )} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn("pb-4 pt-1", isLast && "pb-0")}>
                    <p className={cn(
                      "text-sm font-semibold leading-tight",
                      active ? "text-blue-700" : done ? "text-gray-800" : "text-gray-400"
                    )}>
                      {step.label}
                      {active && <span className="ml-1.5 text-[10px] font-normal bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">กำลังดำเนินการ</span>}
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5",
                      active ? "text-blue-500" : done ? "text-gray-400" : "text-gray-300"
                    )}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confirmation card */}
        {isCompleted && confirmed === false && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-4 shadow-sm border border-emerald-200 dark:border-emerald-800">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">ยืนยันการรับความช่วยเหลือ</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  กรุณายืนยันว่าคุณได้รับการช่วยเหลือเรียบร้อยแล้ว
                </p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                {confirming ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {confirming ? "กำลังยืนยัน..." : "ยืนยันว่าได้รับการช่วยเหลือแล้ว"}
              </button>
              <p className="text-[10px] text-gray-400">
                หากไม่กดยืนยัน ระบบจะยืนยันให้อัตโนมัติใน 24 ชั่วโมง
              </p>
            </div>
          </div>
        )}

        {/* Confirmed success */}
        {isCompleted && confirmed === true && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3.5 shadow-sm border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">ยืนยันเรียบร้อยแล้ว</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">ขอบคุณที่ยืนยันการรับความช่วยเหลือ</p>
              </div>
            </div>
          </div>
        )}

        {/* Responder */}
        {incident.responder && (
          <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center">
                <User size={12} className="text-emerald-600" />
              </div>
              ผู้รับผิดชอบ
            </h2>
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-3 py-3">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {getInitials(incident.responder.firstName, incident.responder.lastName)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {incident.responder.firstName} {incident.responder.lastName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  รับเรื่อง {formatDateTime(incident.responder.acceptedAt)}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                  เจ้าหน้าที่
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Incident details */}
        <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-100 rounded-lg flex items-center justify-center">
              <Siren size={12} className="text-gray-600" />
            </div>
            รายละเอียดเหตุการณ์
          </h2>

          <div className="space-y-2.5">
            {/* Type + Severity row */}
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 rounded-xl p-2.5">
                <p className="text-[10px] text-gray-400 mb-1">ประเภท</p>
                <p className="text-sm font-semibold text-gray-800">{incidentTypeLabel(incident.incidentType)}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-2.5">
                <p className="text-[10px] text-gray-400 mb-1">ความรุนแรง</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", severityCfg.dot)} />
                  <span className={cn("text-sm font-semibold", severityCfg.color)}>{severityLabel(incident.severity)}</span>
                </div>
              </div>
            </div>

            {/* GPS */}
            {incident.latitude && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400">ตำแหน่ง GPS</p>
                  <p className="text-xs font-mono text-gray-700 truncate">
                    {incident.latitude.toFixed(5)}, {incident.longitude?.toFixed(5)}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {incident.description && (
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[10px] text-gray-400 mb-1">รายละเอียด</p>
                <p className="text-sm text-gray-700">{incident.description}</p>
              </div>
            )}

            {/* Time */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
              <span>เวลาแจ้ง</span>
              <span className="font-medium text-gray-600">{formatDateTime(incident.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Emergency contacts */}
        {(infirmaryPhone || contacts.length > 0) && (
          <div className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <div className="w-5 h-5 bg-red-100 rounded-lg flex items-center justify-center">
                <Phone size={12} className="text-red-500" />
              </div>
              เบอร์ฉุกเฉิน
            </h2>
            <div className="grid gap-2">
              {infirmaryPhone && (
                <a
                  href={`tel:${infirmaryPhone}`}
                  className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 active:scale-95 rounded-xl px-3 py-3 transition-all"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-400">ห้องพยาบาล</p>
                    <p className="text-sm font-bold text-blue-700">{infirmaryPhone}</p>
                  </div>
                </a>
              )}
              {contacts.map((c) => (
                <a
                  key={c.id}
                  href={`tel:${c.phone}`}
                  className="flex items-center gap-2.5 bg-red-50 border border-red-100 hover:bg-red-100 active:scale-95 rounded-xl px-3 py-3 transition-all"
                >
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-red-400">{c.category === "hospital" ? "โรงพยาบาล" : c.category === "police" ? "ตำรวจ" : c.category === "rescue" ? "กู้ชีพ" : c.category === "fire" ? "ดับเพลิง" : "อื่นๆ"}</p>
                    <p className="text-sm font-bold text-red-700">{c.name} — {c.phone}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/student/dashboard"
          className="flex items-center justify-center gap-2 py-3 text-xs text-gray-500 hover:text-gray-700 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
        >
          <Home size={15} /> กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Siren,
  Users,
  Pill,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Loader2,
  Volume2,
  VolumeX,
  Stethoscope,
  ClipboardList,
  MapPin,
  Activity,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn, timeAgo, statusLabel } from "@/lib/utils";
import type { DashboardReport, Incident } from "@/types";

// Leaflet ต้องโหลดแบบ dynamic (ไม่ใช้ SSR)
const EmergencyMap = dynamic(
  () => import("@/components/maps/EmergencyMap").then((m) => m.EmergencyMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

function MapSkeleton() {
  return (
    <div className="w-full h-full rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <MapPin size={28} className="animate-bounce" />
        <span className="text-sm">กำลังโหลดแผนที่...</span>
      </div>
    </div>
  );
}

interface QueueVisit {
  id: string;
  chiefComplaint: string;
  visitType: string;
  status: string;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
  };
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  badge?: number;
  color: "red" | "blue" | "amber" | "indigo";
  alert?: boolean;
}

const COLOR_MAP = {
  red: {
    icon: "bg-red-100 dark:bg-red-900/30",
    iconText: "text-red-600 dark:text-red-400",
    badge: "bg-red-600",
    border: "border-red-200 dark:border-red-800",
    bg: "bg-red-50/60 dark:bg-red-950/20",
    value: "text-red-700 dark:text-red-400",
  },
  blue: {
    icon: "bg-blue-100 dark:bg-blue-900/30",
    iconText: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-600",
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50/60 dark:bg-blue-950/20",
    value: "text-blue-700 dark:text-blue-400",
  },
  amber: {
    icon: "bg-amber-100 dark:bg-amber-900/30",
    iconText: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500",
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50/60 dark:bg-amber-950/20",
    value: "text-amber-700 dark:text-amber-400",
  },
  indigo: {
    icon: "bg-indigo-100 dark:bg-indigo-900/30",
    iconText: "text-indigo-600 dark:text-indigo-400",
    badge: "bg-indigo-600",
    border: "border-indigo-200 dark:border-indigo-800",
    bg: "bg-white dark:bg-gray-800",
    value: "text-gray-800 dark:text-gray-100",
  },
};

function StatCard({ href, icon, label, value, sub, badge, color, alert }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col gap-3 p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md active:scale-[0.98]",
        alert ? cn(c.bg, c.border) : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.icon)}>
          <span className={c.iconText}>{icon}</span>
        </div>
        {badge != null && badge > 0 && (
          <span className={cn("text-xs font-bold text-white px-2 py-0.5 rounded-full min-w-[24px] text-center", c.badge)}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={cn("text-2xl font-bold mt-0.5", alert ? c.value : "text-gray-800 dark:text-white")}>{value}</p>
        {sub && (
          <p className={cn("text-xs mt-0.5", alert ? c.value : "text-gray-500 dark:text-gray-400")}>{sub}</p>
        )}
      </div>
      <ChevronRight size={14} className="absolute bottom-4 right-4 text-gray-300 dark:text-gray-600" />
    </Link>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user } = useAuthContext();
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [queue, setQueue] = useState<QueueVisit[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAlerting, setIsAlerting] = useState(false);
  const [infirmaryLat, setInfirmaryLat] = useState<number | undefined>(undefined);
  const [infirmaryLng, setInfirmaryLng] = useState<number | undefined>(undefined);
  const [infirmaryName, setInfirmaryName] = useState("ห้องพยาบาล");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasMounted = useRef(false);
  const soundEnabledRef = useRef(true);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    const [reportRes, queueRes, incidentsRes] = await Promise.all([
      api.get<DashboardReport>("/reports/dashboard"),
      api.get<QueueVisit[]>("/visits/queue"),
      api.get<{ data: Incident[] }>("/incidents?status=pending,accepted,in_progress&limit=50"),
    ]);

    if (reportRes.success && reportRes.data) setReport(reportRes.data);
    if (queueRes.success && queueRes.data) {
      setQueue(Array.isArray(queueRes.data) ? (queueRes.data as unknown as QueueVisit[]) : []);
    }
    if (incidentsRes.success && incidentsRes.data) {
      const raw = incidentsRes.data as unknown as { data?: Incident[] } | Incident[];
      const list = Array.isArray(raw) ? raw : (raw as { data?: Incident[] }).data ?? [];
      setActiveIncidents(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
    hasMounted.current = true;

    // Fetch infirmary location from system settings
    api.get<{ name: string | null; lat: number | null; lng: number | null }>("/settings/infirmary").then((res) => {
      if (res.success && res.data) {
        if (res.data.name) setInfirmaryName(res.data.name);
        if (res.data.lat != null) setInfirmaryLat(res.data.lat);
        if (res.data.lng != null) setInfirmaryLng(res.data.lng);
      }
    });
  }, [user, loadData]);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => () => { if (alertIntervalRef.current) clearInterval(alertIntervalRef.current); }, []);

  const playBeep = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.5, now);

      // Two-tone emergency beep (high-low pattern)
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now + start);
        osc.connect(gain);
        osc.start(now + start);
        osc.stop(now + start + dur);
      };

      // Beep pattern: high-low-high (sounds urgent)
      playTone(880, 0, 0.15);
      playTone(660, 0.2, 0.15);
      playTone(880, 0.4, 0.15);

      // Fade out
      gain.gain.setValueAtTime(0.5, now + 0.55);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
    } catch {}
  }, []);

  const startAlert = useCallback(() => {
    if (alertIntervalRef.current) return;
    setIsAlerting(true);
    playBeep();
    alertIntervalRef.current = setInterval(playBeep, 2500);
  }, [playBeep]);

  const stopAlert = useCallback(() => {
    setIsAlerting(false);
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
  }, []);

  const handleSoundToggle = useCallback(() => {
    setSoundEnabled((s) => {
      soundEnabledRef.current = !s;
      return !s;
    });
  }, []);

  useWebSocket<Incident>("incident:new", () => {
    loadData();
    startAlert();
  }, [loadData, startAlert]);

  useWebSocket<{ incidentId: string; status: string }>("incident:status_update", async () => {
    const res = await api.get<DashboardReport>("/reports/dashboard");
    if (res.success && res.data) {
      setReport(res.data);
      if ((res.data.incidentsToday.byStatus["pending"] ?? 0) === 0) stopAlert();
    }
    loadData();
  }, [loadData, stopAlert]);

  useWebSocket("queue:update", () => {
    api.get<QueueVisit[]>("/visits/queue").then((res) => {
      if (res.success && res.data) {
        setQueue(Array.isArray(res.data) ? res.data : (res.data as unknown as { data: QueueVisit[] }).data ?? []);
      }
    });
  }, []);

  const pendingCount = report?.incidentsToday.byStatus["pending"] ?? 0;
  const inProgressCount = (report?.incidentsToday.byStatus["accepted"] ?? 0) + (report?.incidentsToday.byStatus["in_progress"] ?? 0);
  const waitingCount = queue.filter((q) => q.status === "waiting").length;
  const treatingCount = queue.filter((q) => q.status === "in_treatment").length;
  const activeQueueCount = waitingCount + treatingCount;

  const hasLowStock = (report?.medicinesAlerts.lowStockCount ?? 0) > 0;
  const hasExpiring = (report?.medicinesAlerts.expiringSoonCount ?? 0) > 0;

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">แดชบอร์ด</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("th-TH", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={handleSoundToggle}
          className={cn(
            "p-2.5 rounded-xl border transition-all",
            isAlerting && soundEnabled
              ? "border-red-400 bg-red-100 text-red-600 animate-pulse"
              : soundEnabled
              ? "border-blue-300 bg-blue-100 text-blue-700"
              : "border-gray-300 bg-gray-100 text-gray-500"
          )}
          title={
            isAlerting
              ? soundEnabled ? "มีเหตุฉุกเฉิน! (คลิกปิดเสียง)" : "มีเหตุฉุกเฉิน (เสียงปิดอยู่)"
              : soundEnabled ? "ปิดเสียงแจ้งเตือน" : "เปิดเสียงแจ้งเตือน"
          }
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          href="/staff/emergency"
          icon={<Siren size={20} />}
          label="เหตุฉุกเฉิน"
          value={loading ? "—" : report?.incidentsToday.total ?? 0}
          sub={
            loading ? "กำลังโหลด..." :
            pendingCount > 0 ? `รอรับ ${pendingCount} · กำลังดำเนินการ ${inProgressCount}` :
            inProgressCount > 0 ? `กำลังดำเนินการ ${inProgressCount}` :
            "ไม่มีเหตุฉุกเฉิน"
          }
          badge={pendingCount || undefined}
          color="red"
          alert={pendingCount > 0}
        />
        <StatCard
          href="/staff/patients"
          icon={<Stethoscope size={20} />}
          label="ผู้ป่วยวันนี้"
          value={loading ? "—" : report?.visitsToday.total ?? 0}
          sub={
            loading ? "กำลังโหลด..." :
            activeQueueCount > 0 ? `รอ ${waitingCount} · กำลังรักษา ${treatingCount}` :
            "ไม่มีคิว"
          }
          badge={activeQueueCount || undefined}
          color="blue"
          alert={activeQueueCount > 0}
        />
        <StatCard
          href="/staff/medicines"
          icon={<Pill size={20} />}
          label="คลังยา"
          value={loading ? "—" : hasLowStock ? `${report?.medicinesAlerts.lowStockCount} รายการ` : "ปกติ"}
          sub={
            loading ? "กำลังโหลด..." :
            hasLowStock ? `ต่ำกว่าเกณฑ์ · หมดอายุเร็ว ${report?.medicinesAlerts.expiringSoonCount ?? 0}` :
            hasExpiring ? `หมดอายุเร็ว ${report?.medicinesAlerts.expiringSoonCount} รายการ` :
            "สต๊อกเพียงพอ"
          }
          badge={hasLowStock ? report?.medicinesAlerts.lowStockCount : undefined}
          color="amber"
          alert={hasLowStock || hasExpiring}
        />
        <StatCard
          href="/staff/appointments"
          icon={<Calendar size={20} />}
          label="นัดหมายวันนี้"
          value={loading ? "—" : report?.appointmentsToday.total ?? 0}
          sub={
            loading ? "กำลังโหลด..." :
            `เช็คอิน ${report?.appointmentsToday.byStatus["checked_in"] ?? 0}`
          }
          color="indigo"
        />
      </div>

      {/* ── Avg Response Time ──────────────────────────────────── */}
      {report?.incidentsToday.avgResponseTimeMinutes != null && (
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 rounded-2xl px-5 py-4 text-white flex items-center gap-4">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-xs text-blue-300 uppercase tracking-wide">เวลาตอบสนองเฉลี่ยวันนี้</p>
            <p className="text-2xl font-bold">
              {Math.round(report.incidentsToday.avgResponseTimeMinutes)}{" "}
              <span className="text-sm font-medium text-blue-300">นาที</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Map + Queue (2 cols on lg) ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Map */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-red-500" />
              <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">แผนที่เหตุฉุกเฉิน</h2>
              {activeIncidents.length > 0 && (
                <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {activeIncidents.length} จุด
                </span>
              )}
            </div>
            <Link href="/staff/emergency" className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-0.5">
              ดูทั้งหมด <ChevronRight size={13} />
            </Link>
          </div>

          <div className="h-72 lg:h-80 p-2">
            <EmergencyMap
              incidents={activeIncidents}
              onSelectIncident={(inc) => {
                window.location.href = `/staff/emergency?id=${inc.id}`;
              }}
              infirmaryLat={infirmaryLat}
              infirmaryLng={infirmaryLng}
              infirmaryName={infirmaryName}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex-wrap">
            {[
              { color: "#16a34a", label: "ต่ำ" },
              { color: "#d97706", label: "ปานกลาง" },
              { color: "#ea580c", label: "สูง" },
              { color: "#dc2626", label: "วิกฤต" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-lg leading-none">🏥</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">ห้องพยาบาล</span>
            </div>
          </div>
        </div>

        {/* Patient Queue */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">คิวผู้รอรับบริการ</h2>
              {waitingCount > 0 && (
                <span className="text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                  รอ {waitingCount}
                </span>
              )}
            </div>
            <Link href="/staff/patients" className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-0.5">
              จัดการ <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "336px" }}>
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={22} className="animate-spin text-gray-400" />
              </div>
            ) : queue.length === 0 ? (
              <div className="py-12 text-center">
                <Users size={32} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">ไม่มีคิวผู้รอรับบริการ</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {queue.map((visit, idx) => (
                  <Link
                    key={visit.id}
                    href={`/staff/patients/${visit.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold",
                      visit.status === "waiting"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {visit.patient.firstName} {visit.patient.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{visit.chiefComplaint}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        visit.status === "in_treatment"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      )}>
                        {statusLabel(visit.status)}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={11} /> {timeAgo(visit.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────── */}
      {(hasLowStock || hasExpiring) && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide px-0.5">
            การแจ้งเตือนสำคัญ
          </h2>
          {hasLowStock && (
            <Link
              href="/staff/medicines?tab=low"
              className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl px-4 py-3.5 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
            >
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  ยาสต๊อกต่ำกว่าเกณฑ์ {report?.medicinesAlerts.lowStockCount} รายการ
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">กรุณาเติมสต๊อกโดยด่วน</p>
              </div>
              <ChevronRight size={16} className="text-amber-500" />
            </Link>
          )}
          {hasExpiring && (
            <Link
              href="/staff/medicines?tab=expiring"
              className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-800 rounded-xl px-4 py-3.5 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors"
            >
              <AlertTriangle size={20} className="text-yellow-700 dark:text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                  ยาใกล้หมดอายุ {report?.medicinesAlerts.expiringSoonCount} รายการ
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">จะหมดอายุภายใน 30 วัน</p>
              </div>
              <ChevronRight size={16} className="text-yellow-600" />
            </Link>
          )}
        </div>
      )}

      {/* ── TrendingUp strip (bottom) ─────────────────────────── */}
      {report?.incidentsToday.avgResponseTimeMinutes == null && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 justify-center py-1">
          <TrendingUp size={14} />
          <span>ข้อมูลเรียลไทม์ — อัปเดตอัตโนมัติผ่าน WebSocket</span>
        </div>
      )}
    </div>
  );
}

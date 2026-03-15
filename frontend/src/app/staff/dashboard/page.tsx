"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  cn,
  timeAgo,
  severityColor,
  incidentTypeLabel,
  severityLabel,
  statusLabel,
} from "@/lib/utils";
import type { DashboardReport, Incident } from "@/types";

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

export default function StaffDashboard() {
  const { user } = useAuthContext();
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [queue, setQueue] = useState<QueueVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAlerting, setIsAlerting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasMounted = useRef(false);
  const soundEnabledRef = useRef(true);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial data in parallel
  const loadData = useCallback(async () => {
    const [reportRes, incidentRes, queueRes] = await Promise.all([
      api.get<DashboardReport>("/reports/dashboard"),
      api.get<Incident[]>("/incidents?status=pending&limit=10"),
      api.get<QueueVisit[]>("/visits/queue"),
    ]);

    if (reportRes.success && reportRes.data) setReport(reportRes.data);
    if (incidentRes.success && incidentRes.data) {
      setIncidents(Array.isArray(incidentRes.data) ? (incidentRes.data as unknown as Incident[]) : []);
    }
    if (queueRes.success && queueRes.data) {
      setQueue(Array.isArray(queueRes.data) ? (queueRes.data as unknown as QueueVisit[]) : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
    hasMounted.current = true;
  }, [user, loadData]);

  // Keep soundEnabledRef in sync for use inside intervals
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Cleanup interval on unmount
  useEffect(() => () => { if (alertIntervalRef.current) clearInterval(alertIntervalRef.current); }, []);

  const playBeep = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq4JNKih2n8/VqXtMMCqBpuLluYZSMC2LtOvbuIlTMy+Uvu/dvIlTNS6Tw+zgv41VMzCNwuvhv45SMjGIv+fhwJBVMTGIwenhwJFWMzGIwujiwJFWMzKJwuniwpBXMzCIwOniwpFXNTCIv+niwZFXNDCIwOniwpFXMzCIwOniwZFWNTCIwOniwpFWNDCIwOniwpFWMzCIwOniwpFWMzCIwOniwpFWMzCIwOniwpFWMzCIwOniwpFWMzCIwOniwpFW");
        audioRef.current.volume = 0.7;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const startAlert = useCallback(() => {
    if (alertIntervalRef.current) return; // already alerting
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Mute/unmute without stopping alert state
  const handleSoundToggle = useCallback(() => {
    setSoundEnabled((s) => {
      soundEnabledRef.current = !s;
      if (s && audioRef.current) audioRef.current.pause();
      return !s;
    });
  }, []);

  // Real-time: new incident
  useWebSocket<Incident>("incident:new", (incident) => {
    setIncidents((prev) => [incident, ...prev.slice(0, 9)]);
    setReport((r) =>
      r ? {
        ...r,
        incidentsToday: {
          ...r.incidentsToday,
          total: r.incidentsToday.total + 1,
          byStatus: {
            ...r.incidentsToday.byStatus,
            pending: (r.incidentsToday.byStatus['pending'] ?? 0) + 1,
          },
        },
      } : r
    );
    startAlert();
  }, [startAlert]);

  // Real-time: incident status change
  useWebSocket<{ incidentId: string; status: string }>("incident:status_update", (data) => {
    setIncidents((prev) => {
      const updated = prev
        .map((i) => i.id === data.incidentId ? { ...i, status: data.status as Incident["status"] } : i)
        .filter((i) => i.status === "pending");
      if (updated.length === 0) stopAlert();
      return updated;
    });
    loadData(); // refresh counts
  }, [loadData, stopAlert]);

  // Real-time: queue update
  useWebSocket("queue:update", () => {
    api.get<QueueVisit[]>("/visits/queue").then((res) => {
      if (res.success && res.data) {
        setQueue(Array.isArray(res.data) ? res.data : (res.data as unknown as { data: QueueVisit[] }).data ?? []);
      }
    });
  }, []);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">แดชบอร์ด</h1>
          <p className="text-sm text-gray-500">
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
            "p-2 rounded-xl border transition-all",
            isAlerting && soundEnabled
              ? "border-red-300 bg-red-50 text-red-500 animate-pulse"
              : soundEnabled
              ? "border-blue-200 bg-blue-50 text-blue-600"
              : "border-gray-200 bg-gray-50 text-gray-400"
          )}
          title={
            isAlerting
              ? soundEnabled ? "มีเหตุฉุกเฉิน! (คลิกปิดเสียง)" : "มีเหตุฉุกเฉิน (เสียงปิดอยู่)"
              : soundEnabled ? "ปิดเสียงแจ้งเตือน" : "เปิดเสียงแจ้งเตือน"
          }
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="stats-grid grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="stats-grid grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="เหตุฉุกเฉิน"
            value={report?.incidentsToday.total ?? 0}
            sub={`รอรับ ${report?.incidentsToday.byStatus['pending'] ?? 0}`}
            icon={<Siren size={22} />}
            color="text-red-600"
            bg="bg-red-50"
            href="/staff/emergency"
            urgent={(report?.incidentsToday.byStatus['pending'] ?? 0) > 0}
          />
          <StatCard
            title="ผู้รับบริการวันนี้"
            value={report?.visitsToday.total ?? 0}
            sub={`คิวรอ ${queue.filter(q => q.status === 'waiting').length} คน`}
            icon={<Users size={22} />}
            color="text-blue-600"
            bg="bg-blue-50"
            href="/staff/patients"
          />
          <StatCard
            title="ยาต่ำกว่าเกณฑ์"
            value={report?.medicinesAlerts.lowStockCount ?? 0}
            sub={`หมดอายุเร็ว ${report?.medicinesAlerts.expiringSoonCount ?? 0}`}
            icon={<Pill size={22} />}
            color="text-orange-600"
            bg="bg-orange-50"
            href="/staff/medicines"
            urgent={(report?.medicinesAlerts.lowStockCount ?? 0) > 0}
          />
          <StatCard
            title="นัดวันนี้"
            value={report?.appointmentsToday.total ?? 0}
            sub={`เช็คอิน ${report?.appointmentsToday.byStatus['checked_in'] ?? 0}`}
            icon={<Calendar size={22} />}
            color="text-purple-600"
            bg="bg-purple-50"
            href="/staff/appointments"
          />
        </div>
      )}

      {/* Avg response time */}
      {report?.incidentsToday.avgResponseTimeMinutes != null && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs text-blue-200">เวลาตอบสนองเฉลี่ยวันนี้</p>
            <p className="text-2xl font-bold">
              {Math.round(report.incidentsToday.avgResponseTimeMinutes)} นาที
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Real-time incident feed */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <h2 className="font-semibold text-gray-800 text-sm">เหตุฉุกเฉินที่รอรับ</h2>
            </div>
            <Link
              href="/staff/emergency"
              className="text-xs text-blue-600 flex items-center gap-0.5"
            >
              ดูทั้งหมด <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-8 text-center">
              <Siren size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">ไม่มีเหตุฉุกเฉินที่รอรับ</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {incidents.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </div>

        {/* Patient queue */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">คิวผู้รอรับบริการ</h2>
            <Link
              href="/staff/patients"
              className="text-xs text-blue-600 flex items-center gap-0.5"
            >
              จัดการ <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : queue.length === 0 ? (
            <div className="py-8 text-center">
              <Users size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">ไม่มีคิวผู้รอรับบริการ</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {queue.map((visit, idx) => (
                <div key={visit.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-700">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {visit.patient.firstName} {visit.patient.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{visit.chiefComplaint}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        visit.status === "in_treatment"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      )}
                    >
                      {statusLabel(visit.status)}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <Clock size={11} />
                      {timeAgo(visit.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {((report?.medicinesAlerts.lowStockCount ?? 0) > 0 ||
        (report?.medicinesAlerts.expiringSoonCount ?? 0) > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">⚠️ การแจ้งเตือนสำคัญ</h2>
          {(report?.medicinesAlerts.lowStockCount ?? 0) > 0 && (
            <Link
              href="/staff/medicines?tab=low"
              className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 hover:bg-orange-100 transition-colors"
            >
              <AlertTriangle size={18} className="text-orange-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  ยาสต๊อกต่ำกว่าเกณฑ์ {report?.medicinesAlerts.lowStockCount} รายการ
                </p>
                <p className="text-xs text-orange-600">กรุณาเติมสต๊อกโดยด่วน</p>
              </div>
              <ChevronRight size={16} className="text-orange-400" />
            </Link>
          )}
          {(report?.medicinesAlerts.expiringSoonCount ?? 0) > 0 && (
            <Link
              href="/staff/medicines?tab=expiring"
              className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 hover:bg-yellow-100 transition-colors"
            >
              <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  ยาใกล้หมดอายุ {report?.medicinesAlerts.expiringSoonCount} รายการ
                </p>
                <p className="text-xs text-yellow-600">จะหมดอายุภายใน 30 วัน</p>
              </div>
              <ChevronRight size={16} className="text-yellow-500" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  color,
  bg,
  href,
  urgent,
}: {
  title: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  href: string;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all",
        urgent && "ring-2 ring-red-300"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg, color)}>
          {icon}
        </div>
        {urgent && (
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{title}</p>
        <p className={cn("text-xs mt-1", urgent ? "text-red-600 font-medium" : "text-gray-400")}>
          {sub}
        </p>
      </div>
    </Link>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  return (
    <Link
      href={`/staff/emergency?id=${incident.id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div
        className={cn(
          "w-2 h-2 rounded-full mt-2 flex-shrink-0",
          incident.severity === "critical"
            ? "bg-red-500 animate-pulse"
            : incident.severity === "high"
            ? "bg-orange-500"
            : "bg-yellow-400"
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs px-2 py-0.5 rounded-full", severityColor(incident.severity))}>
            {severityLabel(incident.severity)}
          </span>
          <span className="text-xs text-gray-500">{incidentTypeLabel(incident.incidentType)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(incident.createdAt)}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
    </Link>
  );
}

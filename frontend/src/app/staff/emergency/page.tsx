"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  Siren,
  Loader2,
  MapPin,
  Clock,
  User,
  X,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Phone,
  ArrowLeft,
  Activity,
  Zap,
  Map,
  List,
} from "lucide-react";
import { api, extractError } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  cn,
  timeAgo,
  formatDateTime,
  severityColor,
  severityLabel,
  incidentTypeLabel,
  statusLabel,
} from "@/lib/utils";
import type { Incident, IncidentDetail } from "@/types";

const EmergencyMap = dynamic(
  () => import("@/components/maps/EmergencyMap").then((m) => m.EmergencyMap),
  { ssr: false, loading: () => <MapPlaceholder /> }
);

type TabType = "pending" | "in_progress" | "completed";

const TABS: { key: TabType; label: string; color: string }[] = [
  { key: "pending",     label: "เหตุใหม่",         color: "red" },
  { key: "in_progress", label: "กำลังดำเนินการ",   color: "blue" },
  { key: "completed",   label: "เสร็จสิ้น",         color: "green" },
];

const SEVERITY_BAR: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
  medium:   "bg-yellow-400",
  low:      "bg-green-400",
};

function EmergencyPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [incidents, setIncidents] = useState<Record<TabType, Incident[]>>({
    pending: [], in_progress: [], completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [infirmaryName, setInfirmaryName] = useState("ห้องพยาบาล");
  const [infirmaryLat, setInfirmaryLat] = useState<number | undefined>(undefined);
  const [infirmaryLng, setInfirmaryLng] = useState<number | undefined>(undefined);
  const [completedLimit, setCompletedLimit] = useState(10);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const loadIncidents = useCallback(async () => {
    const [pendingRes, inProgressRes, completedRes] = await Promise.all([
      api.get<Incident[]>("/incidents?status=pending&limit=50"),
      api.get<Incident[]>("/incidents?status=in_progress&status=accepted&limit=50"),
      api.get<Incident[]>("/incidents?status=completed&limit=30"),
    ]);
    setIncidents({
      pending:     Array.isArray(pendingRes.data)     ? (pendingRes.data as unknown as Incident[])     : [],
      in_progress: Array.isArray(inProgressRes.data)  ? (inProgressRes.data as unknown as Incident[])  : [],
      completed:   Array.isArray(completedRes.data)   ? (completedRes.data as unknown as Incident[])   : [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadIncidents();
    api.get<{ name: string | null; lat: number | null; lng: number | null }>("/settings/infirmary").then((res) => {
      if (res.success && res.data) {
        if (res.data.name) setInfirmaryName(res.data.name);
        if (res.data.lat != null) setInfirmaryLat(res.data.lat);
        if (res.data.lng != null) setInfirmaryLng(res.data.lng);
      }
    });
  }, [loadIncidents]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) openDetail(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== "completed") setCompletedLimit(10);
  }, [activeTab]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setActionMsg(null);
    const res = await api.get<IncidentDetail>(`/incidents/${id}`);
    setLoadingDetail(false);
    if (res.success && res.data) setSelectedIncident(res.data);
  };

  useWebSocket<Incident>("incident:new", (incident) => {
    setIncidents((prev) => ({ ...prev, pending: [incident, ...prev.pending] }));
  }, []);

  useWebSocket<{ incidentId: string; status: string }>("incident:status_update", ({ incidentId, status }) => {
    setIncidents((prev) => {
      const all: Incident[] = [...prev.pending, ...prev.in_progress, ...prev.completed];
      const updated = all.find((i) => i.id === incidentId);
      if (!updated) return prev;
      const next = { ...updated, status: status as Incident["status"] };
      const remove = (arr: Incident[]) => arr.filter((i) => i.id !== incidentId);
      return {
        pending:     status === "pending" ? [next, ...remove(prev.pending)] : remove(prev.pending),
        in_progress: ["accepted", "in_progress"].includes(status) ? [next, ...remove(prev.in_progress)] : remove(prev.in_progress),
        completed:   status === "completed" ? [next, ...remove(prev.completed)] : remove(prev.completed),
      };
    });
    if (selectedIncident?.id === incidentId) {
      setSelectedIncident((prev) => prev ? { ...prev, status: status as IncidentDetail["status"] } : prev);
    }
  }, [selectedIncident]);

  const handleAction = async (action: "accept" | "update" | "complete") => {
    if (!selectedIncident) return;
    setActionLoading(true);
    setActionMsg(null);
    let res;
    if (action === "accept") {
      res = await api.post(`/incidents/${selectedIncident.id}/accept`);
    } else if (action === "update") {
      res = await api.patch(`/incidents/${selectedIncident.id}/status`, { status: "in_progress", note: "เจ้าหน้าที่กำลังเดินทาง" });
    } else {
      res = await api.patch(`/incidents/${selectedIncident.id}/status`, { status: "completed", note: "ช่วยเหลือเสร็จสิ้น" });
    }
    setActionLoading(false);
    if (res.success) {
      setActionMsg({ type: "ok", text: "อัปเดตสถานะสำเร็จ" });
      openDetail(selectedIncident.id);
      loadIncidents();
    } else {
      setActionMsg({ type: "err", text: extractError(res) });
    }
  };

  const allMapIncidents = [...incidents.pending, ...incidents.in_progress].filter((i) => i.latitude && i.longitude);

  // Group completed
  function getDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const todayStr = today.toLocaleDateString("en-CA");
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dStr = d.toLocaleDateString("en-CA");
    if (dStr === todayStr) return "วันนี้";
    if (dStr === yesterday.toLocaleDateString("en-CA")) return "เมื่อวาน";
    const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diffDays <= 7) return "สัปดาห์นี้";
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  }

  const completedSliced = incidents.completed.slice(0, completedLimit);
  const completedGroups: { label: string; items: Incident[] }[] = [];
  completedSliced.forEach((inc) => {
    const label = getDateLabel(inc.createdAt);
    const g = completedGroups.find((g) => g.label === label);
    if (g) g.items.push(inc); else completedGroups.push({ label, items: [inc] });
  });

  const showDetail = selectedIncident || loadingDetail;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">การจัดการเหตุฉุกเฉิน</h1>
          <div className="flex items-center gap-3 mt-1">
            {incidents.pending.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                <Zap size={14} className="animate-pulse" />
                รอรับ {incidents.pending.length} เหตุ
              </span>
            )}
            {incidents.in_progress.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                <Activity size={14} />
                กำลังดำเนิน {incidents.in_progress.length} เหตุ
              </span>
            )}
            {incidents.pending.length === 0 && incidents.in_progress.length === 0 && (
              <span className="text-sm text-gray-400">ไม่มีเหตุฉุกเฉินที่รอดำเนินการ</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: List/Map toggle ─────────────────────────── */}
      <div className="flex lg:hidden gap-2 flex-shrink-0">
        <button onClick={() => setMobileView("list")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
            mobileView === "list" ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500")}>
          <List size={16} /> รายการ
        </button>
        <button onClick={() => setMobileView("map")}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
            mobileView === "map" ? "bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500")}>
          <Map size={16} /> แผนที่
        </button>
      </div>

      {/* ── Main 2-column ──────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

        {/* ── Left: Tabs + List ────── */}
        <div className={cn("lg:w-[420px] lg:flex-shrink-0 flex flex-col min-h-0", mobileView === "map" ? "hidden lg:flex" : "flex")}>

          {/* Tabs */}
          <div className="flex gap-2 flex-shrink-0 mb-3">
            {TABS.map(({ key, label }) => {
              const count = incidents[key].length;
              const isActive = activeTab === key;
              return (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={cn(
                    "flex-1 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all border-2",
                    isActive
                      ? key === "pending"
                        ? "bg-red-600 border-red-600 text-white shadow-sm"
                        : key === "in_progress"
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-green-600 border-green-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300"
                  )}
                >
                  {label}
                  {count > 0 && (
                    <span className={cn(
                      "ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold",
                      isActive ? "bg-white/25 text-white" :
                      key === "pending" ? "bg-red-100 text-red-600" :
                      key === "in_progress" ? "bg-blue-100 text-blue-600" :
                      "bg-gray-100 text-gray-500"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Incident list */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 size={28} className="animate-spin text-gray-300" />
              </div>
            ) : incidents[activeTab].length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                <Siren size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
                <p className="text-base text-gray-400 dark:text-gray-500">ไม่มีเหตุการณ์</p>
              </div>
            ) : activeTab === "completed" ? (
              <>
                {completedGroups.map(({ label, items }) => (
                  <div key={label}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">{label}</p>
                    <div className="space-y-2">
                      {items.map((inc) => (
                        <IncidentCard key={inc.id} incident={inc}
                          isSelected={selectedIncident?.id === inc.id}
                          onClick={() => selectedIncident?.id === inc.id ? setSelectedIncident(null) : openDetail(inc.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {incidents.completed.length > completedLimit && (
                  <button onClick={() => setCompletedLimit((p) => p + 10)}
                    className="w-full py-3 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 text-gray-500 text-sm rounded-xl transition-colors">
                    โหลดเพิ่มเติม ({incidents.completed.length - completedLimit} รายการ)
                  </button>
                )}
              </>
            ) : (
              incidents[activeTab].map((inc) => (
                <IncidentCard key={inc.id} incident={inc}
                  isSelected={selectedIncident?.id === inc.id}
                  onClick={() => selectedIncident?.id === inc.id ? setSelectedIncident(null) : openDetail(inc.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right: Map or Detail ──── */}
        <div className={cn("flex-1 min-h-0 min-w-0", mobileView === "list" && !showDetail ? "hidden lg:block" : "block")}>
          {showDetail ? (
            <div className="h-full">
              <IncidentDetailPanel
                incident={selectedIncident}
                onClose={() => setSelectedIncident(null)}
                onAction={handleAction}
                actionLoading={actionLoading}
                actionMsg={actionMsg}
                loading={loadingDetail}
              />
            </div>
          ) : (
            <div className="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col min-h-[400px] lg:min-h-[500px]">
              {/* Map header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-red-500" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">แผนที่เหตุฉุกเฉิน</span>
                  {allMapIncidents.length > 0 && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
                      {allMapIncidents.length} จุด
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">คลิกที่หมุดเพื่อดูรายละเอียด</p>
              </div>
              <div className="flex-1 p-2">
                <EmergencyMap
                  incidents={allMapIncidents}
                  selectedId={(selectedIncident as IncidentDetail | null)?.id}
                  onSelectIncident={(inc) => openDetail(inc.id)}
                  infirmaryName={infirmaryName}
                  infirmaryLat={infirmaryLat}
                  infirmaryLng={infirmaryLng}
                />
              </div>
              {/* Map legend */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex-wrap flex-shrink-0">
                {[
                  { color: "#16a34a", label: "ต่ำ" },
                  { color: "#d97706", label: "ปานกลาง" },
                  { color: "#ea580c", label: "สูง" },
                  { color: "#dc2626", label: "วิกฤต" },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-base leading-none">🏥</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{infirmaryName}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmergencyPage() {
  return (
    <Suspense>
      <EmergencyPageContent />
    </Suspense>
  );
}

// ── Incident Card ──────────────────────────────────────────────────────────────

function IncidentCard({ incident, isSelected, onClick }: {
  incident: Incident; isSelected: boolean; onClick: () => void;
}) {
  const isPending = incident.status === "pending";
  const isInProgress = incident.status === "accepted" || incident.status === "in_progress";

  return (
    <div onClick={onClick}
      className={cn(
        "relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm cursor-pointer transition-all hover:shadow-md overflow-hidden border-2",
        isSelected ? "border-blue-500 shadow-blue-100" :
        isPending && incident.severity === "critical" ? "border-red-300 dark:border-red-800" :
        "border-transparent dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
      )}
    >
      {/* Severity bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", SEVERITY_BAR[incident.severity] ?? "bg-gray-300")} />

      <div className="pl-4 pr-4 py-4">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl",
            isPending ? "bg-red-100 dark:bg-red-900/30" :
            isInProgress ? "bg-blue-100 dark:bg-blue-900/30" :
            "bg-green-100 dark:bg-green-900/30"
          )}>
            {incident.incidentType === "injury" ? "🩹" :
             incident.incidentType === "illness" ? "🤒" :
             incident.incidentType === "accident" ? "⚠️" :
             incident.incidentType === "fainting" ? "😵" : "🚨"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-gray-800 dark:text-gray-100">
                {incidentTypeLabel(incident.incidentType)}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", severityColor(incident.severity))}>
                {severityLabel(incident.severity)}
              </span>
              {isPending && incident.severity === "critical" && (
                <span className="text-xs font-bold text-red-600 animate-pulse">⚡ เร่งด่วน!</span>
              )}
            </div>

            {incident.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{incident.description}</p>
            )}
          </div>

          {/* Status badge */}
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0",
            isPending ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
            isInProgress ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          )}>
            {statusLabel(incident.status)}
          </span>
        </div>

        {/* Bottom row */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {timeAgo(incident.createdAt)}
          </span>
          {incident.distanceKm != null && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} />
              {incident.distanceKm.toFixed(2)} กม.
            </span>
          )}
          {!incident.latitude && (
            <span className="text-xs text-gray-300 dark:text-gray-600 italic">ไม่มี GPS</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function IncidentDetailPanel({ incident, onClose, onAction, actionLoading, actionMsg, loading }: {
  incident: IncidentDetail | null;
  onClose: () => void;
  onAction: (action: "accept" | "update" | "complete") => void;
  actionLoading: boolean;
  actionMsg: { type: "ok" | "err"; text: string } | null;
  loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm h-full flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <button onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">รายละเอียดเหตุการณ์</h2>
          {incident && (
            <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(incident.createdAt)}</p>
          )}
        </div>
        <button onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      ) : !incident ? null : (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Severity + Type hero */}
          <div className={cn(
            "rounded-2xl p-4 flex items-center gap-4",
            incident.severity === "critical" ? "bg-red-50 dark:bg-red-950/20" :
            incident.severity === "high" ? "bg-orange-50 dark:bg-orange-950/20" :
            incident.severity === "medium" ? "bg-yellow-50 dark:bg-yellow-950/20" :
            "bg-green-50 dark:bg-green-950/20"
          )}>
            <div className="text-4xl leading-none">
              {incident.incidentType === "injury" ? "🩹" :
               incident.incidentType === "illness" ? "🤒" :
               incident.incidentType === "accident" ? "⚠️" :
               incident.incidentType === "fainting" ? "😵" : "🚨"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {incidentTypeLabel(incident.incidentType)}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-semibold", severityColor(incident.severity))}>
                  {severityLabel(incident.severity)}
                </span>
                <span className={cn(
                  "text-sm px-2.5 py-0.5 rounded-full font-semibold",
                  incident.status === "pending" ? "bg-red-100 text-red-700" :
                  incident.status === "in_progress" || incident.status === "accepted" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                )}>
                  {statusLabel(incident.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Reporter */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">ผู้แจ้งเหตุ</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <User size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {incident.reporter.firstName} {incident.reporter.lastName}
                </p>
                {incident.reporter.studentId && (
                  <p className="text-sm text-gray-400">{incident.reporter.studentId}</p>
                )}
              </div>
              {incident.reporter.phone && (
                <a href={`tel:${incident.reporter.phone}`}
                  className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl hover:bg-green-200 transition-colors">
                  <Phone size={17} className="text-green-700 dark:text-green-400" />
                </a>
              )}
            </div>
          </div>

          {/* Location */}
          {incident.latitude && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">ตำแหน่ง</p>
              <p className="text-sm font-mono text-gray-600 dark:text-gray-300">
                {incident.latitude.toFixed(6)}, {incident.longitude?.toFixed(6)}
              </p>
              {incident.distanceKm != null && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                  <MapPin size={14} />
                  ห่างจากห้องพยาบาล <span className="font-semibold text-gray-700 dark:text-gray-200">{incident.distanceKm.toFixed(2)} กม.</span>
                </p>
              )}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium">
                <Navigation size={15} /> นำทาง Google Maps
              </a>
            </div>
          )}

          {/* Description */}
          {incident.description && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">รายละเอียด</p>
              <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">{incident.description}</p>
            </div>
          )}

          {/* Responder */}
          {incident.responder && (
            <div className="bg-green-50 dark:bg-green-950/20 rounded-2xl p-4 border border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">เจ้าหน้าที่รับเรื่อง</p>
              <p className="text-base font-bold text-green-800 dark:text-green-300">
                {incident.responder.firstName} {incident.responder.lastName}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                รับเมื่อ {formatDateTime(incident.responder.acceptedAt)}
              </p>
            </div>
          )}

          {/* Action message */}
          {actionMsg && (
            <div className={cn(
              "flex items-center gap-2 text-sm rounded-xl px-4 py-3 font-medium",
              actionMsg.type === "ok" ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
            )}>
              {actionMsg.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {actionMsg.text}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 pt-1">
            {incident.status === "pending" && (
              <ActionButton label="รับเหตุการณ์" color="bg-blue-600 hover:bg-blue-700" loading={actionLoading} onClick={() => onAction("accept")} />
            )}
            {incident.status === "accepted" && (
              <ActionButton label="กำลังช่วยเหลือ" color="bg-orange-500 hover:bg-orange-600" loading={actionLoading} onClick={() => onAction("update")} />
            )}
            {(incident.status === "in_progress" || incident.status === "accepted") && (
              <ActionButton label="เสร็จสิ้น" color="bg-green-600 hover:bg-green-700" loading={actionLoading} onClick={() => onAction("complete")} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, color, loading, onClick }: {
  label: string; color: string; loading: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className={cn(
        "w-full py-3 rounded-xl text-white text-base font-bold transition-colors flex items-center justify-center gap-2",
        color, loading && "opacity-60 cursor-not-allowed"
      )}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : null}
      {label}
    </button>
  );
}

function MapPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div className="text-center">
        <Loader2 size={24} className="animate-spin text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-400">กำลังโหลดแผนที่...</p>
      </div>
    </div>
  );
}

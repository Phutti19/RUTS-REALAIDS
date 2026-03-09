"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  Siren,
  Map,
  List,
  Loader2,
  MapPin,
  Clock,
  User,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Phone,
} from "lucide-react";
import { api } from "@/lib/api";
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

// Dynamically import map (no SSR)
const EmergencyMap = dynamic(
  () => import("@/components/maps/EmergencyMap").then((m) => m.EmergencyMap),
  { ssr: false, loading: () => <MapPlaceholder /> }
);

type TabType = "pending" | "in_progress" | "completed";
type ViewMode = "list" | "map";

const TABS: { key: TabType; label: string }[] = [
  { key: "pending", label: "เหตุใหม่" },
  { key: "in_progress", label: "กำลังดำเนินการ" },
  { key: "completed", label: "เสร็จสิ้น" },
];

function EmergencyPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [incidents, setIncidents] = useState<Record<TabType, Incident[]>>({
    pending: [],
    in_progress: [],
    completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadIncidents = useCallback(async () => {
    const [pendingRes, inProgressRes, completedRes] = await Promise.all([
      api.get<Incident[]>("/incidents?status=pending&limit=50"),
      api.get<Incident[]>("/incidents?status=in_progress&status=accepted&limit=50"),
      api.get<Incident[]>("/incidents?status=completed&limit=30"),
    ]);
    setIncidents({
      pending: Array.isArray(pendingRes.data) ? (pendingRes.data as unknown as Incident[]) : [],
      in_progress: Array.isArray(inProgressRes.data) ? (inProgressRes.data as unknown as Incident[]) : [],
      completed: Array.isArray(completedRes.data) ? (completedRes.data as unknown as Incident[]) : [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Open detail from URL param
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) openDetail(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setActionMsg(null);
    const res = await api.get<IncidentDetail>(`/incidents/${id}`);
    setLoadingDetail(false);
    if (res.success && res.data) setSelectedIncident(res.data);
  };

  // Real-time new incident
  useWebSocket<Incident>("incident:new", (incident) => {
    setIncidents((prev) => ({
      ...prev,
      pending: [incident, ...prev.pending],
    }));
  }, []);

  // Real-time status update
  useWebSocket<{ incidentId: string; status: string }>("incident:status_update", ({ incidentId, status }) => {
    setIncidents((prev) => {
      const allIncidents: Incident[] = [
        ...prev.pending,
        ...prev.in_progress,
        ...prev.completed,
      ];
      const updated = allIncidents.find((i) => i.id === incidentId);
      if (!updated) return prev;
      const newIncident = { ...updated, status: status as Incident["status"] };

      const removeFrom = (arr: Incident[]) => arr.filter((i) => i.id !== incidentId);

      return {
        pending: status === "pending" ? [newIncident, ...removeFrom(prev.pending)] : removeFrom(prev.pending),
        in_progress: ["accepted", "in_progress"].includes(status)
          ? [newIncident, ...removeFrom(prev.in_progress)]
          : removeFrom(prev.in_progress),
        completed: status === "completed" ? [newIncident, ...removeFrom(prev.completed)] : removeFrom(prev.completed),
      };
    });
    // Update detail panel if open
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
      res = await api.patch(`/incidents/${selectedIncident.id}/status`, {
        status: "in_progress",
        note: "เจ้าหน้าที่กำลังเดินทาง",
      });
    } else {
      res = await api.patch(`/incidents/${selectedIncident.id}/status`, {
        status: "completed",
        note: "ช่วยเหลือเสร็จสิ้น",
      });
    }

    setActionLoading(false);
    if (res.success) {
      setActionMsg({ type: "ok", text: "อัปเดตสถานะสำเร็จ" });
      // Reload detail
      openDetail(selectedIncident.id);
      loadIncidents();
    } else {
      setActionMsg({ type: "err", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const allMapIncidents = [
    ...incidents.pending,
    ...incidents.in_progress,
  ].filter((i) => i.latitude && i.longitude);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">การจัดการเหตุฉุกเฉิน</h1>
          <p className="text-sm text-gray-500">
            รอรับ {incidents.pending.length} · กำลังดำเนินการ {incidents.in_progress.length}
          </p>
        </div>
        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
              viewMode === "list" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"
            )}
          >
            <List size={15} /> รายการ
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
              viewMode === "map" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"
            )}
          >
            <Map size={15} /> แผนที่
          </button>
        </div>
      </div>

      {/* Map view */}
      {viewMode === "map" ? (
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden" style={{ minHeight: 500, position: "relative", zIndex: 0 }}>
            <EmergencyMap
              incidents={allMapIncidents}
              selectedId={selectedIncident?.id}
              onSelectIncident={(inc) => openDetail(inc.id)}
            />
          </div>
          {selectedIncident && (
            <div className="w-80 flex-shrink-0">
              <IncidentDetailPanel
                incident={selectedIncident}
                onClose={() => setSelectedIncident(null)}
                onAction={handleAction}
                actionLoading={actionLoading}
                actionMsg={actionMsg}
                loading={loadingDetail}
              />
            </div>
          )}
        </div>
      ) : (
        /* List view */
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex bg-white rounded-xl shadow-sm p-1 gap-1 flex-shrink-0">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all relative",
                    activeTab === key
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {label}
                  {incidents[key].length > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
                        activeTab === key
                          ? "bg-white/30 text-white"
                          : key === "pending"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-200 text-gray-700"
                      )}
                    >
                      {incidents[key].length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Incident list */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-3">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-gray-300" />
                </div>
              ) : incidents[activeTab].length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <Siren size={32} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">ไม่มีเหตุการณ์</p>
                </div>
              ) : (
                incidents[activeTab].map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    isSelected={selectedIncident?.id === incident.id}
                    onClick={() =>
                      selectedIncident?.id === incident.id
                        ? setSelectedIncident(null)
                        : openDetail(incident.id)
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail panel */}
          {(selectedIncident || loadingDetail) && (
            <div className="w-96 flex-shrink-0">
              <IncidentDetailPanel
                incident={selectedIncident}
                onClose={() => setSelectedIncident(null)}
                onAction={handleAction}
                actionLoading={actionLoading}
                actionMsg={actionMsg}
                loading={loadingDetail}
              />
            </div>
          )}
        </div>
      )}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function IncidentCard({
  incident,
  isSelected,
  onClick,
}: {
  incident: Incident;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl shadow-sm p-4 cursor-pointer transition-all hover:shadow-md border-2",
        isSelected ? "border-blue-500" : "border-transparent",
        incident.severity === "critical" && !isSelected && "border-l-4 border-l-red-500"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Severity indicator */}
        <div
          className={cn(
            "w-3 h-3 rounded-full flex-shrink-0 mt-1",
            incident.severity === "critical"
              ? "bg-red-500 animate-pulse"
              : incident.severity === "high"
              ? "bg-orange-500"
              : incident.severity === "medium"
              ? "bg-yellow-400"
              : "bg-green-400"
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", severityColor(incident.severity))}>
              {severityLabel(incident.severity)}
            </span>
            <span className="text-xs text-gray-600 font-medium">
              {incidentTypeLabel(incident.incidentType)}
            </span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full ml-auto",
                incident.status === "pending"
                  ? "bg-red-100 text-red-700"
                  : incident.status === "in_progress" || incident.status === "accepted"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              )}
            >
              {statusLabel(incident.status)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {timeAgo(incident.createdAt)}
            </span>
            {incident.distanceKm != null && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {incident.distanceKm.toFixed(2)} กม.
              </span>
            )}
          </div>

          {incident.description && (
            <p className="mt-1.5 text-xs text-gray-500 truncate">{incident.description}</p>
          )}
        </div>

        <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}

function IncidentDetailPanel({
  incident,
  onClose,
  onAction,
  actionLoading,
  actionMsg,
  loading,
}: {
  incident: IncidentDetail | null;
  onClose: () => void;
  onAction: (action: "accept" | "update" | "complete") => void;
  actionLoading: boolean;
  actionMsg: { type: "ok" | "err"; text: string } | null;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="font-semibold text-gray-800 text-sm">รายละเอียดเหตุการณ์</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : !incident ? null : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Severity badge */}
          <div className="flex items-center gap-2">
            <span className={cn("px-3 py-1 rounded-full text-sm font-semibold", severityColor(incident.severity))}>
              {severityLabel(incident.severity)}
            </span>
            <span className="text-sm text-gray-600">{incidentTypeLabel(incident.incidentType)}</span>
          </div>

          {/* Reporter */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">ผู้แจ้งเหตุ</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={14} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {incident.reporter.firstName} {incident.reporter.lastName}
                </p>
                {incident.reporter.studentId && (
                  <p className="text-xs text-gray-400">{incident.reporter.studentId}</p>
                )}
              </div>
              {incident.reporter.phone && (
                <a
                  href={`tel:${incident.reporter.phone}`}
                  className="ml-auto p-2 bg-green-100 rounded-xl hover:bg-green-200 transition-colors"
                >
                  <Phone size={14} className="text-green-700" />
                </a>
              )}
            </div>
          </div>

          {/* Location */}
          {incident.latitude && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">ตำแหน่ง</p>
              <p className="text-sm text-gray-700 font-mono">
                {incident.latitude.toFixed(6)}, {incident.longitude?.toFixed(6)}
              </p>
              {incident.distanceKm != null && (
                <p className="text-xs text-gray-500 mt-0.5">
                  ห่างจากห้องพยาบาล {incident.distanceKm.toFixed(2)} กม.
                </p>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
              >
                <Navigation size={13} /> นำทาง Google Maps
              </a>
            </div>
          )}

          {/* Description */}
          {incident.description && (
            <div>
              <p className="text-xs text-gray-400 mb-1">รายละเอียด</p>
              <p className="text-sm text-gray-700">{incident.description}</p>
            </div>
          )}

          {/* Time */}
          <div className="text-xs text-gray-400">
            แจ้งเมื่อ {formatDateTime(incident.createdAt)}
          </div>

          {/* Responder */}
          {incident.responder && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">เจ้าหน้าที่รับเรื่อง</p>
              <p className="text-sm font-medium text-green-800">
                {incident.responder.firstName} {incident.responder.lastName}
              </p>
              <p className="text-xs text-green-600">
                รับเมื่อ {formatDateTime(incident.responder.acceptedAt)}
              </p>
            </div>
          )}

          {/* Action message */}
          {actionMsg && (
            <div
              className={cn(
                "flex items-center gap-2 text-xs rounded-xl px-3 py-2",
                actionMsg.type === "ok"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              )}
            >
              {actionMsg.type === "ok" ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              {actionMsg.text}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            {incident.status === "pending" && (
              <ActionButton
                label="รับเหตุการณ์"
                color="bg-blue-600 hover:bg-blue-700"
                loading={actionLoading}
                onClick={() => onAction("accept")}
              />
            )}
            {(incident.status === "accepted") && (
              <ActionButton
                label="กำลังช่วยเหลือ"
                color="bg-orange-500 hover:bg-orange-600"
                loading={actionLoading}
                onClick={() => onAction("update")}
              />
            )}
            {(incident.status === "in_progress" || incident.status === "accepted") && (
              <ActionButton
                label="✓ เสร็จสิ้น"
                color="bg-green-600 hover:bg-green-700"
                loading={actionLoading}
                onClick={() => onAction("complete")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  color,
  loading,
  onClick,
}: {
  label: string;
  color: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2",
        color,
        loading && "opacity-60 cursor-not-allowed"
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {label}
    </button>
  );
}

function MapPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
      <div className="text-center">
        <Loader2 size={24} className="animate-spin text-gray-400 mx-auto mb-2" />
        <p className="text-xs text-gray-400">กำลังโหลดแผนที่...</p>
      </div>
    </div>
  );
}

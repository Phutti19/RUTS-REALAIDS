"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  ClipboardList,
  Siren,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  cn,
  formatDateTime,
  statusLabel,
  incidentTypeLabel,
  severityLabel,
} from "@/lib/utils";
import type { Visit, Incident } from "@/types";

const VISIT_TYPE_TH: Record<string, string> = {
  walk_in: "Walk-in",
  emergency: "เหตุฉุกเฉิน",
  appointment: "นัดหมาย",
  follow_up: "ติดตามอาการ",
};

const INCIDENT_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const INCIDENT_STATUS_TH: Record<string, string> = {
  pending: "รอรับเรื่อง",
  accepted: "รับเรื่องแล้ว",
  in_progress: "กำลังช่วยเหลือ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

type Tab = "incidents" | "visits";

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("incidents");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  useEffect(() => {
    api.get<Visit[]>("/visits?limit=50").then((res) => {
      if (res.success && res.data) setVisits(Array.isArray(res.data) ? res.data : []);
      setLoadingVisits(false);
    });

    api.get<{ data: Incident[] }>("/incidents?limit=50").then((res) => {
      if (res.success && res.data) {
        const list = Array.isArray(res.data)
          ? (res.data as unknown as Incident[])
          : (res.data as { data: Incident[] }).data ?? [];
        setIncidents(list);
      }
      setLoadingIncidents(false);
    });
  }, []);

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 pt-2.5 sticky top-0 z-10">
        <div className="flex items-center gap-2.5 pb-2.5">
          <Link href="/student/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-semibold text-sm text-gray-800">ประวัติ</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 text-xs font-medium">
          <button
            onClick={() => setTab("incidents")}
            className={cn(
              "pb-2 border-b-2 transition-colors",
              tab === "incidents"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
            )}
          >
            เหตุฉุกเฉิน
          </button>
          <button
            onClick={() => setTab("visits")}
            className={cn(
              "pb-2 border-b-2 transition-colors",
              tab === "visits"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500"
            )}
          >
            การรักษา
          </button>
        </div>
      </div>

      <div className="px-3 py-3 space-y-2.5">
        {/* ── Incidents tab ── */}
        {tab === "incidents" && (
          <>
            {loadingIncidents ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : incidents.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <Siren size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">ยังไม่มีประวัติการแจ้งเหตุ</p>
              </div>
            ) : (
              incidents.map((incident) => {
                const isActive =
                  incident.status !== "completed" && incident.status !== "cancelled";
                return (
                  <Link
                    key={incident.id}
                    href={`/student/emergency/track/${incident.id}`}
                    className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-red-100" : "bg-gray-100"
                      )}
                    >
                      <Siren
                        size={18}
                        className={isActive ? "text-red-600" : "text-gray-400"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {incidentTypeLabel(incident.incidentType)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {severityLabel(incident.severity)} · {formatDateTime(incident.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          INCIDENT_STATUS_COLOR[incident.status] ?? "bg-gray-100 text-gray-500"
                        )}
                      >
                        {INCIDENT_STATUS_TH[incident.status] ?? incident.status}
                      </span>
                      {isActive && <ChevronRight size={14} className="text-gray-400" />}
                    </div>
                  </Link>
                );
              })
            )}
          </>
        )}

        {/* ── Visits tab ── */}
        {tab === "visits" && (
          <>
            {loadingVisits ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : visits.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <ClipboardList size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">ยังไม่มีประวัติการใช้บริการ</p>
              </div>
            ) : (
              visits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      visit.visitType === "emergency" ? "bg-red-100" : "bg-blue-100"
                    )}
                  >
                    <ClipboardList
                      size={18}
                      className={visit.visitType === "emergency" ? "text-red-600" : "text-blue-600"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {visit.chiefComplaint}
                    </p>
                    <p className="text-xs text-gray-500">
                      {VISIT_TYPE_TH[visit.visitType]} · {formatDateTime(visit.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                      visit.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {statusLabel(visit.status)}
                  </span>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

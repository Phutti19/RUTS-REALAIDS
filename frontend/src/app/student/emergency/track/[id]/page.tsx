"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Loader2, Phone, User } from "lucide-react";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn, formatDateTime, incidentTypeLabel, severityLabel } from "@/lib/utils";
import type { IncidentDetail } from "@/types";

const STATUS_STEPS = [
  { key: "pending", label: "รอรับเรื่อง", desc: "เจ้าหน้าที่จะรับเรื่องโดยเร็ว" },
  { key: "accepted", label: "รับเรื่องแล้ว", desc: "เจ้าหน้าที่กำลังเตรียมตัว" },
  { key: "in_progress", label: "กำลังช่วยเหลือ", desc: "เจ้าหน้าที่กำลังเดินทาง" },
  { key: "completed", label: "เสร็จสิ้น", desc: "ได้รับการช่วยเหลือแล้ว" },
];

function getStepIndex(status: string): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export default function TrackIncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<IncidentDetail>(`/incidents/${id}`).then((res) => {
      if (res.success && res.data) {
        setIncident(res.data);
      } else {
        setError("ไม่พบข้อมูลเหตุการณ์");
      }
      setLoading(false);
    });
  }, [id]);

  // Real-time status update — backend sends full IncidentDetail (field is `id`, not `incidentId`)
  useWebSocket<IncidentDetail>(
    "incident:status_update",
    (data) => {
      if (data.id === id) {
        setIncident((prev) =>
          prev
            ? {
                ...prev,
                status: data.status as IncidentDetail["status"],
                responder: data.responder ?? prev.responder,
              }
            : prev
        );
      }
    },
    [id]
  );

  useWebSocket<IncidentDetail>(
    "incident:accepted",
    (data) => {
      if (data.id === id) {
        setIncident((prev) =>
          prev
            ? { ...prev, status: "accepted", responder: data.responder }
            : prev
        );
      }
    },
    [id]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-600">{error}</p>
        <Link href="/student/dashboard" className="text-blue-600 hover:underline text-sm">
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const currentStep = getStepIndex(incident.status);
  const isCompleted = incident.status === "completed";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className={cn(
          "px-4 pt-10 pb-6 text-white text-center",
          isCompleted
            ? "bg-gradient-to-br from-green-600 to-green-800"
            : "bg-gradient-to-br from-red-600 to-red-800"
        )}
      >
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          {isCompleted ? (
            <CheckCircle2 size={32} className="text-white" />
          ) : (
            <Clock size={32} className="text-white animate-pulse" />
          )}
        </div>
        <h1 className="text-lg font-bold">
          {isCompleted ? "ได้รับการช่วยเหลือแล้ว" : "กำลังรอความช่วยเหลือ"}
        </h1>
        <p className="text-white/70 text-xs mt-1">
          เหตุการณ์ #{id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Status tracker */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">สถานะการช่วยเหลือ</h2>
          <div className="space-y-3">
            {STATUS_STEPS.map((step, idx) => {
              const done = idx <= currentStep;
              const active = idx === currentStep;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        done
                          ? active
                            ? "bg-blue-600 ring-4 ring-blue-100"
                            : "bg-green-500"
                          : "bg-gray-200"
                      )}
                    >
                      {done && !active ? (
                        <CheckCircle2 size={16} className="text-white" />
                      ) : active ? (
                        <Loader2 size={14} className="text-white animate-spin" />
                      ) : (
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      )}
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div
                        className={cn(
                          "w-0.5 h-6 mt-1",
                          done ? "bg-green-400" : "bg-gray-200"
                        )}
                      />
                    )}
                  </div>
                  <div className="pt-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        done ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-0.5",
                        active ? "text-blue-600" : "text-gray-400"
                      )}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Responder info */}
        {incident.responder && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">ผู้รับผิดชอบ</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {incident.responder.firstName} {incident.responder.lastName}
                </p>
                <p className="text-xs text-gray-400">
                  รับเรื่อง {formatDateTime(incident.responder.acceptedAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Incident details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">รายละเอียดเหตุการณ์</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ประเภท</span>
              <span className="font-medium">{incidentTypeLabel(incident.incidentType)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ความรุนแรง</span>
              <span className="font-medium">{severityLabel(incident.severity)}</span>
            </div>
            {incident.latitude && (
              <div className="flex justify-between">
                <span className="text-gray-500">ตำแหน่ง GPS</span>
                <span className="font-medium text-xs text-right">
                  {incident.latitude.toFixed(5)},{incident.longitude?.toFixed(5)}
                </span>
              </div>
            )}
            {incident.description && (
              <div>
                <span className="text-gray-500">รายละเอียด</span>
                <p className="mt-1 text-gray-800">{incident.description}</p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">เวลาแจ้ง</span>
              <span className="font-medium">{formatDateTime(incident.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Emergency contacts */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">เบอร์ฉุกเฉิน</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "โทรฉุกเฉิน", tel: "191", color: "bg-red-50 text-red-700" },
              { label: "ห้องพยาบาล", tel: "02-xxx-xxxx", color: "bg-blue-50 text-blue-700" },
            ].map(({ label, tel, color }) => (
              <a
                key={label}
                href={`tel:${tel}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium",
                  color
                )}
              >
                <Phone size={16} />
                <div>
                  <div className="text-xs opacity-70">{label}</div>
                  <div>{tel}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <Link
          href="/student/dashboard"
          className="block text-center py-3 text-sm text-gray-500 hover:text-gray-700"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}

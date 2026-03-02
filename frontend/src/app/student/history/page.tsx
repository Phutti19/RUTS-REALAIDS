"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ClipboardList, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDateTime, statusLabel } from "@/lib/utils";
import type { Visit } from "@/types";

const VISIT_TYPE_TH: Record<string, string> = {
  walk_in: "Walk-in",
  emergency: "เหตุฉุกเฉิน",
  appointment: "นัดหมาย",
  follow_up: "ติดตามอาการ",
};

export default function HistoryPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Visit[] }>("/visits?limit=50").then((res) => {
      if (res.success) {
        setVisits((res.data as unknown as { data: Visit[] }).data ?? []);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/student/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-semibold text-gray-800">ประวัติการใช้บริการ</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
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
                  visit.visitType === "emergency"
                    ? "bg-red-100"
                    : "bg-blue-100"
                )}
              >
                <ClipboardList
                  size={18}
                  className={cn(
                    visit.visitType === "emergency" ? "text-red-600" : "text-blue-600"
                  )}
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
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    visit.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  )}
                >
                  {statusLabel(visit.status)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

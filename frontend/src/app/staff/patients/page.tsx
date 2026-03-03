"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users, Search, Plus, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { cn, timeAgo, statusLabel } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";

interface PatientVisit {
  id: string;
  patientId: string;
  patient: { firstName: string; lastName: string; studentId: string | null };
  chiefComplaint: string;
  visitType: string;
  status: string;
  createdAt: string;
}

const VISIT_TYPE_TH: Record<string, string> = {
  walk_in: "Walk-in",
  emergency: "ฉุกเฉิน",
  appointment: "นัดหมาย",
  follow_up: "ติดตามอาการ",
};

const PAGE_SIZE = 15;

export default function PatientsPage() {
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const loadVisits = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
    if (statusFilter === "active") {
      params.append("status", "waiting");
      params.append("status", "in_treatment");
    } else if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (search.trim()) params.set("search", search.trim());
    const res = await api.get<unknown>(`/visits?${params}`);
    if (res.success) {
      const payload = res.data as { data: PatientVisit[]; total: number };
      setVisits(payload.data ?? []);
      setTotal(payload.total ?? 0);
    }
    setLoading(false);
  }, [statusFilter, page, search]);

  useEffect(() => { loadVisits(); }, [loadVisits]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);
  useWebSocket("queue:update", () => loadVisits(), [loadVisits]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ผู้รับบริการ</h1>
          <p className="text-sm text-gray-500">บันทึกการรักษาและประวัติผู้ป่วย</p>
        </div>
        <Link
          href="/staff/patients/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> รับผู้ป่วย
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex bg-white rounded-xl shadow-sm p-1 gap-1">
          {[
            { key: "active", label: "กำลังรักษา" },
            { key: "waiting", label: "รอรับ" },
            { key: "completed", label: "เสร็จสิ้น" },
            { key: "all", label: "ทั้งหมด" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                statusFilter === key ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัสนักศึกษา..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["#", "ผู้ป่วย", "อาการหลัก", "ประเภท", "สถานะ", "เวลา", ""].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <Loader2 size={24} className="animate-spin text-gray-300 mx-auto" />
                </td></tr>
              ) : visits.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <Users size={28} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">ไม่พบข้อมูล</p>
                </td></tr>
              ) : visits.map((v, idx) => (
                <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{v.patient.firstName} {v.patient.lastName}</p>
                    {v.patient.studentId && <p className="text-xs text-gray-400">{v.patient.studentId}</p>}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-gray-700 truncate">{v.chiefComplaint}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {VISIT_TYPE_TH[v.visitType] ?? v.visitType}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{timeAgo(v.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/staff/patients/${v.id}`}
                      className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} จาก {total} รายการ
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn("w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                      pg === page ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-600"
                    )}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-700",
    in_treatment: "bg-blue-100 text-blue-700",
    completed: "bg-gray-100 text-gray-600",
    referred: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full", map[status] ?? "bg-gray-100 text-gray-500")}>
      {statusLabel(status)}
    </span>
  );
}

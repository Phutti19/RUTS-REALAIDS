"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Loader2, Download, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface IncidentStats {
  from: string;
  to: string;
  total: number;
  byType: { type: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  byStatus: { status: string; count: number }[];
  topLocations: { location: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  dailyTrend: { date: string; count: number; avgResponseMinutes: number | null }[];
}

interface VisitStats {
  from: string;
  to: string;
  total: number;
  byType: { type: string; count: number }[];
  topMedicines: { medicineId: string; name: string; totalDispensed: number }[];
}

const TYPE_LABEL: Record<string, string> = {
  injury: "บาดเจ็บ", illness: "ป่วย", accident: "อุบัติเหตุ",
  fainting: "หมดสติ", other: "อื่นๆ",
};

const VISIT_TYPE_LABEL: Record<string, string> = {
  walk_in: "Walk-in", emergency: "ฉุกเฉิน", appointment: "นัดหมาย", follow_up: "ติดตาม",
};

const PIE_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];
const HOUR_LABEL = (h: number) => `${String(h).padStart(2, "00")}:00`;

function getDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(from), to: fmt(to) };
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [incidents, setIncidents] = useState<IncidentStats | null>(null);
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const { from, to } = getDateRange(parseInt(period));
    Promise.all([
      api.get<IncidentStats>(`/reports/incidents?from=${from}&to=${to}`),
      api.get<VisitStats>(`/reports/visits?from=${from}&to=${to}`),
    ]).then(([incRes, visRes]) => {
      if (incRes.success && incRes.data) setIncidents(incRes.data);
      if (visRes.success && visRes.data) setVisits(visRes.data);
      setLoading(false);
    });
  }, [period]);

  const avgResponseMins = (() => {
    if (!incidents?.dailyTrend) return null;
    const arr = incidents.dailyTrend.filter((d) => d.avgResponseMinutes != null);
    if (arr.length === 0) return null;
    return Math.round(arr.reduce((s, d) => s + (d.avgResponseMinutes ?? 0), 0) / arr.length);
  })();

  const pieData = (incidents?.byType ?? []).map((t) => ({
    name: TYPE_LABEL[t.type] ?? t.type,
    value: t.count,
  }));

  const today = new Date().toISOString().split("T")[0];

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.download(`/reports/export/pdf?type=monthly&date=${today}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${period}days.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
    setExporting(false);
  };

  return (
    <div className="space-y-5 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-sm text-gray-500">สถิติและแนวโน้ม</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-xl shadow-sm p-1 gap-1">
            {[
              { key: "7", label: "7 วัน" },
              { key: "30", label: "30 วัน" },
              { key: "90", label: "90 วัน" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key as typeof period)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  period === key ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">รายงานสถิติ</h1>
        <p className="text-sm text-gray-500">ห้องพยาบาล มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย</p>
        <p className="text-xs text-gray-400">ย้อนหลัง {period} วัน · พิมพ์เมื่อ {new Date().toLocaleDateString("th-TH", { dateStyle: "full" })}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{incidents?.total ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">เหตุฉุกเฉินทั้งหมด</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{visits?.total ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">ผู้รับบริการ</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {avgResponseMins != null ? `${avgResponseMins}` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">นาที (เวลาตอบสนองเฉลี่ย)</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* Daily incident trend */}
          {incidents && incidents.dailyTrend.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">เหตุฉุกเฉินรายวัน</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incidents.dailyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}
                  />
                  <Bar dataKey="count" name="เหตุฉุกเฉิน" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Avg response line chart */}
          {incidents && incidents.dailyTrend.some((d) => d.avgResponseMinutes != null) && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">เวลาตอบสนองเฉลี่ย (นาที)</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={incidents.dailyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "long" })}
                    formatter={(v) => [`${v} นาที`, "เวลาตอบสนอง"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgResponseMinutes"
                    name="นาที"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Charts row: pie + peak hours */}
          <div className="grid grid-cols-2 gap-4">
            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">ประเภทเหตุการณ์</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {incidents && incidents.peakHours.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">ชั่วโมงที่มีเหตุบ่อย</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={incidents.peakHours} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={HOUR_LABEL}
                      tick={{ fontSize: 9 }}
                      interval={2}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(v) => `${HOUR_LABEL(Number(v))} – ${HOUR_LABEL(Number(v) + 1)}`}
                      formatter={(v) => [v, "เหตุ"]}
                    />
                    <Bar dataKey="count" name="เหตุ" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bottom: visit types + top locations */}
          <div className="grid grid-cols-2 gap-4">
            {visits && visits.byType.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={15} className="text-blue-500" />
                  <h2 className="text-sm font-semibold text-gray-800">ประเภทการเข้ารับบริการ</h2>
                </div>
                <div className="space-y-2">
                  {visits.byType.map(({ type, count }, i) => {
                    const max = Math.max(...visits.byType.map((v) => v.count));
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600">{VISIT_TYPE_LABEL[type] ?? type}</span>
                          <span className="font-semibold text-gray-800">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(count / max) * 100}%`,
                              backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {incidents && incidents.topLocations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-orange-500" />
                  <h2 className="text-sm font-semibold text-gray-800">พื้นที่เกิดเหตุบ่อย</h2>
                </div>
                <div className="space-y-2">
                  {incidents.topLocations.slice(0, 5).map(({ location, count }, i) => (
                    <div key={location} className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-xs text-gray-700 truncate font-mono">{location || "ไม่ระบุ"}</span>
                      <span className="text-xs font-semibold text-gray-500">{count} ครั้ง</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {incidents && incidents.total === 0 && visits && visits.total === 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <BarChart3 size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">ไม่มีข้อมูลในช่วงเวลานี้</p>
            </div>
          )}
        </>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Siren, Users, Clock, TrendingUp, Loader2, Printer,
  AlertTriangle, Pill, MapPin, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
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
const SEVERITY_LABEL: Record<string, string> = {
  low: "ต่ำ", medium: "ปานกลาง", high: "สูง", critical: "วิกฤต",
};
const SEVERITY_COLOR: Record<string, string> = {
  low: "#10b981", medium: "#f59e0b", high: "#ef4444", critical: "#7c3aed",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "รอรับ", accepted: "รับแล้ว", in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
};
const VISIT_TYPE_LABEL: Record<string, string> = {
  walk_in: "Walk-in", emergency: "ฉุกเฉิน", appointment: "นัดหมาย", follow_up: "ติดตาม",
};

const PIE_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];
const HOUR_LABEL = (h: number) => `${String(h).padStart(2, "0")}:00`;

function getDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(from), to: fmt(to) };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}
function fmtDateLong(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4 border border-gray-100 dark:border-gray-700 print:shadow-none print:border print:rounded-lg">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────
function Section({ title, icon, children, className }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 print:shadow-none print:border print:rounded-lg", className)}>
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-gray-400">{icon}</span>}
        <h2 className="text-sm font-bold text-gray-800 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Horizontal bar ─────────────────────────────────────────────────────────────
function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[160px]">{label}</span>
        <span className="font-semibold text-gray-800 dark:text-white ml-2">{count}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Print table ────────────────────────────────────────────────────────────────
function PrintTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="hidden print:table w-full text-xs border-collapse mt-2">
      <thead>
        <tr className="border-b-2 border-gray-800">
          {headers.map((h) => (
            <th key={h} className="text-left py-1 px-2 font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-200">
            {row.map((cell, j) => (
              <td key={j} className="py-1 px-2">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [incidents, setIncidents] = useState<IncidentStats | null>(null);
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

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
    if (!arr.length) return null;
    return Math.round(arr.reduce((s, d) => s + (d.avgResponseMinutes ?? 0), 0) / arr.length);
  })();

  const pieData = (incidents?.byType ?? []).map((t) => ({
    name: TYPE_LABEL[t.type] ?? t.type,
    value: t.count,
  }));

  const { from, to } = getDateRange(parseInt(period));
  const periodLabel = `${fmtDateLong(from)} – ${fmtDateLong(to)}`;

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 200);
  };

  return (
    <div className="space-y-4 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">รายงาน</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period tabs */}
          <div className="flex bg-white dark:bg-gray-800 rounded-xl shadow-sm p-1 gap-1 border border-gray-100 dark:border-gray-700">
            {(["7", "30", "90"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setPeriod(k)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  period === k ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                {k} วัน
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            disabled={loading || printing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            พิมพ์ / PDF
          </button>
        </div>
      </div>

      {/* ── Print header (hidden on screen) ── */}
      <div className="hidden print:block text-center pb-4 mb-2 border-b-2 border-gray-800">
        <h1 className="text-2xl font-bold">รายงานสถิติ</h1>
        <p className="text-sm font-semibold mt-1">ห้องพยาบาล มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย</p>
        <p className="text-xs text-gray-500 mt-0.5">{periodLabel}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          พิมพ์เมื่อ {new Date().toLocaleDateString("th-TH", { dateStyle: "full" })}
        </p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Siren size={20} className="text-red-600" />}
              color="bg-red-50 dark:bg-red-950/40"
              label="เหตุฉุกเฉิน"
              value={incidents?.total ?? "—"}
              sub={`${period} วันที่ผ่านมา`}
            />
            <StatCard
              icon={<Users size={20} className="text-blue-600" />}
              color="bg-blue-50 dark:bg-blue-950/40"
              label="ผู้รับบริการ"
              value={visits?.total ?? "—"}
              sub={`${period} วันที่ผ่านมา`}
            />
            <StatCard
              icon={<Clock size={20} className="text-green-600" />}
              color="bg-green-50 dark:bg-green-950/40"
              label="เวลาตอบสนองเฉลี่ย"
              value={avgResponseMins != null ? `${avgResponseMins} นาที` : "—"}
              sub="จากเหตุที่มีการตอบรับ"
            />
            <StatCard
              icon={<Activity size={20} className="text-purple-600" />}
              color="bg-purple-50 dark:bg-purple-950/40"
              label="เสร็จสิ้น"
              value={incidents?.byStatus.find((s) => s.status === "completed")?.count ?? 0}
              sub="เหตุที่ปิดแล้ว"
            />
          </div>

          {/* ── Daily trend bar chart ── */}
          {incidents && incidents.dailyTrend.length > 0 && (
            <Section title="เหตุฉุกเฉินรายวัน" icon={<Siren size={15} />}>
              <div className="print:hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={incidents.dailyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDate}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(v) => fmtDate(String(v))}
                      formatter={(v) => [v, "เหตุฉุกเฉิน"]}
                    />
                    <Bar dataKey="count" name="เหตุฉุกเฉิน" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <PrintTable
                headers={["วันที่", "จำนวนเหตุ", "เวลาตอบสนองเฉลี่ย (นาที)"]}
                rows={incidents.dailyTrend.map((d) => [
                  fmtDate(d.date),
                  d.count,
                  d.avgResponseMinutes != null ? d.avgResponseMinutes : "—",
                ])}
              />
            </Section>
          )}

          {/* ── Avg response line chart (screen only — data already in daily trend table) ── */}
          {incidents && incidents.dailyTrend.some((d) => d.avgResponseMinutes != null) && (
            <Section title="เวลาตอบสนองเฉลี่ยรายวัน (นาที)" icon={<Clock size={15} />} className="print:hidden">
              <div className="print:hidden">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={incidents.dailyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDate}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(v) => fmtDate(String(v))}
                      formatter={(v) => [`${v} นาที`, "เวลาตอบสนอง"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgResponseMinutes"
                      name="นาที"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}

          {/* ── Row: pie + peak hours ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Incident type pie */}
            {pieData.length > 0 && (
              <Section title="ประเภทเหตุการณ์" icon={<Siren size={15} />}>
                <div className="print:hidden">
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={35}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, name]} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <PrintTable
                  headers={["ประเภท", "จำนวน"]}
                  rows={incidents!.byType.map((t) => [TYPE_LABEL[t.type] ?? t.type, t.count])}
                />
              </Section>
            )}

            {/* Peak hours */}
            {incidents && incidents.peakHours.length > 0 && (
              <Section title="ชั่วโมงที่มีเหตุบ่อย" icon={<Clock size={15} />}>
                <div className="print:hidden">
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={incidents.peakHours} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tickFormatter={HOUR_LABEL} tick={{ fontSize: 9 }} interval={2} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(v) => `${HOUR_LABEL(Number(v))} – ${HOUR_LABEL(Number(v) + 1)}`}
                        formatter={(v) => [v, "เหตุ"]}
                      />
                      <Bar dataKey="count" name="เหตุ" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <PrintTable
                  headers={["ชั่วโมง", "จำนวนเหตุ"]}
                  rows={incidents.peakHours.map((h) => [HOUR_LABEL(h.hour), h.count])}
                />
              </Section>
            )}
          </div>

          {/* ── Row: severity + status ── */}
          {incidents && (incidents.bySeverity.length > 0 || incidents.byStatus.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {incidents.bySeverity.length > 0 && (
                <Section title="ระดับความรุนแรง" icon={<AlertTriangle size={15} />}>
                  <div className="space-y-2.5 print:hidden">
                    {incidents.bySeverity.map((s) => (
                      <HBar
                        key={s.severity}
                        label={SEVERITY_LABEL[s.severity] ?? s.severity}
                        count={s.count}
                        max={Math.max(...incidents.bySeverity.map((x) => x.count))}
                        color={SEVERITY_COLOR[s.severity] ?? "#6b7280"}
                      />
                    ))}
                  </div>
                  <PrintTable
                    headers={["ระดับ", "จำนวน"]}
                    rows={incidents.bySeverity.map((s) => [SEVERITY_LABEL[s.severity] ?? s.severity, s.count])}
                  />
                </Section>
              )}

              {incidents.byStatus.length > 0 && (
                <Section title="สถานะเหตุการณ์" icon={<Activity size={15} />}>
                  <div className="space-y-2.5 print:hidden">
                    {incidents.byStatus.map((s, i) => (
                      <HBar
                        key={s.status}
                        label={STATUS_LABEL[s.status] ?? s.status}
                        count={s.count}
                        max={Math.max(...incidents.byStatus.map((x) => x.count))}
                        color={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </div>
                  <PrintTable
                    headers={["สถานะ", "จำนวน"]}
                    rows={incidents.byStatus.map((s) => [STATUS_LABEL[s.status] ?? s.status, s.count])}
                  />
                </Section>
              )}
            </div>
          )}

          {/* ── Row: top locations + visit types ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {incidents && incidents.topLocations.length > 0 && (
              <Section title="พื้นที่เกิดเหตุบ่อย (พิกัด)" icon={<MapPin size={15} />}>
                <div className="space-y-2 print:hidden">
                  {incidents.topLocations.slice(0, 5).map(({ location, count }, i) => (
                    <div key={location} className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate font-mono">{location || "ไม่ระบุ"}</span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{count} ครั้ง</span>
                    </div>
                  ))}
                </div>
                <PrintTable
                  headers={["#", "พิกัด", "จำนวน (ครั้ง)"]}
                  rows={incidents.topLocations.slice(0, 5).map(({ location, count }, i) => [i + 1, location || "ไม่ระบุ", count])}
                />
              </Section>
            )}

            {visits && visits.byType.length > 0 && (
              <Section title="ประเภทการเข้ารับบริการ" icon={<TrendingUp size={15} />}>
                <div className="space-y-2.5 print:hidden">
                  {visits.byType.map(({ type, count }, i) => (
                    <HBar
                      key={type}
                      label={VISIT_TYPE_LABEL[type] ?? type}
                      count={count}
                      max={Math.max(...visits.byType.map((v) => v.count))}
                      color={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </div>
                <PrintTable
                  headers={["ประเภท", "จำนวน"]}
                  rows={visits.byType.map(({ type, count }) => [VISIT_TYPE_LABEL[type] ?? type, count])}
                />
              </Section>
            )}
          </div>

          {/* ── Top medicines ── */}
          {visits && visits.topMedicines.length > 0 && (
            <Section title="ยาที่ใช้สูงสุด 10 อันดับ" icon={<Pill size={15} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 print:hidden">
                {visits.topMedicines.map(({ name, totalDispensed }, i) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] + "22", color: PIE_COLORS[i % PIE_COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{name}</span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{totalDispensed} หน่วย</span>
                  </div>
                ))}
              </div>
              <PrintTable
                headers={["#", "ชื่อยา", "จำนวนที่ใช้ (หน่วย)"]}
                rows={visits.topMedicines.map(({ name, totalDispensed }, i) => [i + 1, name, totalDispensed])}
              />
            </Section>
          )}

          {/* Empty state */}
          {incidents?.total === 0 && visits?.total === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center border border-gray-100 dark:border-gray-700">
              <Activity size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">ไม่มีข้อมูลในช่วงเวลานี้</p>
            </div>
          )}
        </>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 12mm; }
          body { font-family: 'Sarabun', 'Noto Sans Thai', Arial, sans-serif !important; }

          /* ── Override layout overflow constraints to allow multi-page print ── */
          html, body,
          .portal-page,
          .portal-page > div,
          main {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }

          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:table { display: table !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border { border: 1px solid #e5e7eb !important; }
          .print\\:rounded-lg { border-radius: 8px !important; }
          /* Allow grids to break across pages, but keep each card intact */
          .grid { break-inside: auto; }
          .bg-white { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

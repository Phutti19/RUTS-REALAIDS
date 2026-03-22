"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Package, Plus, Loader2, AlertTriangle,
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api, extractError } from "@/lib/api";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { Medicine, MedicineBatch, MedicineStockLog } from "@/types";

const CATEGORY_TH: Record<string, string> = { medicine: "ยา", supply: "วัสดุ", equipment: "อุปกรณ์" };
const CATEGORY_ICON: Record<string, string> = { medicine: "💊", supply: "🩹", equipment: "🔧" };

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  received: { label: "รับเข้า",  icon: <TrendingUp size={15} />,   color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  dispensed:{ label: "จ่ายออก", icon: <TrendingDown size={15} />, color: "text-red-500",     bg: "bg-red-100 dark:bg-red-900/30" },
  expired:  { label: "หมดอายุ", icon: <AlertTriangle size={15} />,color: "text-orange-500",  bg: "bg-orange-100 dark:bg-orange-900/30" },
  adjusted: { label: "ปรับ",    icon: <Package size={15} />,      color: "text-blue-500",    bg: "bg-blue-100 dark:bg-blue-900/30" },
};

export default function MedicineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [logs, setLogs] = useState<MedicineStockLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [batchQty, setBatchQty] = useState(1);
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [addingBatch, setAddingBatch] = useState(false);
  const [batchMsg, setBatchMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustBatchId, setAdjustBatchId] = useState<string>("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    const [medRes, batchRes, logRes] = await Promise.all([
      api.get<Medicine>(`/medicines/${id}`),
      api.get<{ data: MedicineBatch[] }>(`/medicines/${id}/batches`),
      api.get<{ data: MedicineStockLog[] }>(`/medicines/${id}/stock-logs?limit=30`),
    ]);
    if (medRes.success && medRes.data) setMedicine(medRes.data);
    if (batchRes.success) setBatches(Array.isArray(batchRes.data) ? (batchRes.data as unknown as MedicineBatch[]) : []);
    if (logRes.success) setLogs(Array.isArray(logRes.data) ? (logRes.data as unknown as MedicineStockLog[]) : []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    setDeleting(true); setDeleteError("");
    const res = await api.delete(`/medicines/${id}`);
    setDeleting(false);
    if (res.success) router.push("/staff/medicines");
    else setDeleteError(extractError(res, "ไม่สามารถลบได้"));
  };

  const addBatch = async () => {
    setAddingBatch(true); setBatchMsg(null);
    const res = await api.post(`/medicines/${id}/batches`, {
      batchNumber, quantity: batchQty, expiryDate, notes: batchNote.trim() || null,
    });
    setAddingBatch(false);
    if (res.success) {
      setBatchMsg({ type: "ok", text: "เพิ่ม batch สำเร็จ" });
      setBatchNumber(""); setBatchQty(1); setExpiryDate(""); setBatchNote("");
      setShowBatchForm(false); loadData();
    } else {
      setBatchMsg({ type: "err", text: extractError(res) });
    }
  };

  const adjustStock = async () => {
    if (adjustQty === 0) return;
    setAdjusting(true); setAdjustMsg(null);
    const res = await api.post(`/medicines/${id}/adjust`, {
      quantityChange: adjustQty, batchId: adjustBatchId || undefined,
      note: adjustNote.trim() || null,
    });
    setAdjusting(false);
    if (res.success) {
      setAdjustMsg({ type: "ok", text: "ปรับ stock สำเร็จ" });
      setAdjustQty(0); setAdjustBatchId(""); setAdjustNote("");
      setShowAdjustForm(false); loadData();
    } else {
      setAdjustMsg({ type: "err", text: extractError(res) });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-gray-300" />
    </div>
  );

  if (!medicine) return (
    <div className="text-center py-16">
      <p className="text-gray-500">ไม่พบข้อมูล</p>
      <Link href="/staff/medicines" className="text-blue-600 text-sm hover:underline mt-2 block">กลับ</Link>
    </div>
  );

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const batchTotal = batches.filter((b) => new Date(b.expiryDate) > new Date()).reduce((s, b) => s + b.quantity, 0);
  const mismatch = batches.length > 0 && batchTotal !== medicine.stockQuantity;
  const stockPct = Math.min(100, (medicine.stockQuantity / Math.max(medicine.minStockLevel * 3, 1)) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href="/staff/medicines" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          {CATEGORY_ICON[medicine.category] ?? "💊"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{medicine.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {medicine.genericName && `${medicine.genericName} · `}
            {CATEGORY_TH[medicine.category] ?? medicine.category}
          </p>
        </div>
        {medicine.isLowStock && (
          <span className="flex items-center gap-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-full font-semibold">
            <AlertTriangle size={14} /> สต๊อกต่ำ
          </span>
        )}
        <button onClick={() => { setShowDeleteConfirm(true); setDeleteError(""); }}
          className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors">
          <Trash2 size={20} />
        </button>
      </div>

      {/* ── Delete confirm dialog ──────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 size={22} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-base">ลบ &ldquo;{medicine.name}&rdquo;?</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  หากยานี้เคยถูกใช้ในบันทึกผู้ป่วยจะไม่สามารถลบได้
                </p>
              </div>
            </div>
            {deleteError && (
              <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-4 py-3">
                <AlertCircle size={16} className="flex-shrink-0" /> {deleteError}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(""); }}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                ยกเลิก
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ────────────────────────────────── */}
        <div className="space-y-4">

          {/* Stock overview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mb-1">คงเหลือในระบบ</p>
            <div className="flex items-end gap-2">
              <p className={cn("text-5xl font-black leading-none", medicine.isLowStock ? "text-red-600" : "text-gray-900 dark:text-white")}>
                {medicine.stockQuantity.toLocaleString()}
              </p>
              <p className="text-lg text-gray-400 dark:text-gray-500 mb-1">{medicine.unit}</p>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>ระดับสต๊อก</span>
                <span>{Math.round(stockPct)}%</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all",
                  medicine.isLowStock ? "bg-red-500" : stockPct < 60 ? "bg-amber-400" : "bg-emerald-500"
                )} style={{ width: `${stockPct}%` }} />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">เกณฑ์ขั้นต่ำ</p>
                <p className={cn("text-lg font-bold", medicine.isLowStock ? "text-red-600" : "text-gray-600 dark:text-gray-300")}>
                  {medicine.minStockLevel} {medicine.unit}
                </p>
              </div>
              {batches.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500">รวมจาก Batch</p>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <p className={cn("text-base font-bold", mismatch ? "text-amber-600" : "text-gray-600 dark:text-gray-300")}>
                      {batchTotal} {medicine.unit}
                    </p>
                    {mismatch ? (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">ไม่ตรง</span>
                    ) : (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">ตรงกัน</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button onClick={() => { setShowBatchForm(!showBatchForm); setShowAdjustForm(false); }}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-bold transition-colors shadow-sm">
              <span className="flex items-center gap-2"><Plus size={18} /> รับยาเข้า (Batch)</span>
              {showBatchForm ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
            <button onClick={() => { setShowAdjustForm(!showAdjustForm); setShowBatchForm(false); }}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200 rounded-xl text-base font-bold transition-colors">
              <span className="flex items-center gap-2"><Package size={18} /> ปรับ stock</span>
              {showAdjustForm ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>
          </div>

          {/* Add batch form */}
          {showBatchForm && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-bold text-blue-800 dark:text-blue-300">รับยาเข้า Batch ใหม่</h3>
              <Field label="เลข Batch *">
                <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="เช่น LOT-2026-001"
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="จำนวน *">
                  <input type="number" min={1} value={batchQty} onChange={(e) => setBatchQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </Field>
                <Field label="วันหมดอายุ *">
                  <input type="date" value={expiryDate} min={today} onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </Field>
              </div>
              <Field label="หมายเหตุ">
                <input value={batchNote} onChange={(e) => setBatchNote(e.target.value)} placeholder="หมายเหตุ..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </Field>
              {batchMsg && <Msg type={batchMsg.type} text={batchMsg.text} />}
              <button onClick={addBatch} disabled={addingBatch || !batchNumber || !expiryDate}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                {addingBatch ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                บันทึก Batch
              </button>
            </div>
          )}

          {/* Adjust form */}
          {showAdjustForm && (() => {
            const hasBatches = batches.length > 0;
            const selectedBatch = batches.find((b) => b.id === adjustBatchId) ?? null;
            const canSubmit = adjustQty !== 0 && adjustNote.trim() && (!hasBatches || adjustBatchId !== "");
            return (
              <div className="bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-2xl p-5 space-y-4">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">ปรับ stock</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">ใส่ตัวเลขบวก (+) เพื่อเพิ่ม หรือลบ (−) เพื่อลด</p>

                {hasBatches ? (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1.5">Batch ที่ปรับ <span className="text-red-500">*</span></p>
                    <select value={adjustBatchId} onChange={(e) => setAdjustBatchId(e.target.value)}
                      className={cn(
                        "w-full px-3.5 py-2.5 border bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400",
                        !adjustBatchId ? "border-amber-300 dark:border-amber-700" : "border-gray-200 dark:border-gray-600"
                      )}>
                      <option value="">— เลือก Batch —</option>
                      {batches.map((b) => {
                        const isExpired = b.expiryDate < today;
                        const isExpiring = !isExpired && b.expiryDate <= thirtyDaysLater;
                        return (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} · {b.quantity} {medicine.unit} · หมดอายุ {formatDate(b.expiryDate)}
                            {isExpired ? " (หมดอายุ)" : isExpiring ? " (ใกล้หมด)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    {selectedBatch && (
                      <div className="mt-2.5 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-3.5 py-2.5">
                        <Package size={14} className="text-blue-500 flex-shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          คงเหลือใน Batch: <span className="font-bold">{selectedBatch.quantity} {medicine.unit}</span>
                          {adjustQty !== 0 && (
                            <span className={cn("ml-2 font-semibold", (selectedBatch.quantity + adjustQty) < 0 ? "text-red-600" : "text-gray-700 dark:text-gray-200")}>
                              → {Math.max(0, selectedBatch.quantity + adjustQty)} {medicine.unit}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl px-3.5 py-3">
                    <AlertCircle size={15} className="text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">ยังไม่มี Batch — การปรับจะอัพเดตเฉพาะยอดในระบบ</p>
                  </div>
                )}

                <Field label="จำนวนที่ปรับ">
                  <input type="number" value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </Field>
                <Field label={<>เหตุผล <span className="text-red-500">*</span></>}>
                  <input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="ระบุเหตุผล..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </Field>
                {adjustMsg && <Msg type={adjustMsg.type} text={adjustMsg.text} />}
                <button onClick={adjustStock} disabled={adjusting || !canSubmit}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  {adjusting ? <Loader2 size={16} className="animate-spin" /> : null}
                  ยืนยันการปรับ
                </button>
              </div>
            );
          })()}
        </div>

        {/* ── Right column ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Batches */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-700 dark:text-gray-200">
                Batches <span className="text-gray-400 dark:text-gray-500 font-normal">({batches.length})</span>
              </h2>
            </div>
            {batches.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">ยังไม่มี batch</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">เลข Batch</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">จำนวน</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">วันหมดอายุ</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">วันรับเข้า</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {batches.map((b) => {
                      const isExpired = b.expiryDate < today;
                      const isExpiring = !isExpired && b.expiryDate <= thirtyDaysLater;
                      return (
                        <tr key={b.id} className={cn(
                          "transition-colors",
                          isExpired ? "bg-red-50 dark:bg-red-950/20" :
                          isExpiring ? "bg-orange-50 dark:bg-orange-950/20" :
                          "hover:bg-gray-50/60 dark:hover:bg-gray-700/30"
                        )}>
                          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-gray-700 dark:text-gray-200">{b.batchNumber}</td>
                          <td className="px-5 py-3.5">
                            <span className="text-base font-bold text-gray-800 dark:text-gray-100">{b.quantity}</span>
                            <span className="text-sm text-gray-400 dark:text-gray-500 ml-1.5">{medicine.unit}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn("text-sm font-semibold",
                              isExpired ? "text-red-600 dark:text-red-400" :
                              isExpiring ? "text-orange-600 dark:text-orange-400" :
                              "text-gray-700 dark:text-gray-200"
                            )}>
                              {formatDate(b.expiryDate)}
                            </span>
                            {isExpired && <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">หมดอายุ</span>}
                            {isExpiring && <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-semibold">ใกล้หมด</span>}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-400 dark:text-gray-500">{formatDate(b.receivedAt)}</td>
                          <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">{b.note ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stock logs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-700 dark:text-gray-200">ประวัติการเคลื่อนไหว</h2>
            </div>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">ยังไม่มีประวัติ</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {logs.map((log) => {
                  const meta = ACTION_META[log.action] ?? { label: log.action, icon: null, color: "text-gray-500", bg: "bg-gray-100" };
                  return (
                    <div key={log.id} className="flex items-center gap-4 px-5 py-4">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", meta.bg)}>
                        <span className={meta.color}>{meta.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-sm font-bold", meta.color)}>{meta.label}</span>
                          <span className={cn("text-base font-bold",
                            log.quantityChange > 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {log.quantityChange > 0 ? "+" : ""}{log.quantityChange} {medicine.unit}
                          </span>
                          <span className="text-sm text-gray-400 dark:text-gray-500">
                            → คงเหลือ <span className="font-semibold text-gray-600 dark:text-gray-300">{log.remainingStock}</span>
                          </span>
                        </div>
                        {log.note && <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 truncate">{log.note}</p>}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Msg({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm rounded-xl px-4 py-2.5",
      type === "ok" ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
    )}>
      {type === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {text}
    </div>
  );
}

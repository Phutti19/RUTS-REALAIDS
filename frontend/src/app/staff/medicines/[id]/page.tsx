"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { Medicine, MedicineBatch, MedicineStockLog } from "@/types";

export default function MedicineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [logs, setLogs] = useState<MedicineStockLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Add batch form
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [batchQty, setBatchQty] = useState(1);
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [addingBatch, setAddingBatch] = useState(false);
  const [batchMsg, setBatchMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Adjust stock form
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustQty, setAdjustQty] = useState<number>(0);
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
    if (batchRes.success) {
      setBatches(Array.isArray(batchRes.data) ? (batchRes.data as unknown as MedicineBatch[]) : []);
    }
    if (logRes.success) {
      setLogs(Array.isArray(logRes.data) ? (logRes.data as unknown as MedicineStockLog[]) : []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const addBatch = async () => {
    setAddingBatch(true);
    setBatchMsg(null);
    const res = await api.post(`/medicines/${id}/batches`, {
      batchNumber,
      quantity: batchQty,
      expiryDate,
      notes: batchNote.trim() || null,
    });
    setAddingBatch(false);
    if (res.success) {
      setBatchMsg({ type: "ok", text: "เพิ่ม batch สำเร็จ" });
      setBatchNumber("");
      setBatchQty(1);
      setExpiryDate("");
      setBatchNote("");
      setShowBatchForm(false);
      loadData();
    } else {
      setBatchMsg({ type: "err", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const adjustStock = async () => {
    if (adjustQty === 0) return;
    setAdjusting(true);
    setAdjustMsg(null);
    const res = await api.post(`/medicines/${id}/adjust`, {
      quantityChange: adjustQty,
      note: adjustNote.trim() || null,
    });
    setAdjusting(false);
    if (res.success) {
      setAdjustMsg({ type: "ok", text: "ปรับ stock สำเร็จ" });
      setAdjustQty(0);
      setAdjustNote("");
      setShowAdjustForm(false);
      loadData();
    } else {
      setAdjustMsg({ type: "err", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const ACTION_LABEL: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    received: { label: "รับเข้า", icon: <TrendingUp size={14} />, color: "text-green-600" },
    dispensed: { label: "จ่ายออก", icon: <TrendingDown size={14} />, color: "text-red-500" },
    expired: { label: "หมดอายุ", icon: <AlertTriangle size={14} />, color: "text-orange-500" },
    adjusted: { label: "ปรับ", icon: <Package size={14} />, color: "text-blue-500" },
  };

  const CATEGORY_TH: Record<string, string> = {
    medicine: "ยา", supply: "วัสดุ", equipment: "อุปกรณ์",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">ไม่พบข้อมูล</p>
        <Link href="/staff/medicines" className="text-blue-600 text-sm hover:underline mt-2 block">กลับ</Link>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/staff/medicines" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{medicine.name}</h1>
          <p className="text-sm text-gray-500">
            {medicine.genericName && `${medicine.genericName} · `}
            {CATEGORY_TH[medicine.category] ?? medicine.category}
          </p>
        </div>
        {medicine.isLowStock && (
          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-medium">
            <AlertTriangle size={13} /> สต๊อกต่ำ
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Stock overview */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs text-gray-400 mb-1">คงเหลือในสต๊อก</p>
            <p className={cn("text-4xl font-bold", medicine.isLowStock ? "text-red-600" : "text-gray-900")}>
              {medicine.stockQuantity}
            </p>
            <p className="text-sm text-gray-500">{medicine.unit}</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                เกณฑ์ขั้นต่ำ:{" "}
                <span className={cn("font-medium", medicine.isLowStock ? "text-red-600" : "text-gray-600")}>
                  {medicine.minStockLevel} {medicine.unit}
                </span>
              </p>
            </div>
          </div>

          {/* Stock progress bar */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>สต๊อก</span>
              <span>{Math.round((medicine.stockQuantity / Math.max(medicine.minStockLevel * 3, 1)) * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all",
                  medicine.isLowStock ? "bg-red-500" : "bg-green-500"
                )}
                style={{
                  width: `${Math.min(100, (medicine.stockQuantity / Math.max(medicine.minStockLevel * 3, 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={() => { setShowBatchForm(!showBatchForm); setShowAdjustForm(false); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <span className="flex items-center gap-2"><Plus size={16} /> รับยาเข้า (Batch)</span>
              {showBatchForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <button
              onClick={() => { setShowAdjustForm(!showAdjustForm); setShowBatchForm(false); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
            >
              <span className="flex items-center gap-2"><Package size={16} /> ปรับ stock</span>
              {showAdjustForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Add batch form */}
          {showBatchForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-800">รับยาเข้า Batch ใหม่</h3>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">เลข Batch *</label>
                <input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="เช่น LOT-2026-001"
                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">จำนวน *</label>
                  <input
                    type="number"
                    min={1}
                    value={batchQty}
                    onChange={(e) => setBatchQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">วันหมดอายุ *</label>
                  <input
                    type="date"
                    value={expiryDate}
                    min={today}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">หมายเหตุ</label>
                <input
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  placeholder="หมายเหตุ..."
                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {batchMsg && (
                <div className={cn("flex items-center gap-1.5 text-xs rounded-xl px-3 py-2",
                  batchMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                )}>
                  {batchMsg.type === "ok" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {batchMsg.text}
                </div>
              )}
              <button
                onClick={addBatch}
                disabled={addingBatch || !batchNumber || !expiryDate}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {addingBatch ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                บันทึก Batch
              </button>
            </div>
          )}

          {/* Adjust form */}
          {showAdjustForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">ปรับ stock</h3>
              <p className="text-xs text-gray-500">ใส่ตัวเลขบวก (+) เพื่อเพิ่ม หรือลบ (−) เพื่อลด</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">จำนวนที่ปรับ</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">เหตุผล *</label>
                <input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="ระบุเหตุผล..."
                  className="w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {adjustMsg && (
                <div className={cn("flex items-center gap-1.5 text-xs rounded-xl px-3 py-2",
                  adjustMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                )}>
                  {adjustMsg.type === "ok" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {adjustMsg.text}
                </div>
              )}
              <button
                onClick={adjustStock}
                disabled={adjusting || adjustQty === 0 || !adjustNote.trim()}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {adjusting ? <Loader2 size={14} className="animate-spin" /> : null}
                ยืนยันการปรับ
              </button>
            </div>
          )}
        </div>

        {/* Right: Batches + Stock logs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Batches */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Batches ({batches.length})</h2>
            </div>
            {batches.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">ยังไม่มี batch</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">เลข Batch</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">จำนวน</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">วันหมดอายุ</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">วันรับเข้า</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {batches.map((b) => {
                      const isExpired = b.expiryDate < today;
                      const isExpiring = !isExpired && b.expiryDate <= thirtyDaysLater;
                      return (
                        <tr
                          key={b.id}
                          className={cn(
                            "transition-colors",
                            isExpired ? "bg-red-50" : isExpiring ? "bg-orange-50" : "hover:bg-gray-50/60"
                          )}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs font-medium">{b.batchNumber}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold">{b.quantity}</span>
                            <span className="text-gray-400 ml-1 text-xs">{medicine.unit}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn(
                              "text-xs font-medium",
                              isExpired ? "text-red-600" : isExpiring ? "text-orange-600" : "text-gray-700"
                            )}>
                              {formatDate(b.expiryDate)}
                              {isExpired && " (หมดอายุ)"}
                              {isExpiring && " (ใกล้หมด)"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-400">{formatDate(b.receivedAt)}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{b.note ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stock logs */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">ประวัติการเคลื่อนไหว</h2>
            </div>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีประวัติ</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {logs.map((log) => {
                  const action = ACTION_LABEL[log.action] ?? { label: log.action, icon: null, color: "text-gray-500" };
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn("flex-shrink-0", action.color)}>{action.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-semibold", action.color)}>{action.label}</span>
                          <span className={cn("text-sm font-bold",
                            log.quantityChange > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {log.quantityChange > 0 ? "+" : ""}{log.quantityChange}
                          </span>
                          <span className="text-xs text-gray-400">
                            → คงเหลือ {log.remainingStock}
                          </span>
                        </div>
                        {log.note && <p className="text-xs text-gray-400 truncate">{log.note}</p>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
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

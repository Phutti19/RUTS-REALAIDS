"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "medicine", label: "ยา", desc: "ยารักษาโรคทั่วไป" },
  { value: "supply", label: "วัสดุ", desc: "วัสดุทางการแพทย์" },
  { value: "equipment", label: "อุปกรณ์", desc: "อุปกรณ์และเครื่องมือ" },
];

export default function NewMedicinePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [category, setCategory] = useState("medicine");
  const [unit, setUnit] = useState("");
  const [minStockLevel, setMinStockLevel] = useState(10);
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !unit.trim()) return;
    setSaving(true);
    setError("");
    const res = await api.post<{ id: string }>("/medicines", {
      name: name.trim(),
      genericName: genericName.trim() || null,
      category,
      unit: unit.trim(),
      minStockLevel,
      description: description.trim() || null,
    });
    setSaving(false);
    if (res.success && res.data) {
      router.push(`/staff/medicines/${res.data.id}`);
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/staff/medicines" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">เพิ่มรายการใหม่</h1>
          <p className="text-sm text-gray-500">ยา วัสดุ หรืออุปกรณ์ทางการแพทย์</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">ประเภท</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  category === value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <p className={cn("text-sm font-semibold", category === value ? "text-blue-700" : "text-gray-700")}>
                  {label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">
            ชื่อ <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น พาราเซตามอล 500mg"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Generic Name */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">ชื่อสามัญ</label>
          <input
            value={genericName}
            onChange={(e) => setGenericName(e.target.value)}
            placeholder="เช่น Paracetamol"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Unit + Min Stock */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              หน่วย <span className="text-red-500">*</span>
            </label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="เช่น เม็ด, ซอง, ชิ้น"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Stock ขั้นต่ำ
            </label>
            <input
              type="number"
              min={0}
              value={minStockLevel}
              onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">รายละเอียด / วิธีใช้</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="รายละเอียดเพิ่มเติม วิธีใช้ หรือข้อควรระวัง..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Link
            href="/staff/medicines"
            className="px-4 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !unit.trim()}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 size={15} className="animate-spin" />กำลังบันทึก...</>
            ) : (
              <><Package size={15} />เพิ่มรายการ</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

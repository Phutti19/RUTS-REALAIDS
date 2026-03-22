"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { api, extractError } from "@/lib/api";
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
      category,
      unit: unit.trim(),
      minStockLevel,
      description: description.trim() || null,
    });
    setSaving(false);
    if (res.success && res.data) {
      router.push(`/staff/medicines/${res.data.id}`);
    } else {
      setError(extractError(res));
    }
  };

  const CATEGORY_ICON: Record<string, string> = { medicine: "💊", supply: "🩹", equipment: "🔧" };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/staff/medicines" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">เพิ่มรายการใหม่</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">ยา วัสดุ หรืออุปกรณ์ทางการแพทย์</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-6">
        {/* Category */}
        <div>
          <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3 block">ประเภท</label>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map(({ value, label, desc }) => (
              <button key={value} onClick={() => setCategory(value)}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  category === value ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                )}
              >
                <p className="text-2xl mb-1">{CATEGORY_ICON[value]}</p>
                <p className={cn("text-base font-bold", category === value ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-200")}>
                  {label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 block">
            ชื่อ <span className="text-red-500">*</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="เช่น พาราเซตามอล 500mg"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {/* Unit + Min Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 block">
              หน่วย <span className="text-red-500">*</span>
            </label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)}
              placeholder="เช่น เม็ด, ซอง, ชิ้น"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 block">Stock ขั้นต่ำ</label>
            <input type="number" min={0} value={minStockLevel}
              onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 block">รายละเอียด / วิธีใช้</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3} placeholder="รายละเอียดเพิ่มเติม วิธีใช้ หรือข้อควรระวัง..."
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Link href="/staff/medicines"
            className="px-5 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-base font-semibold transition-colors">
            ยกเลิก
          </Link>
          <button onClick={handleSubmit} disabled={saving || !name.trim() || !unit.trim()}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2">
            {saving ? (
              <><Loader2 size={17} className="animate-spin" />กำลังบันทึก...</>
            ) : (
              <><Package size={17} />เพิ่มรายการ</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

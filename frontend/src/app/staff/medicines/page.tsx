"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Pill, Search, Plus } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Medicine } from "@/types";

const CATEGORY_TH: Record<string, string> = {
  medicine: "ยา",
  supply: "วัสดุ",
  equipment: "อุปกรณ์",
};

const UNIT_TH: Record<string, string> = {
  tablet: "เม็ด",
  capsule: "แคปซูล",
  bottle: "ขวด",
  box: "กล่อง",
  tube: "หลอด",
  piece: "ชิ้น",
  set: "ชุด",
  roll: "ม้วน",
};

function unitLabel(unit: string) {
  return UNIT_TH[unit] ?? unit;
}

function StockBar({ stock, min }: { stock: number; min: number }) {
  const max = Math.max(stock, min * 2, 1);
  const pct = Math.min((stock / max) * 100, 100);
  const color =
    stock === 0
      ? "bg-red-500"
      : stock < min
      ? "bg-amber-400"
      : stock < min * 1.5
      ? "bg-blue-400"
      : "bg-blue-500";
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MedicineCard({ med }: { med: Medicine }) {
  const isLow = med.isLowStock;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex flex-col gap-0.5 border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug">{med.name}</p>
          {med.genericName && (
            <p className="text-xs text-gray-400 truncate">{med.genericName}</p>
          )}
          <span className="inline-block mt-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
            {CATEGORY_TH[med.category] ?? med.category}
          </span>
        </div>
        <Link
          href={`/staff/medicines/${med.id}`}
          className="flex-shrink-0 px-3 py-1 text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          แก้ไข
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400 text-xs">คงเหลือ:</span>
          <span className={cn("font-semibold text-sm", isLow ? "text-red-500" : "text-blue-600")}>
            {med.stockQuantity.toLocaleString()} {unitLabel(med.unit)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400 text-xs">ขั้นต่ำ:</span>
          <span className="font-semibold text-sm text-amber-500">
            {med.minStockLevel.toLocaleString()} {unitLabel(med.unit)}
          </span>
        </div>
      </div>

      {isLow && (
        <p className="text-xs text-red-500 font-medium mt-1">⚠️ ต่ำกว่าเกณฑ์</p>
      )}

      <StockBar stock={med.stockQuantity} min={med.minStockLevel} />
    </div>
  );
}

function MedicinesContent() {
  const searchParams = useSearchParams();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(searchParams.get("tab") ?? "all");

  useEffect(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (tab === "low") params.set("lowStock", "true");
    if (tab === "expiring") params.set("expiringSoon", "true");

    api.get<Medicine[]>(`/medicines?${params.toString()}`).then((res) => {
      if (res.success) {
        setMedicines(Array.isArray(res.data) ? (res.data as unknown as Medicine[]) : []);
      }
      setLoading(false);
    });
  }, [tab]);

  const filtered = medicines.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.genericName?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">คลังยา</h1>
          <p className="text-sm text-gray-500">รายการยาทั้งหมด: {medicines.length} รายการ</p>
        </div>
        <Link
          href="/staff/medicines/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> + เพิ่มยาใหม่
        </Link>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-white dark:bg-gray-800 rounded-xl shadow-sm p-1 gap-1 border border-gray-100 dark:border-gray-700">
          {[
            { key: "all", label: "ทั้งหมด" },
            { key: "low", label: "⚠️ สต๊อกต่ำ" },
            { key: "expiring", label: "⏳ ใกล้หมดอายุ" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                tab === key ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหายา..."
            className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm w-52"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 h-32 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm">
            <Pill size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">ไม่พบรายการยา</p>
          </div>
        ) : (
          filtered.map((med) => <MedicineCard key={med.id} med={med} />)
        )}
      </div>
    </div>
  );
}

export default function MedicinesPage() {
  return (
    <Suspense>
      <MedicinesContent />
    </Suspense>
  );
}

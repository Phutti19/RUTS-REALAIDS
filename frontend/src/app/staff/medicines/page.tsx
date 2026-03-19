"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Pill, Search, Plus, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Medicine } from "@/types";

const CATEGORY_TH: Record<string, string> = {
  medicine: "ยา",
  supply: "วัสดุ",
  equipment: "อุปกรณ์",
};

const CATEGORY_ICON: Record<string, string> = {
  medicine: "💊",
  supply: "🩹",
  equipment: "🔧",
};

const UNIT_TH: Record<string, string> = {
  tablet: "เม็ด", capsule: "แคปซูล", bottle: "ขวด", box: "กล่อง",
  tube: "หลอด", piece: "ชิ้น", set: "ชุด", roll: "ม้วน",
};

function unitLabel(u: string) { return UNIT_TH[u] ?? u; }

function StockBar({ stock, min }: { stock: number; min: number }) {
  const max = Math.max(stock, min * 2, 1);
  const pct = Math.min((stock / max) * 100, 100);
  const color =
    stock === 0 ? "bg-red-500" :
    stock < min ? "bg-amber-400" :
    stock < min * 1.5 ? "bg-blue-400" :
    "bg-emerald-500";
  return (
    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MedicineCard({ med }: { med: Medicine }) {
  const isLow = med.isLowStock;
  const isEmpty = med.stockQuantity === 0;

  return (
    <Link href={`/staff/medicines/${med.id}`}
      className={cn(
        "relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 flex flex-col gap-0 border-2 transition-all hover:shadow-md active:scale-[0.99]",
        isEmpty ? "border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10" :
        isLow ? "border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10" :
        "border-transparent dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
      )}
    >
      {/* Alert badge */}
      {(isEmpty || isLow) && (
        <span className={cn(
          "absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full",
          isEmpty ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
        )}>
          {isEmpty ? "หมด" : "ต่ำกว่าเกณฑ์"}
        </span>
      )}

      {/* Icon + name */}
      <div className="flex items-start gap-3 pr-20">
        <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
          {CATEGORY_ICON[med.category] ?? "💊"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 dark:text-gray-100 text-base leading-snug truncate">{med.name}</p>
          {med.genericName && (
            <p className="text-sm text-gray-400 dark:text-gray-500 truncate mt-0.5">{med.genericName}</p>
          )}
          <span className="inline-block mt-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2.5 py-0.5 rounded-full">
            {CATEGORY_TH[med.category] ?? med.category}
          </span>
        </div>
      </div>

      {/* Stock numbers */}
      <div className="flex items-end justify-between mt-4">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">คงเหลือ</p>
          <p className={cn("text-3xl font-bold", isEmpty ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-800 dark:text-gray-100")}>
            {med.stockQuantity.toLocaleString()}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">{unitLabel(med.unit)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">ขั้นต่ำ</p>
          <p className="text-xl font-semibold text-gray-400 dark:text-gray-500">
            {med.minStockLevel.toLocaleString()}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">{unitLabel(med.unit)}</p>
        </div>
      </div>

      <StockBar stock={med.stockQuantity} min={med.minStockLevel} />

    </Link>
  );
}

function MedicinesContent() {
  const searchParams = useSearchParams();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(searchParams.get("tab") ?? "all");

  // Fetch all for counts
  useEffect(() => {
    api.get<Medicine[]>("/medicines?limit=200").then((res) => {
      if (res.success) setAllMedicines(Array.isArray(res.data) ? (res.data as unknown as Medicine[]) : []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (tab === "low") params.set("lowStock", "true");
    if (tab === "expiring") params.set("expiringSoon", "true");

    api.get<Medicine[]>(`/medicines?${params.toString()}`).then((res) => {
      if (res.success) setMedicines(Array.isArray(res.data) ? (res.data as unknown as Medicine[]) : []);
      setLoading(false);
    });
  }, [tab]);

  const filtered = medicines.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.genericName?.toLowerCase().includes(q);
  });

  const lowCount = allMedicines.filter((m) => m.isLowStock).length;

  const TABS = [
    { key: "all",      label: "ทั้งหมด",       count: allMedicines.length, icon: null },
    { key: "low",      label: "สต๊อกต่ำ",      count: lowCount,            icon: <AlertTriangle size={13} /> },
    { key: "expiring", label: "ใกล้หมดอายุ",   count: null,                icon: <Clock size={13} /> },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">คลังยา</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            รายการทั้งหมด {allMedicines.length} รายการ
            {lowCount > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">· สต๊อกต่ำ {lowCount} รายการ</span>
            )}
          </p>
        </div>
        <Link href="/staff/medicines/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
          <Plus size={17} /> เพิ่มยาใหม่
        </Link>
      </div>

      {/* ── Tabs + Search ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tabs */}
        <div className="flex bg-white dark:bg-gray-800 rounded-xl shadow-sm p-1.5 gap-1 border border-gray-100 dark:border-gray-700">
          {TABS.map(({ key, label, count, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                tab === key
                  ? key === "low" ? "bg-amber-500 text-white shadow-sm"
                  : key === "expiring" ? "bg-orange-500 text-white shadow-sm"
                  : "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              {icon}
              {label}
              {count != null && count > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-bold",
                  tab === key ? "bg-white/25 text-white" :
                  key === "low" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหายา..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          />
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-44 animate-pulse border border-gray-100 dark:border-gray-700" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-14 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <Pill size={40} className="mx-auto text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-base text-gray-400 dark:text-gray-500">ไม่พบรายการยา</p>
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

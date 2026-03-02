"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Pill,
  Search,
  Plus,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Package,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Medicine } from "@/types";

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

    api.get<{ data: Medicine[] }>(`/medicines?${params.toString()}`).then((res) => {
      if (res.success) {
        setMedicines((res.data as unknown as { data: Medicine[] }).data ?? []);
      }
      setLoading(false);
    });
  }, [tab]);

  const filtered = medicines.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.genericName?.toLowerCase().includes(q);
  });

  const CATEGORY_TH: Record<string, string> = {
    medicine: "ยา",
    supply: "วัสดุ",
    equipment: "อุปกรณ์",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">คลังยาและเวชภัณฑ์</h1>
          <p className="text-sm text-gray-500">จัดการยา วัสดุ และอุปกรณ์</p>
        </div>
        <Link
          href="/staff/medicines/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> เพิ่มยา
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm p-1 gap-1 w-fit">
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
              tab === key ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหายา..."
          className="w-full max-w-sm pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
        />
      </div>

      {/* Medicine list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4 h-24 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-10 text-center shadow-sm">
            <Pill size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">ไม่พบรายการยา</p>
          </div>
        ) : (
          filtered.map((med) => (
            <Link
              key={med.id}
              href={`/staff/medicines/${med.id}`}
              className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow flex gap-3 items-start"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  med.isLowStock ? "bg-red-100" : "bg-blue-100"
                )}
              >
                {med.isLowStock ? (
                  <AlertTriangle size={18} className="text-red-500" />
                ) : (
                  <Package size={18} className="text-blue-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{med.name}</p>
                {med.genericName && (
                  <p className="text-xs text-gray-400 truncate">{med.genericName}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {CATEGORY_TH[med.category] ?? med.category}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      med.isLowStock ? "text-red-600" : "text-gray-600"
                    )}
                  >
                    {med.stockQuantity} {med.unit}
                  </span>
                  {med.isLowStock && (
                    <span className="text-xs text-red-500">⚠️ ต่ำกว่าเกณฑ์</span>
                  )}
                </div>
              </div>

              <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
            </Link>
          ))
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

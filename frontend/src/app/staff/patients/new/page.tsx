"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Loader2, User, AlertCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface UserResult {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  email: string;
  role: string;
}

const VISIT_TYPES = [
  { value: "walk_in", label: "Walk-in", desc: "มาเองที่ห้องพยาบาล" },
  { value: "emergency", label: "ฉุกเฉิน", desc: "ต่อเนื่องจากเหตุฉุกเฉิน" },
  { value: "appointment", label: "นัดหมาย", desc: "มาตามนัด" },
  { value: "follow_up", label: "ติดตาม", desc: "ติดตามอาการเก่า" },
];

export default function NewVisitPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: select patient
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserResult | null>(null);

  // Step 2: visit info
  const [visitType, setVisitType] = useState("walk_in");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Debounced patient search
  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await api.get<UserResult[]>(`/users?search=${encodeURIComponent(search)}&role=student&limit=8`);
      if (res.success) {
        setResults(Array.isArray(res.data) ? (res.data as unknown as UserResult[]) : []);
      }
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async () => {
    if (!selected || !chiefComplaint.trim()) return;
    setCreating(true);
    setError("");
    const res = await api.post<{ id: string }>("/visits", {
      patientId: selected.id,
      visitType,
      chiefComplaint: chiefComplaint.trim(),
    });
    setCreating(false);
    if (res.success && res.data) {
      router.push(`/staff/patients/${res.data.id}`);
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/staff/patients" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">รับผู้ป่วยใหม่</h1>
          <p className="text-sm text-gray-500">ขั้นตอนที่ {step}/2</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={cn("h-1 flex-1 rounded-full transition-all",
            s <= step ? "bg-blue-600" : "bg-gray-200"
          )} />
        ))}
      </div>

      {step === 1 ? (
        /* Step 1: Select patient */
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">เลือกผู้ป่วย</h2>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ หรือ รหัสนักศึกษา..."
              autoFocus
              className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {searching && (
              <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-1.5">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelected(u); setSearch(`${u.firstName} ${u.lastName}`); setResults([]); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                    selected?.id === u.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"
                  )}
                >
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {u.studentId && `${u.studentId} · `}{u.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  {selected.firstName} {selected.lastName}
                </p>
                <p className="text-xs text-blue-600">{selected.studentId} · {selected.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!selected}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            ถัดไป →
          </button>
        </div>
      ) : (
        /* Step 2: Visit info */
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
            <User size={16} className="text-blue-600" />
            <p className="text-sm font-semibold text-blue-800">
              {selected?.firstName} {selected?.lastName}
            </p>
            <button
              onClick={() => { setStep(1); setSelected(null); setSearch(""); }}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700"
            >
              เปลี่ยน
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">ประเภทการเข้าพบ</label>
            <div className="grid grid-cols-2 gap-2">
              {VISIT_TYPES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setVisitType(value)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    visitType === value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <p className={cn("text-sm font-semibold", visitType === value ? "text-blue-700" : "text-gray-700")}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              อาการหลัก <span className="text-red-500">*</span>
            </label>
            <textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="ระบุอาการหลักที่มาพบ..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{chiefComplaint.length}/500</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
            >
              ← ย้อนกลับ
            </button>
            <button
              onClick={handleCreate}
              disabled={!chiefComplaint.trim() || creating}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {creating ? <><Loader2 size={15} className="animate-spin" />กำลังสร้าง...</> : "เริ่มการรักษา →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

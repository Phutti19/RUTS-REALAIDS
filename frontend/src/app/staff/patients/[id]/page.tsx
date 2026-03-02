"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Heart,
  Pill,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Printer,
  Plus,
  Thermometer,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDateTime, statusLabel } from "@/lib/utils";
import type { Visit, VisitMedication, HealthProfile, VitalSigns, Medicine } from "@/types";

interface VisitDetail extends Visit {
  patientFirstName: string;
  patientLastName: string;
  patientStudentId: string | null;
  patientEmail: string;
  staffFirstName: string;
  staffLastName: string;
  medications: VisitMedication[];
}

export default function PatientVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [health, setHealth] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state for editing
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({});
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitMsg, setVisitMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Medication dispensing
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [medQty, setMedQty] = useState(1);
  const [dosage, setDosage] = useState("");
  const [dispensing, setDispensing] = useState(false);
  const [medMsg, setMedMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Complete visit
  const [completing, setCompleting] = useState(false);

  const loadVisit = useCallback(async () => {
    const [visitRes, medsRes] = await Promise.all([
      api.get<VisitDetail>(`/visits/${id}`),
      api.get<{ data: Medicine[] }>("/medicines?limit=200"),
    ]);
    if (visitRes.success && visitRes.data) {
      const v = visitRes.data;
      setVisit(v);
      setDiagnosis(v.diagnosis ?? "");
      setTreatment(v.treatment ?? "");
      setVitalSigns(v.vitalSigns ?? {});
      // Load patient health profile
      api.get<HealthProfile>(`/users/${v.patientId}/health-profile`).then((r) => {
        if (r.success && r.data) setHealth(r.data);
      });
    }
    if (medsRes.success) {
      const payload = medsRes.data as unknown as { data: Medicine[] };
      setMedicines(payload.data ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadVisit(); }, [loadVisit]);

  const saveVisit = async () => {
    setSavingVisit(true);
    setVisitMsg(null);
    const res = await api.patch(`/visits/${id}`, { diagnosis, treatment, vitalSigns });
    setSavingVisit(false);
    setVisitMsg(res.success ? { type: "ok", text: "บันทึกสำเร็จ" } : { type: "err", text: res.message ?? "เกิดข้อผิดพลาด" });
  };

  const dispenseMed = async () => {
    if (!selectedMed) return;
    setDispensing(true);
    setMedMsg(null);
    const res = await api.post<VisitMedication>(`/visits/${id}/medications`, {
      medicineId: selectedMed.id,
      quantity: medQty,
      dosageInstruction: dosage || null,
    });
    setDispensing(false);
    if (res.success && res.data) {
      setVisit((prev) => prev ? { ...prev, medications: [...(prev.medications ?? []), res.data!] } : prev);
      setSelectedMed(null);
      setMedQty(1);
      setDosage("");
      setMedMsg({ type: "ok", text: "จ่ายยาสำเร็จ" });
    } else {
      setMedMsg({ type: "err", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const completeVisit = async () => {
    if (!confirm("ยืนยันสรุปการรักษา?")) return;
    setCompleting(true);
    const res = await api.patch(`/visits/${id}/complete`);
    setCompleting(false);
    if (res.success) {
      setVisit((prev) => prev ? { ...prev, status: "completed" } : prev);
    }
  };

  const filteredMeds = medSearch
    ? medicines.filter((m) =>
        m.name.toLowerCase().includes(medSearch.toLowerCase()) ||
        m.genericName?.toLowerCase().includes(medSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">ไม่พบข้อมูล</p>
        <Link href="/staff/patients" className="text-blue-600 text-sm hover:underline mt-2 block">
          กลับรายการ
        </Link>
      </div>
    );
  }

  const isActive = ["waiting", "in_treatment"].includes(visit.status);
  const hasCertificate = visit.status === "completed";

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/staff/patients" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {visit.patientFirstName} {visit.patientLastName}
          </h1>
          <p className="text-sm text-gray-500">
            {visit.patientStudentId} · {formatDateTime(visit.createdAt)}
          </p>
        </div>
        <StatusBadge status={visit.status} />
        {isActive && (
          <button
            onClick={completeVisit}
            disabled={completing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {completing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            สรุปการรักษา
          </button>
        )}
        {hasCertificate && (
          <Link
            href={`/staff/patients/${id}/certificate`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-semibold transition-colors border border-blue-200"
          >
            <Printer size={15} /> ใบรับรองแพทย์
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Patient info + Vital signs */}
        <div className="space-y-4">
          {/* Patient info */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-700">ข้อมูลผู้ป่วย</h2>
            </div>
            <div className="space-y-1.5 text-sm">
              <InfoRow label="ชื่อ" value={`${visit.patientFirstName} ${visit.patientLastName}`} />
              <InfoRow label="รหัสนักศึกษา" value={visit.patientStudentId ?? "—"} />
              <InfoRow label="อีเมล" value={visit.patientEmail} />
            </div>
          </div>

          {/* Health profile */}
          {health && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} className="text-red-500" />
                <h2 className="text-sm font-semibold text-gray-700">ข้อมูลสุขภาพ</h2>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-xs font-bold text-red-700">
                    {health.bloodType ?? "?"}
                  </span>
                  <span className="text-gray-500 text-xs">กรุ๊ปเลือด</span>
                </div>
                {health.allergies && (
                  <div className="bg-red-50 rounded-lg px-2.5 py-1.5 text-xs text-red-700">
                    ⚠️ แพ้: {health.allergies}
                  </div>
                )}
                {health.chronicDiseases && (
                  <InfoRow label="โรคประจำตัว" value={health.chronicDiseases} />
                )}
                {health.emergencyContact && (
                  <InfoRow label="ผู้ติดต่อ" value={`${health.emergencyContact} ${health.emergencyPhone ?? ""}`} />
                )}
              </div>
            </div>
          )}

          {/* Vital signs */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-green-600" />
              <h2 className="text-sm font-semibold text-gray-700">สัญญาณชีพ</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "temperature" as keyof VitalSigns, label: "อุณหภูมิ", unit: "°C", icon: "🌡️" },
                { key: "bloodPressure" as keyof VitalSigns, label: "ความดัน", unit: "mmHg", icon: "❤️" },
                { key: "heartRate" as keyof VitalSigns, label: "ชีพจร", unit: "bpm", icon: "💓" },
                { key: "oxygenSaturation" as keyof VitalSigns, label: "SpO2", unit: "%", icon: "🫁" },
                { key: "weight" as keyof VitalSigns, label: "น้ำหนัก", unit: "kg", icon: "⚖️" },
                { key: "respiratoryRate" as keyof VitalSigns, label: "หายใจ", unit: "/min", icon: "🌬️" },
              ].map(({ key, label, unit, icon }) => (
                <div key={key} className="bg-gray-50 rounded-xl p-2">
                  <p className="text-xs text-gray-400">{icon} {label}</p>
                  {isActive ? (
                    <input
                      type={key === "bloodPressure" ? "text" : "number"}
                      value={(vitalSigns[key] as string | number | undefined) ?? ""}
                      onChange={(e) =>
                        setVitalSigns((vs) => ({
                          ...vs,
                          [key]: key === "bloodPressure" ? e.target.value : parseFloat(e.target.value) || undefined,
                        }))
                      }
                      placeholder={unit}
                      className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none mt-0.5"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800 mt-0.5">
                      {(vitalSigns[key] as string | number | undefined) ?? "—"} <span className="text-xs text-gray-400">{vitalSigns[key] != null ? unit : ""}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Diagnosis + Treatment + Medications */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chief complaint */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">อาการหลัก</h2>
            <p className="text-gray-800">{visit.chiefComplaint}</p>
          </div>

          {/* Diagnosis + Treatment */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">การวินิจฉัยและการรักษา</h2>
              {isActive && (
                <button
                  onClick={saveVisit}
                  disabled={savingVisit}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {savingVisit ? <Loader2 size={12} className="animate-spin" /> : null}
                  บันทึก
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">การวินิจฉัย (Diagnosis)</label>
              {isActive ? (
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={3}
                  placeholder="ระบุการวินิจฉัย..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              ) : (
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">
                  {diagnosis || "—"}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">การรักษา (Treatment)</label>
              {isActive ? (
                <textarea
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  rows={3}
                  placeholder="ระบุวิธีการรักษา..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              ) : (
                <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2">
                  {treatment || "—"}
                </p>
              )}
            </div>

            {visitMsg && (
              <div className={cn("flex items-center gap-1.5 text-xs rounded-xl px-3 py-2",
                visitMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              )}>
                {visitMsg.type === "ok" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {visitMsg.text}
              </div>
            )}
          </div>

          {/* Medications */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Pill size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-700">ยาที่จ่าย</h2>
            </div>

            {/* Dispensed list */}
            {(visit.medications ?? []).length > 0 && (
              <div className="space-y-2">
                {visit.medications.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-blue-50 rounded-xl px-3 py-2.5">
                    <Pill size={14} className="text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{m.medicineName}</p>
                      <p className="text-xs text-gray-500">
                        {m.quantity} หน่วย
                        {m.dosageInstruction && ` · ${m.dosageInstruction}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dispense new med */}
            {isActive && (
              <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium text-gray-600">+ จ่ายยาเพิ่ม</p>
                <div className="relative">
                  <input
                    value={selectedMed ? selectedMed.name : medSearch}
                    onChange={(e) => { setMedSearch(e.target.value); setSelectedMed(null); }}
                    placeholder="ค้นหายา..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {filteredMeds.length > 0 && !selectedMed && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {filteredMeds.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { setSelectedMed(m); setMedSearch(m.name); }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm transition-colors"
                        >
                          <span className="font-medium">{m.name}</span>
                          <span className="text-gray-400 text-xs ml-2">คงเหลือ {m.stockQuantity} {m.unit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMed && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-0.5 block">จำนวน ({selectedMed.unit})</label>
                      <input
                        type="number"
                        min={1}
                        max={selectedMed.stockQuantity}
                        value={medQty}
                        onChange={(e) => setMedQty(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-0.5 block">วิธีใช้</label>
                      <input
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        placeholder="เช่น วันละ 3 ครั้ง"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={dispenseMed}
                        disabled={dispensing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {dispensing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        จ่าย
                      </button>
                    </div>
                  </div>
                )}
                {medMsg && (
                  <div className={cn("flex items-center gap-1.5 text-xs rounded-xl px-3 py-2",
                    medMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {medMsg.type === "ok" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    {medMsg.text}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-gray-800 text-right">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-700",
    in_treatment: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    referred: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={cn("text-xs px-3 py-1 rounded-full font-medium", map[status] ?? "bg-gray-100 text-gray-500")}>
      {statusLabel(status)}
    </span>
  );
}

"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Heart, Pill, CheckCircle2, Loader2,
  AlertCircle, Printer, Plus, Activity, Save,
  Stethoscope, Scissors, Moon, MessageSquare, AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDateTime, statusLabel } from "@/lib/utils";
import type { Visit, VisitMedication, HealthProfile, VitalSigns, Medicine, User as UserType } from "@/types";

interface VisitDetail extends Visit {
  medications: VisitMedication[];
}

const CONSULTATION_OPTIONS = [
  { value: "general",             label: "ปรึกษาทั่วไป" },
  { value: "health",              label: "ด้านสุขภาพ" },
  { value: "mental_health",       label: "ด้านสุขภาพจิต" },
  { value: "depression_followup", label: "ติดตามภาวะซึมเศร้า" },
];

const TITLE_OPTIONS = ["นาย", "นาง", "นางสาว"];
const BLOOD_TYPES = ["A", "B", "AB", "O" ];

function calcAge(birthDate: string): string {
  if (!birthDate) return "—";
  const diff = Date.now() - new Date(birthDate).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} ปี`;
}

export default function PatientVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Patient demographics
  const [demoTitle, setDemoTitle] = useState("");
  const [demoNationalId, setDemoNationalId] = useState("");
  const [demoBirthDate, setDemoBirthDate] = useState("");
  const [demoDepartment, setDemoDepartment] = useState("");
  const [demoYearOfStudy, setDemoYearOfStudy] = useState("");
  const [demoPosition, setDemoPosition] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [savingDemo, setSavingDemo] = useState(false);
  const [demoMsg, setDemoMsg] = useState<MsgState>(null);

  // Health profile
  const [hBloodType, setHBloodType] = useState("");
  const [hAllergies, setHAllergies] = useState("");
  const [hChronic, setHChronic] = useState("");
  const [hEcName, setHEcName] = useState("");
  const [hEcPhone, setHEcPhone] = useState("");
  const [hEcRel, setHEcRel] = useState("");
  const [savingHealth, setSavingHealth] = useState(false);
  const [healthMsg, setHealthMsg] = useState<MsgState>(null);

  // Clinical visit fields
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({});
  const [illnessHistory, setIllnessHistory] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [woundCare, setWoundCare] = useState(false);
  const [restHours, setRestHours] = useState("");
  const [consultationTypes, setConsultationTypes] = useState<string[]>([]);
  const [isReferred, setIsReferred] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitMsg, setVisitMsg] = useState<MsgState>(null);

  // Medication dispensing
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [medQty, setMedQty] = useState(1);
  const [dosage, setDosage] = useState("");
  const [dispensing, setDispensing] = useState(false);
  const [medMsg, setMedMsg] = useState<MsgState>(null);

  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsMsg, setVitalsMsg] = useState<MsgState>(null);
  const [completing, setCompleting] = useState(false);

  const loadVisit = useCallback(async () => {
    const [visitRes, medsRes, meds2Res] = await Promise.all([
      api.get<VisitDetail>(`/visits/${id}`),
      api.get<Medicine[]>("/medicines?limit=200"),
      api.get<VisitMedication[]>(`/visits/${id}/medications`),
    ]);

    if (visitRes.success && visitRes.data) {
      const v = visitRes.data;
      const medications = meds2Res.success && Array.isArray(meds2Res.data) ? meds2Res.data as VisitMedication[] : [];
      setVisit({ ...v, medications });
      setDiagnosis(v.diagnosis ?? "");
      setTreatment(v.treatmentNotes ?? "");
      setIllnessHistory(v.illnessHistory ?? "");
      setVitalSigns(v.vitalSigns ?? {});
      setWoundCare(v.woundCare ?? false);
      setRestHours(v.restHours != null ? String(v.restHours) : "");
      setConsultationTypes(v.consultationTypes ?? []);
      setIsReferred(v.isReferred ?? false);

      // Patient full profile (demographics)
      api.get<UserType>(`/users/${v.patientId}`).then((r) => {
        if (r.success && r.data) {
          const u = r.data as UserType;
          setDemoTitle(u.title ?? "");
          setDemoNationalId(u.nationalId ?? "");
          setDemoBirthDate(u.birthDate ? String(u.birthDate).slice(0, 10) : "");
          setDemoDepartment(u.department ?? "");
          setDemoYearOfStudy(u.yearOfStudy != null ? String(u.yearOfStudy) : "");
          setDemoPosition(u.position ?? "");
          setDemoPhone(u.phone ?? "");
        }
      });

      // Health profile
      api.get<HealthProfile>(`/users/${v.patientId}/health-profile`).then((r) => {
        if (r.success && r.data) {
          const h = r.data;
          setHBloodType(h.bloodType ?? "");
          setHAllergies(h.allergies ?? "");
          setHChronic(h.chronicDiseases ?? "");
          setHEcName(h.emergencyContact?.name ?? "");
          setHEcPhone(h.emergencyContact?.phone ?? "");
          setHEcRel(h.emergencyContact?.relation ?? "");
        }
      });
    }

    if (medsRes.success) setMedicines(Array.isArray(medsRes.data) ? (medsRes.data as unknown as Medicine[]) : []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadVisit(); }, [loadVisit]);

  const saveDemo = async () => {
    if (!visit) return;
    setSavingDemo(true); setDemoMsg(null);
    const res = await api.patch(`/users/${visit.patientId}`, {
      title: demoTitle || null,
      nationalId: demoNationalId || null,
      birthDate: demoBirthDate || null,
      department: demoDepartment || null,
      yearOfStudy: demoYearOfStudy ? parseInt(demoYearOfStudy) : null,
      position: demoPosition || null,
      phone: demoPhone || null,
    });
    setSavingDemo(false);
    setDemoMsg(res.success ? { type: "ok", text: "บันทึกสำเร็จ" } : { type: "err", text: res.message ?? "เกิดข้อผิดพลาด" });
  };

  const saveHealth = async () => {
    if (!visit) return;
    setSavingHealth(true); setHealthMsg(null);

    // The health-profile endpoint uses PUT /users/:id/health-profile
    // But staff can only update their own via /me/health-profile.
    // We use the admin-style PATCH on the patient's health profile via the user endpoint.
    const res = await api.put(`/users/${visit.patientId}/health-profile`, {
      bloodType: hBloodType || null,
      allergies: hAllergies || null,
      chronicDiseases: hChronic || null,
      emergencyContactName: hEcName || null,
      emergencyContactPhone: hEcPhone || null,
      emergencyContactRelation: hEcRel || null,
    });
    setSavingHealth(false);
    setHealthMsg(res.success ? { type: "ok", text: "บันทึกสำเร็จ" } : { type: "err", text: res.message ?? "เกิดข้อผิดพลาด" });
  };

  const saveVisit = async () => {
    setSavingVisit(true); setVisitMsg(null);
    const res = await api.patch(`/visits/${id}`, {
      diagnosis, treatmentNotes: treatment, illnessHistory, vitalSigns,
      woundCare, restHours: restHours ? parseFloat(restHours) : null,
      consultationTypes, isReferred,
    });
    setSavingVisit(false);
    const errText = res.errors?.length ? res.errors.join(" · ") : res.message ?? "เกิดข้อผิดพลาด";
    setVisitMsg(res.success ? { type: "ok", text: "บันทึกสำเร็จ" } : { type: "err", text: errText });
  };

  const dispenseMed = async () => {
    if (!selectedMed) return;
    setDispensing(true); setMedMsg(null);
    const res = await api.post<VisitMedication>(`/visits/${id}/medications`, {
      medicineId: selectedMed.id, quantity: medQty, dosageInstruction: dosage || null,
    });
    setDispensing(false);
    if (res.success && res.data) {
      setVisit((prev) => prev ? { ...prev, medications: [...(prev.medications ?? []), res.data!] } : prev);
      setSelectedMed(null); setMedQty(1); setDosage("");
      setMedMsg({ type: "ok", text: "จ่ายยาสำเร็จ" });
    } else {
      setMedMsg({ type: "err", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const completeVisit = async () => {
    if (!confirm("ยืนยันสรุปการรักษา?")) return;
    setCompleting(true);
    await api.patch(`/visits/${id}`, {
      diagnosis, treatmentNotes: treatment, illnessHistory, vitalSigns,
      woundCare, restHours: restHours ? parseFloat(restHours) : null,
      consultationTypes, isReferred,
      status: isReferred ? "referred" : "completed",
    });
    setCompleting(false);
    setVisit((prev) => prev ? { ...prev, status: isReferred ? "referred" : "completed" } : prev);
  };

  const saveVitalSigns = async () => {
    setSavingVitals(true); setVitalsMsg(null);
    const res = await api.patch(`/visits/${id}`, { vitalSigns });
    setSavingVitals(false);
    const errText = res.errors?.length ? res.errors.join(" · ") : res.message ?? "เกิดข้อผิดพลาด";
    setVitalsMsg(res.success ? { type: "ok", text: "บันทึกสำเร็จ" } : { type: "err", text: errText });
  };

  const toggleConsultation = (val: string) =>
    setConsultationTypes((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);

  const filteredMeds = medSearch
    ? medicines.filter((m) => m.name.toLowerCase().includes(medSearch.toLowerCase()) || m.genericName?.toLowerCase().includes(medSearch.toLowerCase())).slice(0, 8)
    : [];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-gray-300" /></div>;
  if (!visit) return (
    <div className="text-center py-16">
      <p className="text-gray-500">ไม่พบข้อมูล</p>
      <Link href="/staff/patients" className="text-blue-600 text-sm hover:underline mt-2 block">กลับรายการ</Link>
    </div>
  );

  const isActive = ["waiting", "in_treatment"].includes(visit.status);
  const isDone = visit.status === "completed" || visit.status === "referred";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/staff/patients" className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={22} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">
            {demoTitle && <span className="text-gray-400 mr-1.5 font-normal">{demoTitle}</span>}
            {visit.patient.firstName} {visit.patient.lastName}
          </h1>
          <p className="text-sm text-gray-400 truncate mt-0.5">
            {visit.patient.studentId && `${visit.patient.studentId} · `}
            {formatDateTime(visit.createdAt)} · ผู้รักษา: {visit.staff.firstName} {visit.staff.lastName}
          </p>
        </div>
        <StatusBadge status={visit.status} />
        {isActive && (
          <button onClick={completeVisit} disabled={completing}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl text-base font-semibold">
            {completing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            สรุปการรักษา
          </button>
        )}
        {isDone && (
          <Link href={`/staff/patients/${id}/certificate`}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-base font-semibold border border-blue-200">
            <Printer size={16} /> ใบรับรองแพทย์
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ──── Left column ──── */}
        <div className="space-y-5">

          {/* Demographics */}
          <Card icon={<User size={18} className="text-blue-600" />} title="ข้อมูลผู้ป่วย"
            action={isActive ? <SaveBtn loading={savingDemo} onClick={saveDemo} /> : undefined}>
            <div className="space-y-3">
              <Field label="คำนำหน้า">
                {isActive
                  ? <select value={demoTitle} onChange={(e) => setDemoTitle(e.target.value)} className="fi w-full">
                      <option value="">เลือก</option>
                      {TITLE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  : <span className="text-base">{demoTitle || "—"}</span>}
              </Field>
              <Field label="ชื่อ-นามสกุล">
                <span className="text-base font-medium">{visit.patient.firstName} {visit.patient.lastName}</span>
              </Field>
              <Field label="เลขบัตรประชาชน">
                {isActive
                  ? <input value={demoNationalId} onChange={(e) => setDemoNationalId(e.target.value)} maxLength={13} placeholder="13 หลัก" className="fi w-full" />
                  : <span className="text-base">{demoNationalId || "—"}</span>}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="วันเกิด">
                  {isActive
                    ? <input type="date" value={demoBirthDate} onChange={(e) => setDemoBirthDate(e.target.value)} className="fi w-full" />
                    : <span className="text-base">{demoBirthDate || "—"}</span>}
                </Field>
                <Field label="อายุ"><span className="text-base">{calcAge(demoBirthDate)}</span></Field>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label="หน่วยงาน/คณะ">
                    {isActive
                      ? <input value={demoDepartment} onChange={(e) => setDemoDepartment(e.target.value)} placeholder="คณะ/สาขา" className="fi w-full" />
                      : <span className="text-base">{demoDepartment || "—"}</span>}
                  </Field>
                </div>
                <Field label="ชั้นปี">
                  {isActive
                    ? <input type="number" min={1} max={8} value={demoYearOfStudy} onChange={(e) => setDemoYearOfStudy(e.target.value)} placeholder="1-8" className="fi w-full" />
                    : <span className="text-base">{demoYearOfStudy || "—"}</span>}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ตำแหน่ง">
                  {isActive
                    ? <input value={demoPosition} onChange={(e) => setDemoPosition(e.target.value)} placeholder="ตำแหน่ง" className="fi w-full" />
                    : <span className="text-base">{demoPosition || "—"}</span>}
                </Field>
                <Field label="เบอร์โทร">
                  {isActive
                    ? <input value={demoPhone} onChange={(e) => setDemoPhone(e.target.value)} placeholder="0xx-xxx" className="fi w-full" />
                    : <span className="text-base">{demoPhone || "—"}</span>}
                </Field>
              </div>
              {demoMsg && <MsgBox {...demoMsg} />}
            </div>
          </Card>

          {/* Health profile */}
          <Card icon={<Heart size={18} className="text-red-500" />} title="ข้อมูลสุขภาพ"
            action={isActive ? <SaveBtn loading={savingHealth} onClick={saveHealth} /> : undefined}>
            <div className="space-y-3">
              <Field label="กรุ๊ปเลือด">
                {isActive
                  ? <select value={hBloodType} onChange={(e) => setHBloodType(e.target.value)} className="fi w-full">
                      <option value="">ไม่ระบุ</option>
                      {BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  : <span className={cn("text-base font-bold", hBloodType && "text-red-600")}>{hBloodType || "—"}</span>}
              </Field>
              <Field label="ประวัติแพ้ยา/สาร">
                {isActive
                  ? <textarea value={hAllergies} onChange={(e) => setHAllergies(e.target.value)} rows={2} placeholder="ระบุการแพ้..." className="fi w-full resize-none" />
                  : <span className={cn("text-base", hAllergies && "text-red-700 bg-red-50 px-2 py-1 rounded block")}>{hAllergies || "—"}</span>}
              </Field>
              <Field label="โรคประจำตัว">
                {isActive
                  ? <textarea value={hChronic} onChange={(e) => setHChronic(e.target.value)} rows={2} placeholder="ระบุโรคประจำตัว..." className="fi w-full resize-none" />
                  : <span className="text-base">{hChronic || "—"}</span>}
              </Field>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-500 mb-2">ผู้ติดต่อฉุกเฉิน</p>
                {isActive ? (
                  <div className="space-y-2">
                    <input value={hEcName} onChange={(e) => setHEcName(e.target.value)} placeholder="ชื่อ" className="fi w-full" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={hEcPhone} onChange={(e) => setHEcPhone(e.target.value)} placeholder="เบอร์โทร" className="fi" />
                      <input value={hEcRel} onChange={(e) => setHEcRel(e.target.value)} placeholder="ความสัมพันธ์" className="fi" />
                    </div>
                  </div>
                ) : (
                  <p className="text-base text-gray-600">{hEcName || "—"}{hEcPhone && ` · ${hEcPhone}`}{hEcRel && ` (${hEcRel})`}</p>
                )}
              </div>
              {healthMsg && <MsgBox {...healthMsg} />}
            </div>
          </Card>

          {/* Vital signs */}
          <Card icon={<Activity size={18} className="text-green-600" />} title="สัญญาณชีพ"
            action={isActive ? <SaveBtn loading={savingVitals} onClick={saveVitalSigns} /> : undefined}>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { key: "temperature",      label: "Temp (°C)" },
                { key: "bloodPressure",    label: "BP (mmHg)" },
                { key: "heartRate",        label: "Pulse (/นาที)" },
                { key: "respiratoryRate",  label: "RR (/นาที)" },
                { key: "oxygenSaturation", label: "SpO2 (%)" },
                { key: "weight",           label: "น้ำหนัก (กก.)" },
                { key: "height",           label: "ส่วนสูง (ซม.)" },
              ] as { key: keyof VitalSigns; label: string }[]).map(({ key, label }) => (
                <div key={key} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-400 mb-1">{label}</p>
                  {isActive ? (
                    <input
                      type={key === "bloodPressure" ? "text" : "number"}
                      value={(vitalSigns[key] as string | number | undefined) ?? ""}
                      onChange={(e) => setVitalSigns((vs) => ({
                        ...vs,
                        [key]: key === "bloodPressure" ? e.target.value : parseFloat(e.target.value) || undefined,
                      }))}
                      className="w-full bg-transparent text-base font-bold text-gray-800 focus:outline-none"
                    />
                  ) : (
                    <p className="text-base font-bold text-gray-800">{(vitalSigns[key] as string | number | undefined) ?? "—"}</p>
                  )}
                </div>
              ))}
            </div>
            {vitalsMsg && <MsgBox {...vitalsMsg} />}
          </Card>
        </div>

        {/* ──── Right column ──── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Clinical */}
          <Card icon={<Stethoscope size={18} className="text-blue-600" />} title="ข้อมูลทางคลินิก"
            action={isActive ? <SaveBtn loading={savingVisit} onClick={saveVisit} /> : undefined}>
            <div className="space-y-4">
              {/* Chief complaint — read-only */}
              <div>
                <p className="text-sm text-gray-400 mb-1.5">อาการสำคัญ (Chief Complaint)</p>
                <p className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-700">{visit.chiefComplaint}</p>
              </div>

              {/* Illness history */}
              <div>
                <p className="text-sm text-gray-400 mb-1.5">ประวัติการเจ็บป่วยในปัจจุบัน</p>
                {isActive
                  ? <textarea value={illnessHistory} onChange={(e) => setIllnessHistory(e.target.value)} rows={3} placeholder="ระบุประวัติเจ็บป่วย..." className="fi w-full resize-none" />
                  : <p className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-700 min-h-[48px]">{illnessHistory || "—"}</p>}
              </div>

              {/* Diagnosis */}
              <div>
                <p className="text-sm text-gray-400 mb-1.5">วินิจฉัย (Diagnosis)</p>
                {isActive
                  ? <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3} placeholder="ระบุการวินิจฉัย..." className="fi w-full resize-none" />
                  : <p className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-700 min-h-[48px]">{diagnosis || "—"}</p>}
              </div>

              {/* Treatment */}
              <div>
                <p className="text-sm text-gray-400 mb-1.5">การรักษา (Treatment)</p>
                {isActive
                  ? <textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} rows={3} placeholder="ระบุวิธีการรักษา..." className="fi w-full resize-none" />
                  : <p className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-700 min-h-[48px]">{treatment || "—"}</p>}
              </div>

              {/* Wound care + Rest hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5"><Scissors size={14} /> ทำแผล</p>
                  <div className="flex gap-2">
                    {[{ v: true, l: "มี" }, { v: false, l: "ไม่มี" }].map(({ v, l }) => (
                      <button key={String(v)} onClick={() => isActive && setWoundCare(v)}
                        className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                          woundCare === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500",
                          !isActive && "cursor-default"
                        )}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5"><Moon size={14} /> นอนพัก (ชั่วโมง)</p>
                  {isActive
                    ? <input type="number" min={0} max={72} step={0.5} value={restHours} onChange={(e) => setRestHours(e.target.value)} placeholder="0" className="fi w-full" />
                    : <p className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-700">{restHours ? `${restHours} ชม.` : "—"}</p>}
                </div>
              </div>

              {/* Consultation */}
              <div>
                <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5"><MessageSquare size={14} /> ให้คำปรึกษา</p>
                <div className="grid grid-cols-2 gap-2">
                  {CONSULTATION_OPTIONS.map(({ value, label }) => (
                    <button key={value} onClick={() => isActive && toggleConsultation(value)}
                      className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm text-left transition-all",
                        consultationTypes.includes(value) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500",
                        !isActive && "cursor-default"
                      )}>
                      <div className={cn("w-4 h-4 rounded border-2 flex-shrink-0",
                        consultationTypes.includes(value) ? "border-blue-500 bg-blue-500" : "border-gray-300"
                      )} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Referral */}
              <button onClick={() => isActive && setIsReferred(!isReferred)}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-base transition-all",
                  isReferred ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 text-gray-500",
                  !isActive && "cursor-default"
                )}>
                <AlertTriangle size={16} className={isReferred ? "text-red-500" : "text-gray-400"} />
                ส่งต่อโรงพยาบาล
                <span className={cn("ml-auto text-sm px-3 py-0.5 rounded-full font-semibold",
                  isReferred ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"
                )}>{isReferred ? "ใช่" : "ไม่"}</span>
              </button>

              {visitMsg && <MsgBox {...visitMsg} />}
            </div>
          </Card>

          {/* Medications */}
          <Card icon={<Pill size={18} className="text-blue-600" />} title="ยาที่จ่าย">
            <div className="space-y-3">
              {(visit.medications ?? []).length > 0 ? (
                <div className="space-y-2">
                  {visit.medications.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl px-4 py-3">
                      <Pill size={16} className="text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-800 dark:text-blue-100">{m.medicineName}</p>
                        <p className="text-sm text-gray-500 dark:text-blue-300">
                          {m.quantity} หน่วย{m.dosageInstruction && ` · ${m.dosageInstruction}`}
                        </p>
                      </div>
                      {m.batchNumber && (
                        <span className="flex-shrink-0 text-xs font-mono bg-white border border-blue-200 text-blue-600 px-2.5 py-1 rounded-lg">
                          {m.batchNumber}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีการจ่ายยา</p>
              )}

              {isActive && (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-500">+ จ่ายยาเพิ่ม</p>
                  <div className="relative">
                    <input value={selectedMed ? selectedMed.name : medSearch}
                      onChange={(e) => { setMedSearch(e.target.value); setSelectedMed(null); }}
                      placeholder="ค้นหายา..." className="fi w-full" />
                    {filteredMeds.length > 0 && !selectedMed && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredMeds.map((m) => (
                          <button key={m.id} onClick={() => { setSelectedMed(m); setMedSearch(m.name); }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 text-base">
                            <span className="font-medium">{m.name}</span>
                            <span className="text-gray-400 text-sm ml-2">คงเหลือ {m.stockQuantity} {m.unit}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMed && (
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-400 mb-1">จำนวน ({selectedMed.unit})</p>
                        <input type="number" min={1} max={selectedMed.stockQuantity} value={medQty}
                          onChange={(e) => setMedQty(parseInt(e.target.value) || 1)} className="fi w-full" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-400 mb-1">วิธีใช้</p>
                        <input value={dosage} onChange={(e) => setDosage(e.target.value)}
                          placeholder="วันละ 3 ครั้ง" className="fi" />
                      </div>
                      <div className="flex items-end">
                        <button onClick={dispenseMed} disabled={dispensing}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-base font-semibold flex items-center gap-2">
                          {dispensing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} จ่าย
                        </button>
                      </div>
                    </div>
                  )}
                  {medMsg && <MsgBox {...medMsg} />}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Reusable sub-components ────────────────────────────────────────────────────

type MsgState = { type: "ok" | "err"; text: string } | null;

function Card({ icon, title, action, children }: {
  icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">{icon}<h2 className="text-base font-bold text-gray-700">{title}</h2></div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function SaveBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3.5 py-2 rounded-lg font-medium">
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึก
    </button>
  );
}

function MsgBox({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm rounded-xl px-4 py-2.5",
      type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
    )}>
      {type === "ok" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />} {text}
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
    <span className={cn("text-sm px-4 py-1.5 rounded-full font-semibold flex-shrink-0", map[status] ?? "bg-gray-100 text-gray-500")}>
      {statusLabel(status)}
    </span>
  );
}

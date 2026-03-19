"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, ChevronRight, ChevronLeft,
  UserCheck, UserX, GraduationCap, User, UserPlus, X,
  AlertCircle, Clock, CheckCircle2, Stethoscope,
  ArrowRight, ClipboardList, Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, timeAgo, statusLabel } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";

/* ───── types ───── */

interface UserResult {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  email: string;
  role: string;
}

interface PatientVisit {
  id: string;
  patientId: string;
  patient: { firstName: string; lastName: string; studentId: string | null };
  chiefComplaint: string;
  visitType: string;
  status: string;
  createdAt: string;
}

interface StudentUser {
  id: string;
  studentId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  department: string | null;
  yearOfStudy: number | null;
  createdAt: string;
}

/* ───── constants ───── */

const VISIT_TYPE_TH: Record<string, string> = {
  walk_in: "Walk-in",
  emergency: "ฉุกเฉิน",
  appointment: "นัดหมาย",
  follow_up: "ติดตามอาการ",
};

const VISIT_TYPES = [
  { value: "walk_in", label: "Walk-in", desc: "มาเองที่ห้องพยาบาล" },
  { value: "emergency", label: "ฉุกเฉิน", desc: "ต่อเนื่องจากเหตุฉุกเฉิน" },
  { value: "appointment", label: "นัดหมาย", desc: "มาตามนัด" },
  { value: "follow_up", label: "ติดตาม", desc: "ติดตามอาการเก่า" },
];

const FACULTY_DEPARTMENTS: Record<string, string[]> = {
  "คณะวิศวกรรมศาสตร์": [
    "วิศวกรรมไฟฟ้า", "วิศวกรรมอิเล็กทรอนิกส์และโทรคมนาคม",
    "วิศวกรรมคอมพิวเตอร์", "วิศวกรรมเครื่องกล",
    "วิศวกรรมโยธา", "วิศวกรรมอุตสาหการ",
    "วิศวกรรมเมคคาทรอนิกส์", "วิศวกรรมเคมีและวัสดุ",
  ],
  "คณะวิทยาศาสตร์และเทคโนโลยี": [
    "เทคโนโลยีสารสนเทศ", "วิทยาการคอมพิวเตอร์",
    "เคมี", "ฟิสิกส์", "คณิตศาสตร์", "สถิติ",
    "เทคโนโลยีสิ่งแวดล้อม", "เทคโนโลยีชีวภาพ",
  ],
  "คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี": [
    "วิศวกรรมไฟฟ้า (ค.อ.บ.)", "วิศวกรรมเครื่องกล (ค.อ.บ.)",
    "วิศวกรรมคอมพิวเตอร์ (ค.อ.บ.)", "วิศวกรรมโยธา (ค.อ.บ.)",
    "เทคโนโลยีคอมพิวเตอร์",
  ],
  "คณะสถาปัตยกรรมศาสตร์": [
    "สถาปัตยกรรม", "การออกแบบสถาปัตยกรรมภายใน", "การออกแบบอุตสาหกรรม",
  ],
  "คณะบริหารธุรกิจ": [
    "การบัญชี", "การตลาด", "การจัดการ",
    "ระบบสารสนเทศทางธุรกิจ", "การเงินและการธนาคาร",
  ],
  "คณะเทคโนโลยีการจัดการ": [
    "การจัดการ", "การบัญชี", "การตลาด", "เทคโนโลยีสารสนเทศธุรกิจ",
  ],
  "คณะเกษตรศาสตร์": [
    "พืชศาสตร์", "สัตวศาสตร์", "อุตสาหกรรมเกษตร", "ประมง",
  ],
  "วิทยาลัยเทคโนโลยีอุตสาหกรรมและการจัดการ": [
    "เทคโนโลยีไฟฟ้าอุตสาหกรรม", "เทคโนโลยีเครื่องกล", "การจัดการโลจิสติกส์",
  ],
  "คณะวิศวกรรมศาสตร์และเทคโนโลยี (ตรัง)": [
    "วิศวกรรมเครื่องกล", "วิศวกรรมไฟฟ้า", "วิศวกรรมโยธา", "เทคโนโลยีสารสนเทศ",
  ],
  "คณะวิทยาศาสตร์และเทคโนโลยีการประมง": [
    "วิทยาศาสตร์ทางทะเล", "การเพาะเลี้ยงสัตว์น้ำ", "ประมง", "เทคโนโลยีอาหาร",
  ],
  "อื่นๆ": [],
};

const PAGE_SIZE = 15;

/* ═══════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════ */

export default function PatientsPage() {
  const router = useRouter();

  /* ── Inline intake state ── */
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<UserResult | null>(null);
  const [visitType, setVisitType] = useState("walk_in");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  /* ── Registration form ── */
  const [showRegForm, setShowRegForm] = useState(false);
  const [regTitle, setRegTitle] = useState("นาย");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regStudentId, setRegStudentId] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regFaculty, setRegFaculty] = useState("");
  const [regDepartment, setRegDepartment] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState("");

  /* ── Queue state ── */
  const [queue, setQueue] = useState<PatientVisit[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  /* ── Bottom tabs state ── */
  const [tab, setTab] = useState<"queue" | "history" | "students">("queue");
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);
  const [listSearch, setListSearch] = useState("");

  /* ── Patient search (debounced) ── */
  useEffect(() => {
    if (patientSearch.length < 2) { setPatientResults([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      setSearched(false);
      const res = await api.get<UserResult[]>(`/users?search=${encodeURIComponent(patientSearch)}&role=student&limit=6`);
      if (res.success) {
        setPatientResults(Array.isArray(res.data) ? (res.data as unknown as UserResult[]) : []);
      }
      setSearched(true);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [patientSearch]);

  /* ── Load queue (waiting + in_treatment) ── */
  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    const params = new URLSearchParams({ limit: "50" });
    params.append("status", "waiting");
    params.append("status", "in_treatment");
    const res = await api.get<PatientVisit[]>(`/visits?${params}`);
    if (res.success) {
      setQueue(Array.isArray(res.data) ? (res.data as unknown as PatientVisit[]) : []);
    }
    setLoadingQueue(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  /* ── Load history / students ── */
  const loadHistory = useCallback(async () => {
    setLoadingList(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
    if (listSearch.trim()) params.set("search", listSearch.trim());
    const res = await api.get<PatientVisit[]>(`/visits?${params}`);
    if (res.success) {
      setVisits(Array.isArray(res.data) ? (res.data as unknown as PatientVisit[]) : []);
      setTotal(res.total ?? 0);
    }
    setLoadingList(false);
  }, [page, listSearch]);

  const loadStudents = useCallback(async () => {
    setLoadingList(true);
    const params = new URLSearchParams({ role: "student", limit: String(PAGE_SIZE), page: String(page) });
    if (listSearch.trim()) params.set("search", listSearch.trim());
    const res = await api.get<StudentUser[]>(`/users?${params}`);
    if (res.success) {
      setStudents(Array.isArray(res.data) ? (res.data as unknown as StudentUser[]) : []);
      setTotal(res.total ?? 0);
    }
    setLoadingList(false);
  }, [page, listSearch]);

  useEffect(() => {
    if (tab === "history") loadHistory();
    else if (tab === "students") loadStudents();
  }, [tab, loadHistory, loadStudents]);

  useEffect(() => { setPage(1); }, [listSearch, tab]);

  /* ── WebSocket: refresh queue on update ── */
  useWebSocket("queue:update", () => { loadQueue(); }, [loadQueue]);

  /* ── Handlers ── */
  const selectPatient = (u: UserResult) => {
    setSelectedPatient(u);
    setPatientSearch(`${u.firstName} ${u.lastName}`);
    setPatientResults([]);
    setShowRegForm(false);
    setRegError("");
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setSearched(false);
    setShowRegForm(false);
  };

  const handleRegister = async () => {
    if (!regFirstName.trim() || !regLastName.trim() || !regStudentId.trim()) return;
    setRegistering(true);
    setRegError("");
    const res = await api.post<UserResult>("/visits/register-patient", {
      title: regTitle,
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      studentId: regStudentId.trim(),
      phone: regPhone.trim() || undefined,
      faculty: regFaculty || undefined,
      department: regDepartment.trim() || undefined,
      birthDate: regBirthDate || undefined,
    });
    setRegistering(false);
    if (res.success && res.data) {
      selectPatient(res.data as UserResult);
    } else {
      setRegError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const openRegForm = () => {
    setShowRegForm(true);
    if (/^\d{4,}$/.test(patientSearch.trim())) setRegStudentId(patientSearch.trim());
  };

  const resetRegForm = () => {
    setShowRegForm(false);
    setRegError("");
    setRegTitle("นาย");
    setRegFirstName("");
    setRegLastName("");
    setRegStudentId("");
    setRegPhone("");
    setRegFaculty("");
    setRegDepartment("");
    setRegBirthDate("");
  };

  const handleCreateVisit = async () => {
    if (!selectedPatient || !chiefComplaint.trim()) return;
    setCreating(true);
    setCreateError("");
    const res = await api.post<{ id: string }>("/visits", {
      patientId: selectedPatient.id,
      visitType,
      chiefComplaint: chiefComplaint.trim(),
    });
    setCreating(false);
    if (res.success && res.data) {
      router.push(`/staff/patients/${res.data.id}`);
    } else {
      setCreateError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const waitingCount = queue.filter((q) => q.status === "waiting").length;
  const treatingCount = queue.filter((q) => q.status === "in_treatment").length;

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════
          SECTION 1: Quick Patient Intake
          ════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center">
              <Stethoscope size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">รับผู้ป่วย</h1>
              <p className="text-sm text-blue-200">ค้นหาและรับผู้ป่วยเข้ารักษา</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Patient search */}
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
              ค้นหาผู้ป่วย
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); setShowRegForm(false); }}
                placeholder="พิมพ์ชื่อ หรือ รหัสนักศึกษา เพื่อค้นหา..."
                autoFocus
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 dark:text-white dark:placeholder-gray-500 transition-colors"
              />
              {searching && (
                <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              )}
            </div>
          </div>

          {/* Search results */}
          {patientResults.length > 0 && !selectedPatient && (
            <div className="grid gap-2">
              {patientResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => selectPatient(u)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left transition-all"
                >
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {u.studentId && `${u.studentId} · `}{u.email}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Not found → offer register */}
          {searched && !searching && patientResults.length === 0 && !selectedPatient && !showRegForm && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-5 text-center space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">ไม่พบผู้ป่วยในระบบ</p>
              <button
                onClick={openRegForm}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <UserPlus size={16} /> ลงทะเบียนผู้ป่วยใหม่
              </button>
            </div>
          )}

          {/* Inline registration form */}
          {showRegForm && <InlineRegForm
            regTitle={regTitle} setRegTitle={setRegTitle}
            regFirstName={regFirstName} setRegFirstName={setRegFirstName}
            regLastName={regLastName} setRegLastName={setRegLastName}
            regStudentId={regStudentId} setRegStudentId={setRegStudentId}
            regPhone={regPhone} setRegPhone={setRegPhone}
            regFaculty={regFaculty} setRegFaculty={setRegFaculty}
            regDepartment={regDepartment} setRegDepartment={setRegDepartment}
            regBirthDate={regBirthDate} setRegBirthDate={setRegBirthDate}
            registering={registering} regError={regError}
            onRegister={handleRegister} onClose={resetRegForm}
          />}

          {/* Selected patient + visit form */}
          {selectedPatient && (
            <div className="space-y-4">
              {/* Selected patient badge */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-blue-700 dark:text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-blue-800 dark:text-blue-200">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {selectedPatient.studentId && `${selectedPatient.studentId} · `}{selectedPatient.email}
                  </p>
                </div>
                <button onClick={clearPatient} className="text-blue-400 hover:text-blue-600 flex-shrink-0 p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Visit type */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">ประเภทการเข้าพบ</label>
                <div className="grid grid-cols-4 gap-2">
                  {VISIT_TYPES.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setVisitType(value)}
                      className={cn(
                        "p-3 rounded-xl border-2 text-left transition-all",
                        visitType === value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-400"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      )}
                    >
                      <p className={cn("text-sm font-semibold", visitType === value ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-200")}>
                        {label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chief complaint */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5 block">
                  อาการหลัก <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="ระบุอาการหลักที่มาพบ..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none dark:text-white dark:placeholder-gray-500"
                />
              </div>

              {createError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <AlertCircle size={16} /> {createError}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleCreateVisit}
                disabled={!chiefComplaint.trim() || creating}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {creating ? (
                  <><Loader2 size={18} className="animate-spin" /> กำลังสร้าง...</>
                ) : (
                  <><Stethoscope size={18} /> เริ่มการรักษา</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 2: Patient Queue (Cards)
          ════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-blue-700 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">คิวผู้ป่วย</h2>
            {(waitingCount > 0 || treatingCount > 0) && (
              <div className="flex items-center gap-2 ml-2">
                {waitingCount > 0 && (
                  <span className="text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-full">
                    รอ {waitingCount}
                  </span>
                )}
                {treatingCount > 0 && (
                  <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full">
                    กำลังรักษา {treatingCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {loadingQueue ? (
          <div className="py-12 flex justify-center">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : queue.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 size={36} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">ไม่มีผู้ป่วยในคิว</p>
          </div>
        ) : (
          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queue.map((v, idx) => (
              <Link
                key={v.id}
                href={`/staff/patients/${v.id}`}
                className={cn(
                  "group rounded-xl border-2 p-4 transition-all hover:shadow-md",
                  v.status === "waiting"
                    ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/10 hover:border-yellow-300"
                    : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10 hover:border-blue-300"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      v.status === "waiting"
                        ? "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
                        : "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                    )}>
                      #{idx + 1}
                    </span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      v.status === "waiting"
                        ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
                        : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                    )}>
                      {statusLabel(v.status)}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>

                <p className="text-base font-bold text-gray-800 dark:text-white mb-1">
                  {v.patient.firstName} {v.patient.lastName}
                </p>
                {v.patient.studentId && (
                  <p className="text-sm text-gray-400 mb-2">{v.patient.studentId}</p>
                )}

                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <ClipboardList size={14} className="flex-shrink-0" />
                  <span className="truncate">{v.chiefComplaint}</span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                  <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {VISIT_TYPE_TH[v.visitType] ?? v.visitType}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> {timeAgo(v.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 3: History / Students
          ════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 gap-1">
            {([
              { key: "queue" as const, label: "คิวผู้ป่วย", icon: Activity },
              { key: "history" as const, label: "ประวัติการรักษา", icon: ClipboardList },
              { key: "students" as const, label: "นักศึกษาทั้งหมด", icon: GraduationCap },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all",
                  tab === key
                    ? "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {/* Search for history/students */}
          {tab !== "queue" && (
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder={tab === "students" ? "ค้นหาชื่อ / รหัสนักศึกษา / อีเมล..." : "ค้นหาชื่อ / รหัสนักศึกษา..."}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          )}
        </div>

        {/* Tab content */}
        {tab === "queue" ? (
          /* Duplicate queue reference — scroll up hint */
          <div className="py-8 text-center">
            <Activity size={28} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">ดูคิวผู้ป่วยด้านบน</p>
          </div>
        ) : tab === "history" ? (
          <HistoryTable visits={visits} loading={loadingList} page={page} />
        ) : (
          <StudentsTable students={students} loading={loadingList} page={page} />
        )}

        {/* Pagination for history/students */}
        {tab !== "queue" && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} จาก {total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={cn("w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                      pg === page ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    )}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Inline Registration Form
   ═══════════════════════════════════════════════════════ */

function InlineRegForm({
  regTitle, setRegTitle,
  regFirstName, setRegFirstName,
  regLastName, setRegLastName,
  regStudentId, setRegStudentId,
  regPhone, setRegPhone,
  regFaculty, setRegFaculty,
  regDepartment, setRegDepartment,
  regBirthDate, setRegBirthDate,
  registering, regError,
  onRegister, onClose,
}: {
  regTitle: string; setRegTitle: (v: string) => void;
  regFirstName: string; setRegFirstName: (v: string) => void;
  regLastName: string; setRegLastName: (v: string) => void;
  regStudentId: string; setRegStudentId: (v: string) => void;
  regPhone: string; setRegPhone: (v: string) => void;
  regFaculty: string; setRegFaculty: (v: string) => void;
  regDepartment: string; setRegDepartment: (v: string) => void;
  regBirthDate: string; setRegBirthDate: (v: string) => void;
  registering: boolean; regError: string;
  onRegister: () => void; onClose: () => void;
}) {
  const inputCls = "w-full px-3 py-2.5 border border-blue-200 dark:border-blue-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-900 dark:text-white";

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <UserPlus size={16} /> ลงทะเบียนผู้ป่วยใหม่
        </p>
        <button onClick={onClose} className="text-blue-400 hover:text-blue-600 p-1">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
        <div>
          <label className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 block">คำนำหน้า *</label>
          <select value={regTitle} onChange={(e) => setRegTitle(e.target.value)} className={inputCls}>
            <option value="นาย">นาย</option>
            <option value="นาง">นาง</option>
            <option value="นางสาว">นางสาว</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 block">ชื่อ *</label>
          <input value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} placeholder="ชื่อจริง" className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 block">นามสกุล *</label>
          <input value={regLastName} onChange={(e) => setRegLastName(e.target.value)} placeholder="นามสกุล" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 block">
          รหัสนักศึกษา * <span className="font-normal text-blue-500">(ใช้เป็นรหัสผ่านตั้งต้น)</span>
        </label>
        <input value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} placeholder="เช่น 6501012345" className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 block">คณะ</label>
          <select value={regFaculty} onChange={(e) => { setRegFaculty(e.target.value); setRegDepartment(""); }} className={inputCls}>
            <option value="">-- ไม่ระบุ --</option>
            {Object.keys(FACULTY_DEPARTMENTS).map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 block">สาขาวิชา</label>
          <select value={regDepartment} onChange={(e) => setRegDepartment(e.target.value)} disabled={!regFaculty} className={cn(inputCls, "disabled:opacity-50 disabled:cursor-not-allowed")}>
            <option value="">{regFaculty ? "-- เลือกสาขา --" : "-- เลือกคณะก่อน --"}</option>
            {(FACULTY_DEPARTMENTS[regFaculty] ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 block">วันเกิด (ถ้ามี)</label>
          <input type="date" value={regBirthDate} onChange={(e) => setRegBirthDate(e.target.value)} className={inputCls} />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-xl px-3 py-2 text-center min-w-[64px]">
          <p className="text-xs text-blue-500">อายุ</p>
          <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
            {regBirthDate
              ? `${Math.floor((Date.now() - new Date(regBirthDate).getTime()) / (365.25 * 24 * 3600 * 1000))} ปี`
              : "—"}
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 block">เบอร์โทร (ถ้ามี)</label>
        <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="0xx-xxx-xxxx" className={inputCls} />
      </div>

      {regError && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
          <AlertCircle size={14} /> {regError}
        </div>
      )}

      <button
        onClick={onRegister}
        disabled={registering || !regFirstName.trim() || !regLastName.trim() || !regStudentId.trim()}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
      >
        {registering ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        {registering ? "กำลังลงทะเบียน..." : "ลงทะเบียนและเลือก"}
      </button>

      <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
        อีเมลจะถูกสร้างอัตโนมัติ · นักศึกษาสามารถเปลี่ยนรหัสผ่านได้ภายหลัง
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   History Table
   ═══════════════════════════════════════════════════════ */

function HistoryTable({ visits, loading, page }: { visits: PatientVisit[]; loading: boolean; page: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            {["#", "ผู้ป่วย", "อาการหลัก", "ประเภท", "สถานะ", "เวลา", ""].map((h, i) => (
              <th key={i} className="text-left px-5 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {loading ? (
            <tr><td colSpan={7} className="py-12 text-center">
              <Loader2 size={24} className="animate-spin text-gray-300 mx-auto" />
            </td></tr>
          ) : visits.length === 0 ? (
            <tr><td colSpan={7} className="py-12 text-center">
              <ClipboardList size={28} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">ไม่พบข้อมูล</p>
            </td></tr>
          ) : visits.map((v, idx) => (
            <tr key={v.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-5 py-3.5 text-sm text-gray-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
              <td className="px-5 py-3.5">
                <p className="font-semibold text-gray-800 dark:text-white">{v.patient.firstName} {v.patient.lastName}</p>
                {v.patient.studentId && <p className="text-sm text-gray-400">{v.patient.studentId}</p>}
              </td>
              <td className="px-5 py-3.5 max-w-[200px]">
                <p className="text-gray-700 dark:text-gray-300 truncate">{v.chiefComplaint}</p>
              </td>
              <td className="px-5 py-3.5">
                <span className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-0.5 rounded-full">
                  {VISIT_TYPE_TH[v.visitType] ?? v.visitType}
                </span>
              </td>
              <td className="px-5 py-3.5"><VisitStatusBadge status={v.status} /></td>
              <td className="px-5 py-3.5 text-sm text-gray-400 whitespace-nowrap">{timeAgo(v.createdAt)}</td>
              <td className="px-5 py-3.5">
                <Link href={`/staff/patients/${v.id}`}
                  className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors flex items-center justify-center"
                >
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Students Table
   ═══════════════════════════════════════════════════════ */

function StudentsTable({ students, loading, page }: { students: StudentUser[]; loading: boolean; page: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            {["#", "นักศึกษา", "รหัสนักศึกษา", "คณะ / ชั้นปี", "สถานะ", ""].map((h, i) => (
              <th key={i} className="text-left px-5 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {loading ? (
            <tr><td colSpan={6} className="py-12 text-center">
              <Loader2 size={24} className="animate-spin text-gray-300 mx-auto" />
            </td></tr>
          ) : students.length === 0 ? (
            <tr><td colSpan={6} className="py-12 text-center">
              <GraduationCap size={28} className="mx-auto text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">ไม่พบนักศึกษา</p>
            </td></tr>
          ) : students.map((s, idx) => (
            <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-5 py-3.5 text-sm text-gray-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {s.firstName[0]}{s.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{s.firstName} {s.lastName}</p>
                    <p className="text-sm text-gray-400">{s.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                {s.studentId ? (
                  <span className="font-mono text-sm bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-lg">
                    {s.studentId}
                  </span>
                ) : (
                  <span className="text-sm text-gray-300">—</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                {s.department || s.yearOfStudy ? (
                  <div>
                    {s.department && <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[180px]">{s.department}</p>}
                    {s.yearOfStudy && <p className="text-sm text-gray-400">ชั้นปีที่ {s.yearOfStudy}</p>}
                  </div>
                ) : (
                  <span className="text-sm text-gray-300">—</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                {s.isActive ? (
                  <span className="flex items-center gap-1 text-sm text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-400 px-2.5 py-0.5 rounded-full w-fit">
                    <UserCheck size={13} /> ใช้งานได้
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 px-2.5 py-0.5 rounded-full w-fit">
                    <UserX size={13} /> ปิดใช้งาน
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5">
                <Link
                  href={`/staff/patients/new?patientId=${s.id}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium"
                >
                  <Stethoscope size={14} /> รับบริการ
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Visit Status Badge
   ═══════════════════════════════════════════════════════ */

function VisitStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    in_treatment: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    referred: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <span className={cn("text-sm px-2.5 py-0.5 rounded-full font-medium", map[status] ?? "bg-gray-100 text-gray-500")}>
      {statusLabel(status)}
    </span>
  );
}

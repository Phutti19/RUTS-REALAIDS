"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Loader2, User, AlertCircle, UserPlus, X, GraduationCap, Briefcase, UserRound } from "lucide-react";
import Link from "next/link";
import { api, extractError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFaculties } from "@/hooks/useFaculties";

type PatientType = "student" | "staff_member" | "external";

interface UserResult {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null;
  email: string;
  role: string;
}

// Faculty/department data is now fetched from the API via useFaculties hook

const VISIT_TYPES = [
  { value: "walk_in", label: "Walk-in", desc: "มาเองที่ห้องพยาบาล" },
  { value: "emergency", label: "ฉุกเฉิน", desc: "ต่อเนื่องจากเหตุฉุกเฉิน" },
  { value: "appointment", label: "นัดหมาย", desc: "มาตามนัด" },
  { value: "follow_up", label: "ติดตาม", desc: "ติดตามอาการเก่า" },
];

export default function NewVisitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { facultyDepartments: FACULTY_DEPARTMENTS } = useFaculties();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: select patient
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false); // has the user typed ≥2 chars?
  const [selected, setSelected] = useState<UserResult | null>(null);

  // Pre-select patient from ?patientId= query param
  useEffect(() => {
    const patientId = searchParams.get("patientId");
    if (!patientId) return;
    api.get<UserResult>(`/users/${patientId}`).then((res) => {
      if (res.success && res.data) {
        const u = res.data as unknown as UserResult;
        setSelected(u);
        setSearch(`${u.firstName} ${u.lastName}`);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inline registration form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regPatientType, setRegPatientType] = useState<PatientType>("student");
  const [regTitle, setRegTitle] = useState("นาย");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regStudentId, setRegStudentId] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regFaculty, setRegFaculty] = useState("");
  const [regDepartment, setRegDepartment] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regNationalId, setRegNationalId] = useState("");
  const [regPosition, setRegPosition] = useState("");
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState("");

  // Step 2: visit info
  const [visitType, setVisitType] = useState("walk_in");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Debounced patient search
  useEffect(() => {
    if (search.length < 2) { setResults([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      setSearched(false);
      const res = await api.get<UserResult[]>(`/users?search=${encodeURIComponent(search)}&limit=8`);
      if (res.success) {
        setResults(Array.isArray(res.data) ? (res.data as unknown as UserResult[]) : []);
      }
      setSearched(true);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const selectPatient = (u: UserResult) => {
    setSelected(u);
    setSearch(`${u.firstName} ${u.lastName}`);
    setResults([]);
    setShowRegForm(false);
    setRegError("");
  };

  const handleRegister = async () => {
    if (!regFirstName.trim() || !regLastName.trim()) return;
    if (regPatientType === "student" && !regStudentId.trim()) return;
    setRegistering(true);
    setRegError("");
    const res = await api.post<UserResult>("/visits/register-patient", {
      patientType: regPatientType,
      title: regTitle,
      firstName: regFirstName.trim(),
      lastName: regLastName.trim(),
      studentId: regStudentId.trim() || undefined,
      phone: regPhone.trim() || undefined,
      faculty: regFaculty || undefined,
      department: regDepartment.trim() || undefined,
      birthDate: regBirthDate || undefined,
      nationalId: regNationalId.trim() || undefined,
      position: regPosition.trim() || undefined,
    });
    setRegistering(false);
    if (res.success && res.data) {
      selectPatient(res.data as UserResult);
    } else {
      setRegError(extractError(res));
    }
  };

  const resetRegForm = () => {
    setRegPatientType("student"); setRegTitle("นาย"); setRegFirstName(""); setRegLastName("");
    setRegStudentId(""); setRegPhone(""); setRegFaculty(""); setRegDepartment("");
    setRegBirthDate(""); setRegNationalId(""); setRegPosition(""); setRegError("");
  };

  const openRegForm = () => {
    setShowRegForm(true);
    // Pre-fill studentId if search looks like a numeric ID
    if (/^\d{4,}$/.test(search.trim())) setRegStudentId(search.trim());
  };

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
      setError(extractError(res));
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

          {/* Search box */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); setShowRegForm(false); }}
              placeholder="ค้นหาชื่อ, รหัสนักศึกษา หรืออีเมล..."
              autoFocus
              className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {searching && (
              <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Search results */}
          {results.length > 0 && (
            <div className="space-y-1.5">
              {results.map((u) => {
                const roleBadge = u.role === "admin" || u.role === "staff"
                  ? { label: "บุคลากร", color: "bg-purple-100 text-purple-700" }
                  : { label: "นักศึกษา", color: "bg-blue-100 text-blue-700" };
                return (
                  <button
                    key={u.id}
                    onClick={() => selectPatient(u)}
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">
                          {u.firstName} {u.lastName}
                        </p>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", roleBadge.color)}>
                          {roleBadge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {u.studentId && `${u.studentId} · `}{u.email}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Not found → offer quick register */}
          {searched && !searching && results.length === 0 && !selected && !showRegForm && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center space-y-2">
              <p className="text-sm text-gray-500">ไม่พบผู้ใช้ในระบบ</p>
              <button
                onClick={openRegForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
              >
                <UserPlus size={14} />
                ลงทะเบียนผู้ป่วยใหม่
              </button>
            </div>
          )}

          {/* Inline registration form */}
          {showRegForm && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                  <UserPlus size={14} />
                  ลงทะเบียนผู้ป่วยใหม่
                </p>
                <button onClick={() => { setShowRegForm(false); resetRegForm(); }}
                  className="text-blue-400 hover:text-blue-600">
                  <X size={15} />
                </button>
              </div>

              {/* Patient type selector */}
              <div>
                <label className="text-xs text-blue-700 font-medium mb-1.5 block">ประเภทผู้ป่วย</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "student" as const, label: "นักศึกษา", icon: <GraduationCap size={16} /> },
                    { value: "staff_member" as const, label: "บุคลากร", icon: <Briefcase size={16} /> },
                    { value: "external" as const, label: "บุคคลภายนอก", icon: <UserRound size={16} /> },
                  ]).map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setRegPatientType(value); setRegStudentId(""); setRegNationalId(""); setRegPosition(""); }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all",
                        regPatientType === value
                          ? "border-blue-500 bg-white text-blue-700"
                          : "border-blue-100 bg-white/50 text-gray-500 hover:border-blue-300"
                      )}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title + First name + Last name */}
              <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
                <div>
                  <label className="text-xs text-blue-700 font-medium mb-1 block">คำนำหน้า *</label>
                  <select
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    className="px-2 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-blue-700 font-medium mb-1 block">ชื่อ *</label>
                  <input
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="ชื่อจริง"
                    className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-700 font-medium mb-1 block">นามสกุล *</label>
                  <input
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    placeholder="นามสกุล"
                    className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
              </div>

              {/* ── Student-specific: รหัสนักศึกษา ─────────────────────────────── */}
              {regPatientType === "student" && (
                <div>
                  <label className="text-xs text-blue-700 font-medium mb-1 block">
                    รหัสนักศึกษา * <span className="font-normal text-blue-500">(ใช้เป็นรหัสผ่านตั้งต้น)</span>
                  </label>
                  <input
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value)}
                    placeholder="เช่น 6501012345"
                    className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
              )}

              {/* ── Staff-specific: ตำแหน่ง + รหัสพนักงาน ────────────────────── */}
              {regPatientType === "staff_member" && (
                <>
                  <div>
                    <label className="text-xs text-blue-700 font-medium mb-1 block">ตำแหน่ง</label>
                    <input
                      value={regPosition}
                      onChange={(e) => setRegPosition(e.target.value)}
                      placeholder="เช่น อาจารย์, แม่บ้าน, ช่างเทคนิค"
                      className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-blue-700 font-medium mb-1 block">รหัสพนักงาน (ถ้ามี)</label>
                    <input
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      placeholder="เช่น EMP-001"
                      className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                  </div>
                </>
              )}

              {/* ── External-specific: เลขบัตร ปชช. ──────────────────────────── */}
              {regPatientType === "external" && (
                <div>
                  <label className="text-xs text-blue-700 font-medium mb-1 block">เลขบัตรประชาชน (ถ้ามี)</label>
                  <input
                    value={regNationalId}
                    onChange={(e) => setRegNationalId(e.target.value)}
                    placeholder="x-xxxx-xxxxx-xx-x"
                    maxLength={13}
                    className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
              )}

              {/* Faculty — show for student & staff_member */}
              {regPatientType !== "external" && (
                <>
                  <div>
                    <label className="text-xs text-blue-700 font-medium mb-1 block">
                      {regPatientType === "staff_member" ? "สังกัด/หน่วยงาน" : "คณะ"}
                    </label>
                    <select
                      value={regFaculty}
                      onChange={(e) => { setRegFaculty(e.target.value); setRegDepartment(""); }}
                      className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {Object.keys(FACULTY_DEPARTMENTS).map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-blue-700 font-medium mb-1 block">สาขาวิชา</label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      disabled={!regFaculty}
                      className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">{regFaculty ? "-- เลือกสาขา --" : "-- เลือกคณะก่อน --"}</option>
                      {(FACULTY_DEPARTMENTS[regFaculty] ?? []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Birth date + auto age */}
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-xs text-blue-700 font-medium mb-1 block">วันเกิด (ถ้ามี)</label>
                  <input
                    type="date"
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                <div className="bg-white border border-blue-200 rounded-xl px-3 py-2 text-center min-w-[64px]">
                  <p className="text-xs text-blue-500">อายุ</p>
                  <p className="text-sm font-bold text-blue-800">
                    {regBirthDate
                      ? `${Math.floor((Date.now() - new Date(regBirthDate).getTime()) / (365.25 * 24 * 3600 * 1000))} ปี`
                      : "—"}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-blue-700 font-medium mb-1 block">เบอร์โทร (ถ้ามี)</label>
                <input
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0xx-xxx-xxxx"
                  className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>

              {regError && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle size={13} /> {regError}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={registering || !regFirstName.trim() || !regLastName.trim() || (regPatientType === "student" && !regStudentId.trim())}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                {registering ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                {registering ? "กำลังลงทะเบียน..." : "ลงทะเบียนและเลือก"}
              </button>

            </div>
          )}

          {/* Selected patient summary */}
          {selected && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-800">
                  {selected.firstName} {selected.lastName}
                </p>
                <p className="text-xs text-blue-600">{selected.studentId} · {selected.email}</p>
              </div>
              <button
                onClick={() => { setSelected(null); setSearch(""); setSearched(false); }}
                className="text-blue-400 hover:text-blue-600 flex-shrink-0"
              >
                <X size={15} />
              </button>
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
              onClick={() => { setStep(1); setSelected(null); setSearch(""); setSearched(false); }}
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

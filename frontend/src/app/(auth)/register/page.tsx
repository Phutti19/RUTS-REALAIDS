"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Eye, EyeOff, Loader2, Siren,
  CheckCircle2, Search, User, KeyRound,
} from "lucide-react";
import { api, extractError } from "@/lib/api";

type Step = "lookup" | "setPassword" | "done";

interface LookupData {
  firstName: string;
  lastName: string;
  maskedEmail: string;
}

export default function ChangePasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("lookup");
  const [studentId, setStudentId] = useState("");
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── Step 1: look up student ID ── */
  const handleLookup = async () => {
    if (!studentId.trim()) return;
    setError("");
    setLoading(true);
    const res = await api.get<LookupData>(`/auth/lookup?studentId=${encodeURIComponent(studentId.trim())}`);
    setLoading(false);
    if (res.success && res.data) {
      setLookupData(res.data);
      setStep("setPassword");
    } else {
      setError(extractError(res, "ไม่พบรหัสนักศึกษาในระบบ"));
    }
  };

  /* ── Step 2: set new password ── */
  const handleChangePassword = async () => {
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setError("");
    setLoading(true);
    const res = await api.post("/auth/activate", { studentId: studentId.trim(), password });
    setLoading(false);
    if (res.success) {
      setStep("done");
    } else {
      setError(extractError(res));
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-8 py-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="flex justify-center mb-3 relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Siren size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold relative z-10">เปลี่ยนรหัสผ่าน</h1>
          <p className="text-blue-200 text-sm mt-1 relative z-10">สำหรับนักศึกษา มทร.ศรีวิชัย</p>
        </div>

        <div className="px-8 py-6">
          {/* ── Done ── */}
          {step === "done" ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 size={52} className="text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-gray-800 text-lg">เปลี่ยนรหัสผ่านสำเร็จ!</p>
                <p className="text-sm text-gray-500 mt-1">
                  กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่
                </p>
              </div>
              <button
                onClick={() => router.push("/login?role=student")}
                className="mt-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                ไปหน้าเข้าสู่ระบบ
              </button>
            </div>

          /* ── Step 1: Enter student ID ── */
          ) : step === "lookup" ? (
            <div className="space-y-5">
              <p className="text-sm text-gray-500 text-center">
                กรอกรหัสนักศึกษา 12 หลัก เพื่อยืนยันตัวตน<br />
                <span className="text-blue-600 font-medium">รหัสผ่านเริ่มต้น = รหัสนักศึกษา</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  รหัสนักศึกษา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="เช่น 670212345678"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleLookup}
                disabled={loading || !studentId.trim()}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" />กำลังค้นหา...</>
                  : <><Search size={18} />ค้นหาบัญชี</>}
              </button>

              <Link
                href="/login?role=student"
                className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={16} />
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>

          /* ── Step 2: Confirm identity + set new password ── */
          ) : (
            <div className="space-y-4">
              {/* Identity card */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {lookupData?.firstName} {lookupData?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {studentId} · {lookupData?.maskedEmail}
                  </p>
                </div>
                <button
                  onClick={() => { setStep("lookup"); setError(""); setPassword(""); setConfirmPassword(""); }}
                  className="ml-auto text-xs text-blue-600 hover:underline flex-shrink-0"
                >
                  เปลี่ยน
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข"
                    autoFocus
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">ตัวพิมพ์ใหญ่ + ตัวพิมพ์เล็ก + ตัวเลข อย่างน้อย 8 ตัว</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ยืนยันรหัสผ่านใหม่ <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={loading || !password || !confirmPassword}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" />กำลังดำเนินการ...</>
                  : <><KeyRound size={18} />เปลี่ยนรหัสผ่าน</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-blue-200 text-xs mt-6 opacity-80">
        © 2026 มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย
      </p>
    </div>
  );
}

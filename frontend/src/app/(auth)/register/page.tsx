"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, GraduationCap, Loader2, Siren, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, string> = { firstName, lastName, email, password };
    if (studentId.trim()) body.studentId = studentId.trim();
    if (phone.trim()) body.phone = phone.trim();

    const res = await api.post("/auth/register", body);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      const firstDetail = Array.isArray(res.errors) && res.errors.length > 0
        ? res.errors[0]
        : null;
      const msg = firstDetail ?? res.message ?? res.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่";
      setError(msg);
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
          <h1 className="text-2xl font-bold relative z-10">สมัครสมาชิก</h1>
          <p className="text-blue-200 text-sm mt-1 relative z-10">สำหรับนักศึกษา มทร.ศรีวิชัย</p>
        </div>

        <div className="px-8 py-6">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 size={52} className="text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-800 text-lg">สมัครสมาชิกสำเร็จ!</p>
              <p className="text-sm text-gray-500 mt-2">
                บัญชีของคุณถูกสร้างแล้ว<br />กรุณาเข้าสู่ระบบเพื่อใช้งาน
              </p>
              <button
                onClick={() => router.push("/login?role=student")}
                className="mt-5 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                ไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role badge */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 mb-1">
                <GraduationCap size={18} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">สมัครในฐานะ นักศึกษา</span>
              </div>

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ชื่อจริง"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="นามสกุล"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Student ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสนักศึกษา</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="เช่น 64010001"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@rmutsv.ac.th"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">อย่างน้อย 8 ตัวอักษร — ต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลขอย่างน้อย 1 ตัว</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" />กำลังสมัคร...</>
                ) : (
                  "สมัครสมาชิก"
                )}
              </button>

              <Link
                href="/login?role=student"
                className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={16} />
                มีบัญชีแล้ว? เข้าสู่ระบบ
              </Link>
            </form>
          )}
        </div>
      </div>

      <p className="text-center text-blue-200 text-xs mt-6 opacity-80">
        © 2026 มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย
      </p>
    </div>
  );
}

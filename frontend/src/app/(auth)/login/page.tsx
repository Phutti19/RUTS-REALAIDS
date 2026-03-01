"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, GraduationCap, Stethoscope, Loader2, Siren } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type UserType = "student" | "staff";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthContext();

  const [userType, setUserType] = useState<UserType>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    // Redirect based on role
    if (result.role === "student") {
      router.push("/student/dashboard");
    } else {
      router.push("/staff/dashboard");
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-8 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Siren size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">RUTS REALAIDS</h1>
          <p className="text-blue-200 text-sm mt-1">
            ระบบแจ้งเหตุฉุกเฉินและห้องพยาบาล
          </p>
          <p className="text-blue-300 text-xs mt-1">มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย</p>
        </div>

        <div className="px-8 py-6">
          {/* User Type Selector */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setUserType("student"); setError(""); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                userType === "student"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <GraduationCap size={18} />
              นักศึกษา
            </button>
            <button
              type="button"
              onClick={() => { setUserType("staff"); setError(""); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                userType === "staff"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Stethoscope size={18} />
              บุคลากร
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@rmutsv.ac.th"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          {/* Forgot password */}
          <div className="mt-4 text-center">
            <a
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ลืมรหัสผ่าน?
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-blue-200 text-xs mt-6">
        © 2026 มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย
      </p>
    </div>
  );
}

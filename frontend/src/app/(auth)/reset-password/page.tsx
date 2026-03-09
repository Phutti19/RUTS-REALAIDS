"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle2, Siren, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="text-center py-4">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-3" />
        <p className="font-semibold text-gray-800">ลิงก์ไม่ถูกต้อง</p>
        <p className="text-sm text-gray-500 mt-1">
          ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ขอลิงก์ใหม่
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-gray-800">เปลี่ยนรหัสผ่านสำเร็จ</p>
        <p className="text-sm text-gray-500 mt-1">
          คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน กรุณากรอกให้ตรงกันทั้งสองช่อง");
      return;
    }

    setLoading(true);
    const res = await api.post("/auth/reset-password", { token, newPassword });
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด ลิงก์อาจหมดอายุแล้ว กรุณาขอลิงก์ใหม่");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          รหัสผ่านใหม่
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            required
            autoComplete="new-password"
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
        <p className="text-xs text-gray-400 mt-1">
          ต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลขอย่างน้อยหนึ่งตัว
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ยืนยันรหัสผ่านใหม่
        </label>
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="ยืนยันรหัสผ่านใหม่"
          required
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
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
          <><Loader2 size={18} className="animate-spin" />กำลังบันทึก...</>
        ) : (
          "ตั้งรหัสผ่านใหม่"
        )}
      </button>

      <Link
        href="/login"
        className="flex items-center justify-center text-sm text-gray-500 hover:text-gray-700"
      >
        กลับไปเข้าสู่ระบบ
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-8 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Siren size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-blue-200 text-sm mt-1">กรอกรหัสผ่านใหม่ของคุณ</p>
        </div>

        <div className="px-8 py-6">
          <Suspense
            fallback={
              <div className="text-center text-sm text-gray-400 py-8">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                กำลังโหลด...
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

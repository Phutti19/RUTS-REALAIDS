"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, Siren } from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api.post("/auth/forgot-password", { email });
    setLoading(false);
    if (res.success) {
      setSent(true);
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-8 py-8 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Siren size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold">ลืมรหัสผ่าน</h1>
          <p className="text-blue-200 text-sm mt-1">กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน</p>
        </div>

        <div className="px-8 py-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">ส่งอีเมลแล้ว</p>
              <p className="text-sm text-gray-500 mt-1">
                กรุณาตรวจสอบกล่องจดหมาย <br />
                <span className="font-medium">{email}</span>
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block text-sm text-blue-600 hover:underline"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          ) : (
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" />กำลังส่ง...</>
                ) : (
                  "ส่งลิงก์รีเซ็ตรหัสผ่าน"
                )}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={16} />
                กลับไปเข้าสู่ระบบ
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

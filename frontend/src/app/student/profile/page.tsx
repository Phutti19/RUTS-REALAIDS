"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Heart,
  Edit2,
  Save,
  X,
  Loader2,
  LogOut,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { HealthProfile } from "@/types";

const BLOOD_TYPES = ["A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthContext();

  // Personal info
  const [editPersonal, setEditPersonal] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalMsg, setPersonalMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Health profile
  const [health, setHealth] = useState<HealthProfile | null>(null);
  const [editHealth, setEditHealth] = useState(false);
  const [bloodType, setBloodType] = useState<string>("");
  const [allergies, setAllergies] = useState("");
  const [chronicDiseases, setChronicDiseases] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [savingHealth, setSavingHealth] = useState(false);
  const [healthMsg, setHealthMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  useEffect(() => {
    api.get<HealthProfile>("/users/me/health-profile").then((res) => {
      if (res.success && res.data) {
        const h = res.data;
        setHealth(h);
        setBloodType(h.bloodType ?? "");
        setAllergies(h.allergies ?? "");
        setChronicDiseases(h.chronicDiseases ?? "");
        setEmergencyContact(h.emergencyContact?.name ?? "");
        setEmergencyPhone(h.emergencyContact?.phone ?? "");
      }
      setLoadingHealth(false);
    });
  }, []);

  const savePersonal = async () => {
    setSavingPersonal(true);
    setPersonalMsg(null);
    const res = await api.put("/users/me", { firstName, lastName, phone: phone || null });
    setSavingPersonal(false);
    if (res.success) {
      setPersonalMsg({ type: "success", text: "บันทึกสำเร็จ" });
      setEditPersonal(false);
    } else {
      setPersonalMsg({ type: "error", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const saveHealth = async () => {
    setSavingHealth(true);
    setHealthMsg(null);
    const res = await api.put("/users/me/health-profile", {
      bloodType: bloodType || null,
      allergies: allergies.trim() || null,
      chronicDiseases: chronicDiseases.trim() || null,
      emergencyContactName: emergencyContact.trim() || null,
      emergencyContactPhone: emergencyPhone.trim() || null,
    });
    setSavingHealth(false);
    if (res.success) {
      setHealthMsg({ type: "success", text: "บันทึกสำเร็จ" });
      setEditHealth(false);
    } else {
      setHealthMsg({ type: "error", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 pt-10 pb-16 px-4 text-white">
        <h1 className="text-xl font-bold">โปรไฟล์</h1>
      </div>

      {/* Avatar card */}
      <div className="-mt-8 mx-4 mb-4 bg-white rounded-2xl shadow-md p-4 flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
          <User size={28} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-base">
            {user?.firstName} {user?.lastName}
          </p>
          {user?.studentId && (
            <p className="text-xs text-gray-500">{user.studentId}</p>
          )}
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </div>

      <div className="px-4 space-y-4 pb-6">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">ข้อมูลส่วนตัว</h2>
            </div>
            {!editPersonal ? (
              <button
                onClick={() => setEditPersonal(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Edit2 size={13} /> แก้ไข
              </button>
            ) : (
              <button
                onClick={() => setEditPersonal(false)}
                className="text-xs text-gray-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="p-4 space-y-3">
            {editPersonal ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ชื่อ</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">นามสกุล</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                {personalMsg && (
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs rounded-xl px-3 py-2",
                      personalMsg.type === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    )}
                  >
                    {personalMsg.type === "success" ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                    {personalMsg.text}
                  </div>
                )}
                <button
                  onClick={savePersonal}
                  disabled={savingPersonal}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {savingPersonal ? (
                    <><Loader2 size={15} className="animate-spin" />กำลังบันทึก...</>
                  ) : (
                    <><Save size={15} />บันทึก</>
                  )}
                </button>
              </>
            ) : (
              <div className="space-y-2 text-sm">
                <InfoRow label="ชื่อ-นามสกุล" value={`${user?.firstName} ${user?.lastName}`} />
                <InfoRow label="รหัสนักศึกษา" value={user?.studentId ?? "—"} />
                <InfoRow label="อีเมล" value={user?.email ?? "—"} />
                <InfoRow label="เบอร์โทร" value={user?.phone ?? "ยังไม่ระบุ"} />
              </div>
            )}
          </div>
        </div>

        {/* Health Profile */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-red-500" />
              <h2 className="text-sm font-semibold text-gray-800">ข้อมูลสุขภาพ</h2>
            </div>
            {!editHealth ? (
              <button
                onClick={() => setEditHealth(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Edit2 size={13} /> แก้ไข
              </button>
            ) : (
              <button onClick={() => setEditHealth(false)} className="text-xs text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="p-4">
            {loadingHealth ? (
              <div className="py-4 flex justify-center">
                <Loader2 size={20} className="animate-spin text-gray-300" />
              </div>
            ) : editHealth ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">กรุ๊ปเลือด</label>
                  <div className="flex flex-wrap gap-2">
                    {BLOOD_TYPES.map((bt) => (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => setBloodType(bt === bloodType ? "" : bt)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm border-2 transition-all",
                          bloodType === bt
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        )}
                      >
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">ยาที่แพ้</label>
                  <textarea
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="ระบุยาหรือสารที่แพ้..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">โรคประจำตัว</label>
                  <textarea
                    value={chronicDiseases}
                    onChange={(e) => setChronicDiseases(e.target.value)}
                    placeholder="ระบุโรคประจำตัว..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ผู้ติดต่อฉุกเฉิน</label>
                    <input
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="ชื่อผู้ติดต่อ"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">เบอร์โทร</label>
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="08x-xxx-xxxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {healthMsg && (
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs rounded-xl px-3 py-2",
                      healthMsg.type === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    )}
                  >
                    {healthMsg.type === "success" ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                    {healthMsg.text}
                  </div>
                )}

                <button
                  onClick={saveHealth}
                  disabled={savingHealth}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {savingHealth ? (
                    <><Loader2 size={15} className="animate-spin" />กำลังบันทึก...</>
                  ) : (
                    <><Save size={15} />บันทึก</>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <span className="font-bold text-red-600 text-sm">
                      {health?.bloodType ?? "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">กรุ๊ปเลือด</p>
                    <p className="font-semibold text-gray-800">
                      {health?.bloodType ?? "ยังไม่ระบุ"}
                    </p>
                  </div>
                </div>
                <InfoRow label="ยาที่แพ้" value={health?.allergies ?? "ไม่มี"} />
                <InfoRow label="โรคประจำตัว" value={health?.chronicDiseases ?? "ไม่มี"} />
                <InfoRow label="ผู้ติดต่อฉุกเฉิน" value={health?.emergencyContact?.name ?? "ยังไม่ระบุ"} />
                <InfoRow label="เบอร์ฉุกเฉิน" value={health?.emergencyContact?.phone ?? "ยังไม่ระบุ"} />
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between text-red-600 hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut size={18} />
            <span className="text-sm font-medium">ออกจากระบบ</span>
          </div>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-800 text-right">{value}</span>
    </div>
  );
}

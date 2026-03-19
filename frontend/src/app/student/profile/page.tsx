"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Edit2,
  Save,
  X,
  Loader2,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  IdCard,
  GraduationCap,
  BookOpen,
  Droplets,
  ShieldAlert,
  Stethoscope,
  PhoneCall,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { HealthProfile } from "@/types";

const BLOOD_TYPES = ["A","B","AB","O"];

const AVATAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-600",
];

function getAvatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] ?? AVATAR_COLORS[0]!;
}

export default function StudentProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthContext();

  const [editPersonal, setEditPersonal] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalMsg, setPersonalMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [health, setHealth] = useState<HealthProfile | null>(null);
  const [editHealth, setEditHealth] = useState(false);
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicDiseases, setChronicDiseases] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [savingHealth, setSavingHealth] = useState(false);
  const [healthMsg, setHealthMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

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
      setTimeout(() => { setEditPersonal(false); setPersonalMsg(null); }, 1500);
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
      setHealth({
        userId: user?.id ?? "",
        bloodType: bloodType || null,
        allergies: allergies.trim() || null,
        chronicDiseases: chronicDiseases.trim() || null,
        emergencyContact: {
          name: emergencyContact.trim() || null,
          phone: emergencyPhone.trim() || null,
          relation: null,
        },
        updatedAt: new Date().toISOString(),
      });
      setHealthMsg({ type: "success", text: "บันทึกสำเร็จ" });
      setTimeout(() => { setEditHealth(false); setHealthMsg(null); }, 1500);
    } else {
      setHealthMsg({ type: "error", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const fullName = `${firstName} ${lastName}`.trim() || "?";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
  const avatarGradient = getAvatarColor(firstName || "A");

  return (
    <div className="bg-gray-50">
      {/* Header with avatar — no overlap needed */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md",
              avatarGradient
            )}
          >
            <span className="text-white font-extrabold text-2xl">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-lg truncate">{fullName}</h1>
            {user?.studentId && (
              <p className="text-xs text-gray-500 mt-0.5">{user.studentId}</p>
            )}
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          {health?.bloodType && (
            <div className="flex-shrink-0 w-11 h-11 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">{health.bloodType}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-6">
        {/* Personal Info */}
        <SectionCard
          title="ข้อมูลส่วนตัว"
          icon={<IdCard size={16} className="text-blue-600" />}
          onEdit={!editPersonal ? () => setEditPersonal(true) : undefined}
          onCancel={editPersonal ? () => { setEditPersonal(false); setPersonalMsg(null); } : undefined}
        >
          {editPersonal ? (
            <div className="space-y-3">
              <InfoRow icon={<IdCard size={14} className="text-gray-400" />} label="ชื่อ-นามสกุล" value={fullName} />
              <Field label="เบอร์โทรศัพท์">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                />
              </Field>
              <MsgBanner msg={personalMsg} />
              <SaveButton loading={savingPersonal} onClick={savePersonal} />
            </div>
          ) : (
            <div className="space-y-1">
              <InfoRow icon={<IdCard size={14} className="text-gray-400" />} label="ชื่อ-นามสกุล" value={fullName} />
              <InfoRow icon={<IdCard size={14} className="text-gray-400" />} label="รหัสนักศึกษา" value={user?.studentId ?? "—"} />
              <InfoRow icon={<Mail size={14} className="text-gray-400" />} label="อีเมล" value={user?.email ?? "—"} />
              <InfoRow icon={<Phone size={14} className="text-gray-400" />} label="เบอร์โทร" value={phone || "ยังไม่ระบุ"} />
              {user?.role === "student" && (
                <>
                  <InfoRow icon={<GraduationCap size={14} className="text-gray-400" />} label="คณะ" value={user?.faculty ?? "ยังไม่ระบุ"} />
                  <InfoRow icon={<BookOpen size={14} className="text-gray-400" />} label="สาขา" value={user?.department ?? "ยังไม่ระบุ"} />
                </>
              )}
            </div>
          )}
        </SectionCard>

        {/* Health Profile */}
        <SectionCard
          title="ข้อมูลสุขภาพ"
          icon={<Heart size={16} className="text-red-500" />}
          onEdit={!editHealth ? () => setEditHealth(true) : undefined}
          onCancel={editHealth ? () => { setEditHealth(false); setHealthMsg(null); } : undefined}
        >
          {loadingHealth ? (
            <div className="py-4 flex justify-center">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : editHealth ? (
            <div className="space-y-3">
              <Field label="กรุ๊ปเลือด">
                <div className="flex flex-wrap gap-2">
                  {BLOOD_TYPES.map((bt) => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setBloodType(bt === bloodType ? "" : bt)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-sm border-2 font-medium transition-all",
                        bloodType === bt
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50"
                      )}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="ยาที่แพ้">
                <textarea
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="ระบุยาหรือสารที่แพ้..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-gray-50"
                />
              </Field>
              <Field label="โรคประจำตัว">
                <textarea
                  value={chronicDiseases}
                  onChange={(e) => setChronicDiseases(e.target.value)}
                  placeholder="ระบุโรคประจำตัว..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-gray-50"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ผู้ติดต่อฉุกเฉิน">
                  <input
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="ชื่อผู้ติดต่อ"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </Field>
                <Field label="เบอร์โทร">
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                  />
                </Field>
              </div>
              <MsgBanner msg={healthMsg} />
              <SaveButton loading={savingHealth} onClick={saveHealth} />
            </div>
          ) : (
            <div className="space-y-1">
              <InfoRow icon={<Droplets size={14} className="text-red-400" />} label="กรุ๊ปเลือด" value={health?.bloodType ?? "ยังไม่ระบุ"} highlight={!!health?.bloodType} />
              <InfoRow icon={<ShieldAlert size={14} className="text-orange-400" />} label="ยาที่แพ้" value={health?.allergies ?? "ไม่มี"} />
              <InfoRow icon={<Stethoscope size={14} className="text-blue-400" />} label="โรคประจำตัว" value={health?.chronicDiseases ?? "ไม่มี"} />
              <InfoRow icon={<PhoneCall size={14} className="text-green-500" />} label="ผู้ติดต่อฉุกเฉิน" value={health?.emergencyContact?.name ?? "ยังไม่ระบุ"} />
              <InfoRow icon={<Phone size={14} className="text-green-400" />} label="เบอร์ฉุกเฉิน" value={health?.emergencyContact?.phone ?? "ยังไม่ระบุ"} />
            </div>
          )}
        </SectionCard>

        {/* Logout */}
        <button
          onClick={async () => { await logout(); router.push("/login"); }}
          className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between text-red-500 hover:bg-red-50 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut size={16} className="text-red-500" />
            </div>
            <span className="text-sm font-semibold">ออกจากระบบ</span>
          </div>
          <span className="text-xs text-gray-300">›</span>
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function SectionCard({
  title,
  icon,
  onEdit,
  onCancel,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onEdit?: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Edit2 size={12} /> แก้ไข
          </button>
        )}
        {onCancel && (
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={15} />
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 text-gray-500 flex-shrink-0">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={cn("text-sm text-right", highlight ? "font-bold text-red-600" : "text-gray-700")}>
        {value}
      </span>
    </div>
  );
}

function MsgBanner({ msg }: { msg: { type: "success" | "error"; text: string } | null }) {
  if (!msg) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs rounded-xl px-3 py-2",
        msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      )}
    >
      {msg.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
      {msg.text}
    </div>
  );
}

function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
    >
      {loading ? (
        <><Loader2 size={14} className="animate-spin" />กำลังบันทึก...</>
      ) : (
        <><Save size={14} />บันทึก</>
      )}
    </button>
  );
}

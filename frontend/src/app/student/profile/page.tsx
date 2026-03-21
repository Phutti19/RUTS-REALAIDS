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
  Bell,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { usePushNotification } from "@/hooks/usePushNotification";
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

  const { isSupported: pushSupported, permission: pushPermission, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } =
    usePushNotification();

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
    <div className="bg-slate-100 dark:bg-gray-900">
      {/* Header with avatar */}
      <div className="bg-gradient-to-br from-blue-800 to-blue-950 px-4 pb-5 student-header">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/20",
              avatarGradient
            )}
          >
            <span className="text-white font-extrabold text-xl">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-lg truncate">{fullName}</h1>
            {user?.studentId && (
              <p className="text-xs text-blue-200 mt-0.5">{user.studentId}</p>
            )}
            <p className="text-xs text-blue-300 truncate">{user?.email}</p>
          </div>
          {health?.bloodType && (
            <div className="flex-shrink-0 w-10 h-10 bg-white/15 border border-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{health.bloodType}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 pt-4 space-y-3 pb-4">
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

        {/* Push Notification */}
        <SectionCard title="การแจ้งเตือน" icon={<Bell size={16} className="text-blue-500" />}>
          {!pushSupported ? (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle size={14} />
              <div>
                <p>Push Notification ใช้งานไม่ได้</p>
                {typeof window !== "undefined" && location.protocol !== "https:" && location.hostname !== "localhost" ? (
                  <p className="text-xs mt-0.5 text-amber-500">ต้องเปิดผ่าน HTTPS หรือ localhost เท่านั้น</p>
                ) : (
                  <p className="text-xs mt-0.5 text-amber-500">เบราว์เซอร์ไม่รองรับ</p>
                )}
              </div>
            </div>
          ) : pushPermission === "denied" ? (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle size={14} />
              Push Notification ถูกบล็อก — กรุณาเปิดในตั้งค่าเบราว์เซอร์
            </div>
          ) : (
            <div
              onClick={() => pushSubscribed ? pushUnsubscribe() : pushSubscribe()}
              className="flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-gray-700">Push Notification</p>
                <p className="text-xs text-gray-400">
                  {pushSubscribed ? "รับการแจ้งเตือนบนอุปกรณ์นี้" : "เปิดเพื่อรับแจ้งเตือนแม้ปิดเว็บ"}
                </p>
              </div>
              {pushLoading ? (
                <Loader2 size={18} className="animate-spin text-blue-600" />
              ) : (
                <div className={cn("w-10 h-6 rounded-full relative transition-colors", pushSubscribed ? "bg-blue-600" : "bg-gray-300")}>
                  <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform", pushSubscribed ? "left-5" : "left-1")} />
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Logout */}
        <button
          onClick={async () => { await logout(); router.push("/login"); }}
          className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <LogOut size={16} className="text-red-600 dark:text-red-400" />
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 font-medium hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Edit2 size={12} /> แก้ไข
          </button>
        )}
        {onCancel && (
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-1">
            <X size={15} />
          </button>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
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
    <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 flex-shrink-0">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={cn("text-xs text-right truncate max-w-[55%]", highlight ? "font-bold text-red-600" : "text-gray-800 dark:text-gray-200")}>
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

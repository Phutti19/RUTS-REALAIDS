"use client";

import { useState, useEffect } from "react";
import {
  Settings, User, Bell, Users, Database, Save, Loader2,
  CheckCircle2, Shield, Phone, Plus, Trash2, AlertCircle,
  UserCheck, UserX, X, Search, ChevronLeft, ChevronRight, KeyRound,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SystemSetting, EmergencyContact } from "@/types";

type TabType = "profile" | "notifications" | "contacts" | "users" | "system" | "backup";

export default function SettingsPage() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState<TabType>("profile");
  const isAdmin = user?.role === "admin";

  const TABS: { key: TabType; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: "profile", label: "โปรไฟล์", icon: <User size={16} /> },
    { key: "notifications", label: "การแจ้งเตือน", icon: <Bell size={16} /> },
    { key: "contacts", label: "สมุดโทรศัพท์", icon: <Phone size={16} /> },
    { key: "users", label: "ผู้ใช้งาน", icon: <Users size={16} />, adminOnly: true },
    { key: "system", label: "ระบบ", icon: <Settings size={16} />, adminOnly: true },
    { key: "backup", label: "สำรองข้อมูล", icon: <Database size={16} />, adminOnly: true },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ตั้งค่า</h1>
        <p className="text-sm text-gray-500">จัดการการตั้งค่าระบบ</p>
      </div>

      <div className="flex gap-4">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map(({ key, label, icon, adminOnly }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left",
                tab === key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 bg-white"
              )}
            >
              {icon}
              {label}
              {adminOnly && (
                <Shield size={11} className={cn("ml-auto opacity-60", tab === key ? "text-white" : "text-gray-400")} />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm p-5 min-h-[400px]">
          {tab === "profile" && <ProfileTab user={user} />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "contacts" && <ContactsTab />}
          {tab === "users" && isAdmin && <UsersTab />}
          {tab === "system" && isAdmin && <SystemTab />}
          {tab === "backup" && isAdmin && <BackupTab />}
        </div>
      </div>
    </div>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: ReturnType<typeof useAuthContext>["user"] }) {
  const { refreshUser } = useAuthContext();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await api.put("/users/me", { firstName, lastName, phone: phone || null });
    setSaving(false);
    if (res.success) {
      await refreshUser();
      setMsg({ type: "success", text: "บันทึกสำเร็จ" });
    } else {
      setMsg({ type: "error", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-semibold text-gray-800">ข้อมูลส่วนตัว</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">ชื่อ</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">นามสกุล</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">อีเมล</label>
        <input
          value={user?.email ?? ""}
          disabled
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">เบอร์โทรศัพท์</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      {msg && (
        <div className={cn("flex items-center gap-2 text-xs rounded-xl px-3 py-2",
          msg.type === "success" ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
        )}>
          <CheckCircle2 size={14} /> {msg.text}
        </div>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        บันทึก
      </button>
    </div>
  );
}

// ── Notifications Tab ──────────────────────────────────────────────────────────

const NOTIF_ITEMS = [
  { key: "emergency", label: "เหตุฉุกเฉินใหม่", desc: "แจ้งเตือนเมื่อมีการแจ้งเหตุ" },
  { key: "stock_low", label: "ยาสต๊อกต่ำ", desc: "แจ้งเตือนเมื่อยาต่ำกว่าเกณฑ์" },
  { key: "stock_expiry", label: "ยาใกล้หมดอายุ", desc: "แจ้งเตือนล่วงหน้า 30 วัน" },
  { key: "appointment", label: "การนัดหมายใหม่", desc: "แจ้งเตือนเมื่อมีการจองนัด" },
] as const;

const NOTIF_STORAGE_KEY = "staff_notif_prefs";

function loadNotifPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch { /* ignore */ }
  return Object.fromEntries(NOTIF_ITEMS.map((i) => [i.key, true]));
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(loadNotifPrefs);

  const toggle = (key: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-semibold text-gray-800">การแจ้งเตือน</h2>
      <p className="text-sm text-gray-500">ตั้งค่าการรับการแจ้งเตือนต่างๆ</p>
      <div className="space-y-3">
        {NOTIF_ITEMS.map(({ key, label, desc }) => (
          <div
            key={key}
            onClick={() => toggle(key)}
            className="flex items-center justify-between p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[key] ?? true}
              onChange={() => toggle(key)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 accent-blue-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Emergency Contacts Tab ─────────────────────────────────────────────────────

const CONTACT_CATEGORIES: { value: EmergencyContact["category"]; label: string; color: string; emoji: string }[] = [
  { value: "hospital", label: "โรงพยาบาล", color: "bg-red-100 text-red-700", emoji: "🏥" },
  { value: "police", label: "ตำรวจ", color: "bg-blue-100 text-blue-700", emoji: "👮" },
  { value: "rescue", label: "กู้ภัย", color: "bg-orange-100 text-orange-700", emoji: "🚒" },
  { value: "fire", label: "ดับเพลิง", color: "bg-yellow-100 text-yellow-700", emoji: "🔥" },
];

function ContactsTab() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<EmergencyContact["category"]>("hospital");
  const [note, setNote] = useState("");

  useEffect(() => {
    api.get<EmergencyContact[]>("/emergency-contacts").then((res) => {
      if (res.success && res.data) setContacts(res.data);
      setLoading(false);
    });
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    setError("");
    const res = await api.post<EmergencyContact>("/emergency-contacts", {
      name: name.trim(),
      phone: phone.trim(),
      category,
      note: note.trim() || null,
    });
    setSaving(false);
    if (res.success && res.data) {
      setContacts((prev) => [...prev, res.data!]);
      setName(""); setPhone(""); setNote("");
      setShowForm(false);
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบรายชื่อนี้?")) return;
    setDeletingId(id);
    await api.delete(`/emergency-contacts/${id}`);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
  };

  // group by category
  const grouped = CONTACT_CATEGORIES.map(({ value, label, color, emoji }) => ({
    value, label, color, emoji,
    items: contacts.filter((c) => c.category === value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">สมุดโทรศัพท์ฉุกเฉิน</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium"
        >
          <Plus size={13} /> เพิ่มเบอร์
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-4 gap-1.5">
            {CONTACT_CATEGORIES.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className={cn(
                  "py-2 rounded-lg text-xs font-medium border-2 transition-all",
                  category === value ? "border-blue-500 bg-white shadow-sm" : "border-transparent bg-white/60"
                )}
              >
                <span className="text-base block">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อหน่วยงาน *"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เบอร์โทรศัพท์ *"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="หมายเหตุ (ไม่บังคับ)"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-3 py-2 border border-gray-200 bg-white text-gray-600 rounded-xl text-sm"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !name.trim() || !phone.trim()}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              บันทึก
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <Phone size={28} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm">ยังไม่มีรายชื่อฉุกเฉิน</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ value, label, color, emoji, items }) => (
            <div key={value}>
              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2", color)}>
                <span>{emoji}</span> {label}
              </div>
              <div className="space-y-1.5">
                {items.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      {c.note && <p className="text-xs text-gray-400 truncate">{c.note}</p>}
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 flex-shrink-0"
                    >
                      <Phone size={13} />
                      {c.phone}
                    </a>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      {deletingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────────

type AdminUserRow = { id: string; firstName: string; lastName: string; email: string; role: string; isActive: boolean; phone?: string | null; studentId?: string | null; faculty?: string | null; department?: string | null };

type RoleFilter = "all" | "admin" | "staff" | "student";

const ROLE_GROUPS: { role: "admin" | "staff" | "student"; label: string; badge: string; dot: string }[] = [
  { role: "admin",   label: "ผู้ดูแลระบบ", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  { role: "staff",   label: "เจ้าหน้าที่",  badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-500"   },
  { role: "student", label: "นักศึกษา",     badge: "bg-gray-100 text-gray-600",   dot: "bg-gray-400"   },
];

const PAGE_SIZE = 15;

function UsersTab() {
  // ── Server-side pagination state ─────────────────────────────────────────────
  const [data, setData] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [roleCounts, setRoleCounts] = useState({ all: 0, admin: 0, staff: 0, student: 0 });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // form state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<AdminUserRow | null>(null);
  const [error, setError] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fRole, setFRole] = useState<"staff" | "admin">("staff");
  const [fPassword, setFPassword] = useState("");

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filter or search changes
  useEffect(() => { setCurrentPage(1); }, [roleFilter, facultyFilter, debouncedSearch]);

  // ── Fetch current page ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(PAGE_SIZE),
      sortBy: "role",
      order: "asc",
    });
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (facultyFilter) params.set("faculty", facultyFilter);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    api.get<AdminUserRow[]>(`/admin/users?${params}`).then((res) => {
      if (res.success) {
        setData(Array.isArray(res.data) ? (res.data as unknown as AdminUserRow[]) : []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
      }
      setLoading(false);
    });
  }, [currentPage, roleFilter, facultyFilter, debouncedSearch]);

  // ── Fetch role counts (once on mount, refresh after create/toggle) ─────────
  const fetchCounts = () => {
    Promise.all([
      api.get<AdminUserRow[]>("/admin/users?limit=1"),
      api.get<AdminUserRow[]>("/admin/users?limit=1&role=admin"),
      api.get<AdminUserRow[]>("/admin/users?limit=1&role=staff"),
      api.get<AdminUserRow[]>("/admin/users?limit=1&role=student"),
    ]).then(([all, admin, staff, student]) => {
      setRoleCounts({
        all:     all.total     ?? 0,
        admin:   admin.total   ?? 0,
        staff:   staff.total   ?? 0,
        student: student.total ?? 0,
      });
    });
  };
  useEffect(() => { fetchCounts(); }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFEmail(""); setFFirstName(""); setFLastName("");
    setFPhone(""); setFRole("staff"); setFPassword(""); setError("");
  };

  const handleCreate = async () => {
    if (!fEmail.trim() || !fFirstName.trim() || !fLastName.trim() || !fPassword.trim()) return;
    setSaving(true);
    setError("");
    const res = await api.post<AdminUserRow>("/admin/users", {
      email: fEmail.trim(), firstName: fFirstName.trim(), lastName: fLastName.trim(),
      phone: fPhone.trim() || null, role: fRole, password: fPassword,
    });
    setSaving(false);
    if (res.success) {
      resetForm(); setShowForm(false);
      setCurrentPage(1); fetchCounts();
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const toggleActive = async (u: AdminUserRow) => {
    setTogglingId(u.id);
    const endpoint = u.isActive ? `/admin/users/${u.id}/deactivate` : `/admin/users/${u.id}/activate`;
    const res = await api.patch<AdminUserRow>(endpoint);
    if (res.success && res.data) {
      setData((prev) => prev.map((x) => x.id === u.id ? { ...x, isActive: (res.data as AdminUserRow).isActive } : x));
      fetchCounts();
    }
    setTogglingId(null);
  };

  const resetPassword = async (u: AdminUserRow) => {
    setResettingId(u.id);
    await api.patch(`/admin/users/${u.id}/reset-password`);
    setResettingId(null);
    setResetConfirm(null);
  };

  // Group current page data by role
  const groups = ROLE_GROUPS.map((g) => ({
    ...g,
    items: data.filter((u) => u.role === g.role),
  })).filter((g) => g.items.length > 0);

  const FILTER_TABS: { key: RoleFilter; label: string }[] = [
    { key: "all",     label: `ทั้งหมด (${roleCounts.all})` },
    { key: "admin",   label: `ผู้ดูแล (${roleCounts.admin})` },
    { key: "staff",   label: `เจ้าหน้าที่ (${roleCounts.staff})` },
    { key: "student", label: `นักศึกษา (${roleCounts.student})` },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">จัดการผู้ใช้งาน</h2>
        <button
          onClick={() => { setShowForm(!showForm); resetForm(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium"
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? "ยกเลิก" : "เพิ่มผู้ใช้"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700">เพิ่มเจ้าหน้าที่ / ผู้ดูแลระบบ</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={fFirstName} onChange={(e) => setFFirstName(e.target.value)} placeholder="ชื่อ *"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={fLastName} onChange={(e) => setFLastName(e.target.value)} placeholder="นามสกุล *"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <input value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="อีเมล *" type="email"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="grid grid-cols-2 gap-2">
            <input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="เบอร์โทร"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input value={fPassword} onChange={(e) => setFPassword(e.target.value)} placeholder="รหัสผ่าน *" type="password"
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-2">
            {(["staff", "admin"] as const).map((r) => (
              <button key={r} onClick={() => setFRole(r)}
                className={cn("flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all",
                  fRole === r ? "border-blue-500 bg-white shadow-sm text-blue-700" : "border-transparent bg-white/60 text-gray-500"
                )}>
                {r === "staff" ? "เจ้าหน้าที่" : "ผู้ดูแลระบบ"}
              </button>
            ))}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <button onClick={handleCreate} disabled={saving || !fEmail.trim() || !fFirstName.trim() || !fLastName.trim() || !fPassword.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            บันทึก
          </button>
        </div>
      )}

      {/* Search + Faculty filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ อีเมล หรือรหัสนักศึกษา..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={facultyFilter}
          onChange={(e) => setFacultyFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-600 bg-white"
        >
          <option value="">ทุกคณะ</option>
          <option value="คณะวิศวกรรมศาสตร์">คณะวิศวกรรมศาสตร์</option>
          <option value="คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี">คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี</option>
          <option value="คณะบริหารธุรกิจ">คณะบริหารธุรกิจ</option>
          <option value="คณะสถาปัตยกรรมศาสตร์">คณะสถาปัตยกรรมศาสตร์</option>
          <option value="คณะศิลปศาสตร์">คณะศิลปศาสตร์</option>
        </select>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setRoleFilter(key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              roleFilter === key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <Users size={28} className="mx-auto text-gray-200 mb-2" />
          <p className="text-sm">ไม่พบผู้ใช้งาน</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ role, label, badge, dot, items }) => (
            <div key={role}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badge)}>{items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map((u) => (
                  <div key={u.id} className={cn("flex items-center gap-3 p-3 border rounded-xl transition-colors",
                    u.isActive ? "border-gray-100 hover:border-gray-200 bg-white" : "border-red-100 bg-red-50/40"
                  )}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                      u.isActive ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                    )}>
                      {u.firstName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", u.isActive ? "text-gray-800" : "text-gray-400 line-through")}>
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      {u.role === "student" && (u.faculty || u.department) && (
                        <p className="text-xs text-blue-500 truncate mt-0.5">
                          {[u.faculty, u.department].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    {!u.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">ปิดใช้งาน</span>
                    )}
                    {/* Reset password — students only */}
                    {u.role === "student" && (
                      <button
                        onClick={() => setResetConfirm(u)}
                        disabled={resettingId === u.id}
                        title="รีเซ็ตรหัสผ่านเป็นรหัสนักศึกษา"
                        className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                      >
                        {resettingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                      </button>
                    )}
                    {/* Toggle active */}
                    <button onClick={() => toggleActive(u)} disabled={togglingId === u.id}
                      className={cn("p-1.5 rounded-lg transition-colors flex-shrink-0",
                        u.isActive
                          ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                          : "text-green-500 hover:text-green-700 hover:bg-green-50"
                      )}>
                      {togglingId === u.id ? <Loader2 size={14} className="animate-spin" /> :
                        u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reset password confirm dialog */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <KeyRound size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">รีเซ็ตรหัสผ่าน</p>
                <p className="text-sm text-gray-500 mt-1">
                  รีเซ็ตรหัสผ่านของ <span className="font-medium text-gray-800">{resetConfirm.firstName} {resetConfirm.lastName}</span><br />
                  เป็นรหัสนักศึกษา <span className="font-mono font-medium text-blue-700">{resetConfirm.email.split("@")[0].replace(/^s/, "")}</span> ใช่ไหม?
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setResetConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => resetPassword(resetConfirm)}
                disabled={resettingId === resetConfirm.id}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {resettingId === resetConfirm.id
                  ? <Loader2 size={15} className="animate-spin" />
                  : <KeyRound size={15} />}
                รีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            แสดง {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} จาก {total} รายการ
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={14} className="text-gray-500" />
            </button>
            {(() => {
              // Show at most 5 page buttons around current page
              const range: number[] = [];
              const start = Math.max(1, currentPage - 2);
              const end   = Math.min(totalPages, currentPage + 2);
              if (start > 1) range.push(1, -1);          // 1 ...
              for (let p = start; p <= end; p++) range.push(p);
              if (end < totalPages) range.push(-2, totalPages); // ... last
              return range.map((p, i) =>
                p < 0 ? (
                  <span key={p} className="px-1 text-gray-300 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                      p === currentPage ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    {p}
                  </button>
                )
              );
            })()}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} className="text-gray-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── System Tab ─────────────────────────────────────────────────────────────────

function SystemTab() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<SystemSetting[]>("/settings").then((res) => {
      if (res.success && res.data) setSettings(res.data);
      setLoading(false);
    });
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const saveAll = async () => {
    setSaving(true);
    setSaved(false);
    for (const s of settings) {
      await api.put(`/settings/${s.key}`, { value: s.value });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-semibold text-gray-800">การตั้งค่าระบบ</h2>
      {loading ? (
        <Loader2 size={20} className="animate-spin text-gray-300" />
      ) : (
        <div className="space-y-3">
          {settings.map((s) => (
            <div key={s.key}>
              <label className="text-xs text-gray-500 mb-1 block">{s.description ?? s.key}</label>
              <input
                value={s.value ?? ""}
                onChange={(e) => updateSetting(s.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}
          {saved && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
              <CheckCircle2 size={14} /> บันทึกสำเร็จ
            </div>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            บันทึกทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}

// ── Backup Tab ─────────────────────────────────────────────────────────────────

function BackupTab() {
  const [backing, setBacking] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [backups, setBackups] = useState<Array<{ id: string; filename: string; status: string; fileSizeBytes: number | null; createdAt: string }>>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);

  useEffect(() => {
    api.get<typeof backups>("/backups").then((res) => {
      if (res.success && res.data) setBackups(res.data);
      setLoadingBackups(false);
    });
  }, []);

  const runBackup = async () => {
    setBacking(true);
    setMsg(null);
    const res = await api.post("/backups");
    setBacking(false);
    if (res.success) {
      setMsg({ type: "success", text: "สำรองข้อมูลสำเร็จ" });
      // Refresh list
      api.get<typeof backups>("/backups").then((r) => {
        if (r.success && r.data) setBackups(r.data);
      });
    } else {
      setMsg({ type: "error", text: res.message ?? "เกิดข้อผิดพลาด" });
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-semibold text-gray-800">สำรองข้อมูล</h2>
      <p className="text-sm text-gray-500">
        สำรองฐานข้อมูลทั้งหมด รวมถึงข้อมูลผู้ป่วย เหตุฉุกเฉิน และยา
      </p>

      {msg && (
        <div className={cn("flex items-center gap-2 text-xs rounded-xl px-3 py-2",
          msg.type === "success" ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
        )}>
          <CheckCircle2 size={14} /> {msg.text}
        </div>
      )}

      <button
        onClick={runBackup}
        disabled={backing}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        {backing ? (
          <><Loader2 size={15} className="animate-spin" />กำลังสำรองข้อมูล...</>
        ) : (
          <><Database size={15} />สำรองข้อมูลตอนนี้</>
        )}
      </button>

      {/* Backup history */}
      <div className="mt-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ประวัติการสำรอง</h3>
        {loadingBackups ? (
          <Loader2 size={16} className="animate-spin text-gray-300" />
        ) : backups.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีประวัติ</p>
        ) : (
          <div className="space-y-2">
            {backups.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl text-sm">
                <Database size={14} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 truncate text-xs">{b.filename}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(b.createdAt).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{formatSize(b.fileSizeBytes)}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  b.status === "completed" ? "bg-green-100 text-green-700" :
                  b.status === "failed" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"
                )}>
                  {b.status === "completed" ? "สำเร็จ" : b.status === "failed" ? "ล้มเหลว" : "กำลังสำรอง..."}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

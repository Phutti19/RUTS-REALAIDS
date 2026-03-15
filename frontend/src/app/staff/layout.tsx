"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Siren,
  Users,
  Pill,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { Notification } from "@/types";

const NAV_ITEMS = [
  { href: "/staff/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/staff/emergency", label: "เหตุฉุกเฉิน", icon: Siren },
  { href: "/staff/patients", label: "ผู้ป่วย", icon: Users },
  { href: "/staff/medicines", label: "คลังยา", icon: Pill },
  { href: "/staff/appointments", label: "นัดหมาย", icon: Calendar },
  { href: "/staff/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/staff/settings", label: "ตั้งค่า", icon: Settings },
];

const TYPE_ICON: Record<string, string> = {
  emergency: "🚨",
  appointment: "📅",
  stock_alert: "💊",
  expiry_alert: "⚠️",
  system: "🔔",
};

const TYPE_HREF: Record<string, (n: Notification) => string> = {
  emergency: () => "/staff/emergency",
  appointment: () => "/staff/appointments",
  stock_alert: (n) => n.referenceId ? `/staff/medicines/${n.referenceId}` : "/staff/medicines?tab=low",
  expiry_alert: () => "/staff/medicines?tab=expiring",
  system: () => "/staff/settings",
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infirmaryName, setInfirmaryName] = useState("ห้องพยาบาล มทร.ศรีวิชัย");

  // Notification dropdown
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    import("@/lib/api").then(({ api }) => {
      api.get<{ name: string | null }>("/settings/infirmary").then((res) => {
        if (res.success && res.data?.name) setInfirmaryName(res.data.name);
      });
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    import("@/lib/api").then(({ api }) => {
      api.get<Notification[]>("/notifications?limit=20").then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setNotifications(res.data as unknown as Notification[]);
        }
      });
    });
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role === "student") {
      router.replace("/student/dashboard");
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleNotifClick = async (n: Notification) => {
    setNotifOpen(false);
    if (!n.isRead) {
      import("@/lib/api").then(({ api }) => {
        api.patch(`/notifications/${n.id}/read`);
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      });
    }
    const href = TYPE_HREF[n.type]?.(n) ?? "/staff/notifications";
    router.push(href);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const previewNotifs = notifications.slice(0, 8);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page h-screen overflow-hidden bg-gray-100 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 text-white flex flex-col sidebar-enter print:hidden",
          "transform transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:flex"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40">
              <Siren size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">RUTS REALAIDS</p>
              <p className="text-xs text-blue-300">{infirmaryName}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 relative border-l-4",
                  isActive
                    ? "bg-blue-800 text-white border-blue-300"
                    : "text-blue-200 hover:bg-blue-800/60 hover:text-white border-transparent hover:translate-x-1"
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-blue-800">
          <div className="text-xs text-blue-300 mb-1">
            {user?.role === "admin" ? "ผู้ดูแลระบบ" : "เจ้าหน้าที่"}
          </div>
          <div className="text-sm font-medium truncate">
            {user?.firstName} {user?.lastName}
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center gap-2 text-xs text-blue-300 hover:text-white hover:gap-3 transition-all duration-200"
          >
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="header-enter h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm print:hidden">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />

            {/* Notification bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 relative transition-colors"
              >
                <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-1rem))] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">การแจ้งเตือน</p>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount} ใหม่
                      </span>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                    {previewNotifs.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell size={24} className="mx-auto text-gray-200 mb-2" />
                        <p className="text-xs text-gray-400">ไม่มีการแจ้งเตือน</p>
                      </div>
                    ) : (
                      previewNotifs.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={cn(
                            "w-full flex gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                            !n.isRead && "bg-blue-50/60 dark:bg-blue-950/20"
                          )}
                        >
                          <span className="text-base flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs font-semibold truncate", !n.isRead ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400")}>
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-gray-300 mt-0.5">{formatDateTime(n.createdAt)}</p>
                          </div>
                          {!n.isRead && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <Link
                    href="/staff/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-center gap-1 px-4 py-3 text-xs text-blue-600 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 border-t border-gray-100 dark:border-gray-700 transition-colors"
                  >
                    ดูทั้งหมด <ChevronRight size={13} />
                  </Link>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-200">
              {user?.firstName} {user?.lastName}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-enter flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}

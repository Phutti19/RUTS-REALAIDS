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
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { href: "/staff/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/staff/emergency", label: "เหตุฉุกเฉิน", icon: Siren },
  { href: "/staff/patients", label: "ผู้ป่วย", icon: Users },
  { href: "/staff/medicines", label: "คลังยา", icon: Pill },
  { href: "/staff/appointments", label: "นัดหมาย", icon: Calendar },
  { href: "/staff/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/staff/settings", label: "ตั้งค่า", icon: Settings },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect if not staff/admin after auth resolves
  useEffect(() => {
    if (!isLoading && user && user.role === "student") {
      router.replace("/student/dashboard");
    }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 text-white flex flex-col transform transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:flex"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <Siren size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">RUTS REALAIDS</p>
              <p className="text-xs text-blue-300">ห้องพยาบาล มทร.ศรีวิชัย</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                  isActive
                    ? "bg-blue-800 text-white border-r-4 border-blue-400"
                    : "text-blue-200 hover:bg-blue-800 hover:text-white"
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
            className="mt-3 w-full flex items-center gap-2 text-xs text-blue-300 hover:text-white transition-colors"
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/staff/notifications"
              className="p-2 rounded-md hover:bg-gray-100 relative"
            >
              <Bell size={20} className="text-gray-600" />
            </Link>
            <div className="text-sm text-gray-700">
              {user?.firstName} {user?.lastName}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}

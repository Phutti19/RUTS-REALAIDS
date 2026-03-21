"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { href: "/student/dashboard", label: "หน้าหลัก", icon: Home },
  { href: "/student/appointments", label: "นัดหมาย", icon: Calendar },
  { href: "/student/profile", label: "โปรไฟล์", icon: User },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== "student") {
      router.replace("/staff/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page min-h-[100dvh] bg-slate-200 dark:bg-gray-950 student-portal-wrapper">
      {/* On tablet+: the content column appears as a centered card */}
      <main className="page-enter max-w-md sm:max-w-xl md:max-w-2xl mx-auto bg-slate-100 dark:bg-gray-900 min-h-[100dvh] sm:shadow-2xl sm:shadow-black/10">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-slide-up fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 student-bottom-nav">
        <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto flex items-center">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-sm transition-all duration-200 relative",
                  isActive
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                {/* Active top indicator */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
                )}
                <Icon
                  size={22}
                  className={cn(
                    "transition-transform duration-200",
                    isActive
                      ? "stroke-blue-700 dark:stroke-blue-400 scale-110"
                      : "stroke-gray-500 dark:stroke-gray-400"
                  )}
                />
                <span className="font-medium text-xs">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

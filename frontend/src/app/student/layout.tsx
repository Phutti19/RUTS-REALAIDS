"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

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

  // Redirect if not a student after auth resolves
  useEffect(() => {
    if (!isLoading && user && user.role !== "student") {
      router.replace("/staff/dashboard");
    }
  }, [isLoading, user, router]);

  return (
    <div className="portal-page min-h-screen bg-gray-200 dark:bg-gray-950 pb-20">
      {/* On tablet+: the content column appears as a centered "phone app" card */}
      <main className="page-enter max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen sm:shadow-2xl sm:shadow-black/10">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-slide-up fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-md mx-auto flex items-center">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs transition-all duration-200 relative",
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                {/* Active top indicator */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full" />
                )}
                <Icon
                  size={22}
                  className={cn(
                    "transition-transform duration-200",
                    isActive
                      ? "stroke-blue-600 scale-110"
                      : "stroke-gray-500 dark:stroke-gray-400"
                  )}
                />
                <span>{label}</span>
              </Link>
            );
          })}
          <div className="px-2">
            <ThemeToggle size={18} />
          </div>
        </div>
      </nav>
    </div>
  );
}

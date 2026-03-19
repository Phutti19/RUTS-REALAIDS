"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md">
      ⚠ ไม่มีการเชื่อมต่ออินเทอร์เน็ต — บางฟีเจอร์อาจใช้งานไม่ได้
    </div>
  );
}

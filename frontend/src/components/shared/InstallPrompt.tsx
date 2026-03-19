"use client";

import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay so user has time to explore
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("[PWA] Install prompt outcome:", outcome);
    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9998] mx-auto max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-96.png" alt="RUTS REALAIDS" className="h-12 w-12 rounded-lg" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">ติดตั้ง RUTS REALAIDS</p>
          <p className="mt-0.5 text-xs text-gray-500">
            เพิ่มลงหน้าจอหลักเพื่อเข้าถึงได้เร็วขึ้น
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          ติดตั้ง
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
        >
          ไม่ใช่ตอนนี้
        </button>
      </div>
    </div>
  );
}

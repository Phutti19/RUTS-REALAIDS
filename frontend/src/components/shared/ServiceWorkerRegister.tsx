"use client";

import { useEffect, useState, useCallback } from "react";

export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] registered", reg.scope);

        // Check for waiting worker on load
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowUpdate(true);
        }

        // Listen for new worker
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });
      })
      .catch((err) => console.error("[SW] registration failed", err));

    // Reload when new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      setShowUpdate(false);
    }
  }, [waitingWorker]);

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md rounded-lg bg-blue-600 p-4 text-white shadow-lg">
      <p className="text-sm font-medium">มีเวอร์ชันใหม่พร้อมใช้งาน</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleUpdate}
          className="rounded bg-white px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          อัปเดตเลย
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="rounded px-3 py-1.5 text-sm text-blue-100 hover:text-white"
        >
          ภายหลัง
        </button>
      </div>
    </div>
  );
}

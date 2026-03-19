"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;
    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      // Send subscription to backend — matches SubscribePushDto
      const json = subscription.toJSON();
      await api.post("/push-subscriptions", {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        // Notify backend first — DELETE /push-subscriptions?endpoint=...
        await api.delete(
          `/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`
        );
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("[Push] Unsubscribe failed:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}

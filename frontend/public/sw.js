const CACHE_VERSION = "v2";
const STATIC_CACHE = `ruts-realaids-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ruts-realaids-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/login",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install — precache static assets + offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Don't skipWaiting — let the app control when to activate
});

// Activate — clean old caches + claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for navigations, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip API requests — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests — network first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Static assets — cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      tag: data.tag ?? "ruts-notification",
      data: data,
      vibrate: [200, 100, 200],
      actions: data.actions ?? [],
    })
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// Listen for skip waiting message from the app
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// FIX: rewritten for the React single-page app. API calls are never cached, page navigations
// fall back to the cached app shell (index.html) and then to offline.html.
const CACHE_NAME = "fixnow-shell-v5";
const APP_SHELL = [
    "/",
    "/index.html",
    "/offline.html",
    "/manifest.webmanifest",
    "/assets/fixnow.png",
    "/assets/fixnow-192.png",
    "/assets/fixnow-512.png",
    "/assets/technicains-illustrations.png",
    "/assets/fixnow-maskot.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            const response = await fetch(request);
            if (response.ok) cache.put(request, response.clone()).catch(() => {});
            return response;
        } catch (error) {
            const cached = await cache.match(request);
            if (cached) return cached;
            if (request.mode === "navigate") {
                return (await cache.match("/index.html")) || (await cache.match("/offline.html"));
            }
            throw error;
        }
    })());
});

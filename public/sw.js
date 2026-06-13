// Kill-switch service worker. Replaces the previous Workbox/vite-plugin-pwa
// app-shell SW so installed clients evict stale caches and unregister.
// Cache Storage is origin-scoped; only delete this registration's own caches
// so unrelated workers (e.g. Firebase Messaging) are left alone.
function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|supabase-api/.test(name);
  return hasWorkboxBucket;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const toDelete = cacheNames.filter(isWorkboxCacheForThisRegistration);
        await Promise.allSettled(toDelete.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

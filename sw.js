/* Simple SW for offline cache (GitHub Pages friendly) */
const CACHE = "nutrisync-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./app.html",
  "./css/styles.css",
  "./js/auth.js",
  "./js/app.js",
  "./js/firebase.js",
  "./js/firebase-config.js",
  "./js/storage.js",
  "./js/notifications.js",
  "./js/ui.js",
  "./manifest.webmanifest",
  "./assets/favicon-48.png",
  "./js/verify.js",
  "./js/settings.js",
  "./js/profile-setup.js",
  "./verify.html",
  "./settings.html",
  "./profile.html",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/avatar-fallback.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(()=>cached))
  );
});

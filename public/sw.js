// Offline support for stage use.
//
// - Build assets (/_next/static, pdf.js worker, icon): cache-first. Their URLs
//   are content-hashed, so a cached copy is never stale.
// - Page navigations: network-first; the latest good copy of each app page is
//   kept and served when the network is gone, else the /offline page.
// - Vercel Blob PDFs: cache-first (each upload gets a unique URL).
// - Everything else (API, RSC payloads, auth) goes straight to the network. A
//   failed RSC fetch makes Next.js fall back to a full navigation, which then
//   lands in the navigation handler above.
//
// The page drives precaching with postMessage: {type: "sync", pages, pdfs}
// stores the pages/PDFs the user marked "available offline" (and drops ones
// no longer marked), {type: "list"} returns that manifest for the /offline
// page, and {type: "clear"} wipes user content (used on sign-out).

const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const PDF_CACHE = `pdfs-${VERSION}`;
const META_CACHE = `meta-${VERSION}`;
const MANIFEST_KEY = "/__offline-manifest";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/pdf.worker.min.mjs", "/icon.svg"];

// Pages worth keeping a copy of: the ones that render their content on the
// server (the library itself loads over the API and is useless offline).
const CACHEABLE_PAGE = /^\/(documents|prompter|scores|pdf|setlists)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // The offline page needs its JS/CSS too, not just its HTML, or it
      // would crash with a ChunkLoadError exactly when it's needed.
      await precachePage(cache, cache, OFFLINE_URL);
      await cache.addAll(PRECACHE.filter((path) => path !== OFFLINE_URL));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, PAGES_CACHE, PDF_CACHE, META_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

function isBlobPdf(url) {
  return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request, url) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected && CACHEABLE_PAGE.test(url.pathname)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const hit =
      (await cache.match(request, { ignoreVary: true })) ||
      (await cache.match(url.pathname, { ignoreVary: true, ignoreSearch: true }));
    if (hit) return hit;
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (isBlobPdf(url)) {
    event.respondWith(cacheFirst(PDF_CACHE, request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || (PRECACHE.includes(url.pathname) && url.pathname !== OFFLINE_URL)) {
    event.respondWith(cacheFirst(STATIC_CACHE, request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
  }
});

async function readManifest() {
  const cache = await caches.open(META_CACHE);
  const hit = await cache.match(MANIFEST_KEY);
  return hit ? hit.json() : { pages: [], pdfs: [], syncedAt: null };
}

async function writeManifest(manifest) {
  const cache = await caches.open(META_CACHE);
  await cache.put(MANIFEST_KEY, new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/json" } }));
}

// Caches a page plus the build assets its HTML references, so a page never
// visited on this device still boots offline.
async function precachePage(pagesCache, staticCache, path) {
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok || response.redirected) throw new Error(`${path}: HTTP ${response.status}`);
  const html = await response.clone().text();
  await pagesCache.put(path, response);
  const assets = new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || []);
  await Promise.all(
    [...assets].map(async (asset) => {
      if (await staticCache.match(asset)) return;
      const res = await fetch(asset);
      if (res.ok) await staticCache.put(asset, res);
    }),
  );
}

async function sync({ pages = [], pdfs = [] }) {
  const [pagesCache, staticCache, pdfCache] = await Promise.all([
    caches.open(PAGES_CACHE),
    caches.open(STATIC_CACHE),
    caches.open(PDF_CACHE),
  ]);
  const previous = await readManifest();
  const failed = [];

  // Forget what is no longer marked (other visited pages stay, as usual).
  const keepPages = new Set(pages.map((p) => p.url));
  const keepPdfs = new Set(pdfs);
  await Promise.all([
    ...previous.pages.filter((p) => !keepPages.has(p.url)).map((p) => pagesCache.delete(p.url)),
    ...previous.pdfs.filter((u) => !keepPdfs.has(u)).map((u) => pdfCache.delete(u)),
  ]);

  for (const page of pages) {
    try {
      await precachePage(pagesCache, staticCache, page.url);
    } catch {
      failed.push(page.url);
    }
  }
  for (const pdf of pdfs) {
    try {
      if (await pdfCache.match(pdf)) continue;
      const res = await fetch(pdf, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await pdfCache.put(pdf, res);
    } catch {
      failed.push(pdf);
    }
  }

  await writeManifest({ pages, pdfs, syncedAt: new Date().toISOString() });
  return { ok: failed.length === 0, failed, pages: pages.length, pdfs: pdfs.length };
}

async function clearUserContent() {
  await Promise.all([PAGES_CACHE, PDF_CACHE, META_CACHE].map((name) => caches.delete(name)));
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const reply = (payload) => event.ports[0]?.postMessage(payload);
  const run =
    data.type === "sync"
      ? sync(data)
      : data.type === "list"
        ? readManifest()
        : data.type === "clear"
          ? clearUserContent().then(() => ({ ok: true }))
          : null;
  if (!run) return;
  event.waitUntil(run.then(reply, (error) => reply({ ok: false, error: String(error) })));
});

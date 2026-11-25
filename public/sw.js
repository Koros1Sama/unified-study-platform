// ==============================================================================
// المنصة التعليمية الموحدة — عامل الخدمة للأوفلاين وتفريغ الكاش (PWA Service Worker)
// Two-Tier + Protected Offline Pack Caches · Same-Origin + Cloudflare R2 CORS Safe
// ==============================================================================

const RUNTIME_PREFIX = "usp-runtime-";
const OFFLINE_PREFIX = "usp-offline-";
const CORE = "usp-core-v31";
const RUNTIME = "usp-runtime-v31";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./icons/icon.svg",
  "./icons/icon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./data/subjects.json"
];

function isHtmlResponse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  return ct.includes("text/html");
}

function isAllowedR2SlideUrl(url) {
  return (
    url.protocol === "https:" &&
    url.hostname.endsWith(".r2.dev") &&
    url.pathname.includes("/slides/")
  );
}

function getScopedIndexUrl() {
  return new URL("./index.html", self.registration.scope).href;
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CORE)
      .then((c) => c.addAll(CORE_ASSETS))
      .catch((err) => console.warn("PWA: Could not pre-cache all core assets", err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const targetRuntime = await caches.open(RUNTIME);

      // ترحيل الشرائح (المحلية و R2) والأيقونات من كاش التشغيل السابق دون المساس بحزم الأوفلاين
      for (const k of keys) {
        if (k.startsWith(RUNTIME_PREFIX) && k !== RUNTIME) {
          try {
            const oldC = await caches.open(k);
            const oldReqs = await oldC.keys();
            const slideReqs = oldReqs.filter((req) => {
              const u = new URL(req.url);
              return u.pathname.includes("/slides/") || u.pathname.includes("/icons/");
            });

            for (let b = 0; b < slideReqs.length; b += 10) {
              const batch = slideReqs.slice(b, b + 10);
              await Promise.all(
                batch.map(async (req) => {
                  try {
                    const res = await oldC.match(req);
                    if (res) await targetRuntime.put(req, res);
                  } catch {
                    // تجاهل الملف الفردي التالف أثناء الترحيل
                  }
                })
              );
            }
          } catch {
            // تجاهل تعذر قراءة كاش قديم
          }
        }
      }

      // حذف الكاشات القديمة مع حماية كاشات حزم الأوفلاين الدائمة (usp-offline-*)
      await Promise.all(
        keys.map((k) => {
          if (k !== CORE && k !== RUNTIME && !k.startsWith(OFFLINE_PREFIX)) {
            return caches.delete(k);
          }
          return null;
        })
      );

      await self.clients.claim();
    })()
  );
});

async function matchAnyCache(req, ignoreSearch = false) {
  const direct = await caches.match(req, { ignoreSearch });
  if (direct) return direct;
  if (!ignoreSearch) {
    return caches.match(req, { ignoreSearch: true });
  }
  return undefined;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isR2Slide = isAllowedR2SlideUrl(url);

  // عدم اعتراض الطلبات الخارجية عدا سلايدات Cloudflare R2 المعتمدة
  if (url.origin !== self.location.origin && !isR2Slide) return;

  // 0. طلبات Cloudflare R2 (السلايدات الأصلية والمترجمة + manifest الترجمة)
  if (isR2Slide) {
    if (url.pathname.endsWith("/translation-manifest.json")) {
      e.respondWith(
        fetch(new Request(req.url, { mode: "cors", credentials: "omit" }))
          .then((res) => {
            if (res.ok && res.type !== "opaque" && !isHtmlResponse(res)) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req.url, copy));
            }
            return res;
          })
          .catch(async () => {
            const cached = await matchAnyCache(req.url, true);
            return cached || new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } });
          })
      );
      return;
    }

    const isVersionedTranslated = url.pathname.endsWith(".ar.webp") && url.searchParams.has("rv");
    e.respondWith(
      caches.match(req.url, { ignoreSearch: !isVersionedTranslated }).then((cached) => {
        if (cached) return cached;
        return fetch(new Request(req.url, { mode: "cors", credentials: "omit" }))
          .then((res) => {
            if (res.ok && res.type !== "opaque" && !isHtmlResponse(res)) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req.url, copy));
            }
            return res;
          })
          .catch(async () => {
            // إذا انقطع الإنترنت ولم تتطابق نسخة rv بالضبط، نرجع لأي نسخة مخزنة مسبقاً
            const fallback = await matchAnyCache(req.url, true);
            return fallback || new Response("", { status: 503, statusText: "Offline" });
          });
      })
    );
    return;
  }

  // 1. طلبات التنقل (صفحات الـ SPA)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CORE).then((c) => c.put(getScopedIndexUrl(), copy));
          }
          return res;
        })
        .catch(async () => {
          const match = await matchAnyCache(req, true);
          if (match) return match;
          const fallback = await caches.match(getScopedIndexUrl(), { ignoreSearch: true });
          return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  // 2. ملفات البيانات (/data/): الشبكة أولاً مع مطابقة كاش تتجاهل معامل ?v=...
  if (url.pathname.includes("/data/")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !isHtmlResponse(res)) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await matchAnyCache(req, true);
          return cached || new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } });
        })
    );
    return;
  }

  // 3. السلايدات وصفحات الكتب والوسائط (/slides/, /assets/, webp, png, woff2)
  if (
    url.pathname.includes("/slides/") ||
    url.pathname.includes("/assets/") ||
    /\.(webp|png|jpg|jpeg|svg|woff2)$/i.test(url.pathname)
  ) {
    e.respondWith(
      matchAnyCache(req, true).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res.ok && !isHtmlResponse(res)) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => new Response("", { status: 503, statusText: "Offline" }));
      })
    );
    return;
  }

  // 4. بقية أصول نفس النطاق
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CORE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await matchAnyCache(req, true);
        return cached || new Response("", { status: 503, statusText: "Offline" });
      })
  );
});

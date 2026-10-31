// ==============================================================================
// المنصة التعليمية الموحدة — عامل الخدمة للأوفلاين وتفريغ الكاش (PWA Service Worker)
// Standard Two-Tier Architecture · Cache-Busting · Zero Emojis (Rule 1 & Rule 7)
// ==============================================================================

const CORE_PREFIX = "usp-core-";
const RUNTIME_PREFIX = "usp-runtime-";
const CORE = "usp-core-v3";
const RUNTIME = "usp-runtime-v3";

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

// حدث التثبيت: تحميل الأصول الأساسية فورياً وتخطي الانتظار
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CORE)
      .then((c) => c.addAll(CORE_ASSETS))
      .catch((err) => console.warn("PWA: Could not pre-cache all core assets", err))
      .then(() => self.skipWaiting())
  );
});

// حدث التنشيط: ترحيل الشرائح وحذف الكاش القديم
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const targetRuntime = await caches.open(RUNTIME);

      // ترحيل شرائح الكاش القديم بدفعات متوازية من 10 ملفات
      for (const k of keys) {
        if (k.startsWith(RUNTIME_PREFIX) && k !== RUNTIME) {
          try {
            const oldC = await caches.open(k);
            const oldReqs = await oldC.keys();
            const slideReqs = oldReqs.filter((req) => {
              const u = new URL(req.url);
              return u.pathname.includes("/slides/") || u.pathname.includes("/data/");
            });

            for (let b = 0; b < slideReqs.length; b += 10) {
              const batch = slideReqs.slice(b, b + 10);
              await Promise.all(
                batch.map(async (req) => {
                  try {
                    const res = await oldC.match(req);
                    if (res) await targetRuntime.put(req, res);
                  } catch (_) {}
                })
              );
            }
          } catch (_) {}
        }
      }

      // حذف أي كاشات قديمة
      await Promise.all(
        keys.map((k) => {
          if (k !== CORE && k !== RUNTIME) {
            return caches.delete(k);
          }
          return null;
        })
      );

      // المطالبة الفورية بالعملاء
      await self.clients.claim();
    })()
  );
});

// استراتيجيات الجلب والشبكة (Fetch Strategies):
// 1. طلبات التنقل (HTML): Network-First مع الرجوع لـ /index.html أوفلاين
// 2. ملفات البيانات (/data/): Network-First لضمان أحدث التحديثات مع العمل أوفلاين
// 3. السلايدات والوسائط (/slides/, /assets/): Cache-First للسرعة وتوفير البيانات
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // تجاهل الطلبات غير الـ GET
  if (req.method !== "GET") return;

  // 1. طلبات التنقل (صفحات الـ SPA)
  if (req.mode === "navigate") {
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
          const match = await caches.match(req);
          if (match) return match;
          const fallback = await caches.match("/index.html");
          return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  // 2. ملفات البيانات (/data/) والتهيئة
  if (url.pathname.includes("/data/")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3. السلايدات والوسائط والأصول الثابتة (/slides/, /assets/, fonts)
  if (url.pathname.includes("/slides/") || url.pathname.includes("/assets/") || url.pathname.endsWith(".png") || url.pathname.endsWith(".woff2")) {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // 4. بقية الطلبات: الشبكة أولاً مع بديل الكاش
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CORE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

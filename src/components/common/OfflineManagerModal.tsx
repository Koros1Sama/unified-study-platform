// ==============================================================================
// المنصة التعليمية الموحدة — محرك ومدير التحميل الأوفلاين المقاوم لانقطاع الشبكات
// Selective EN / AR / Both Slide Packs · Recognizes & Promotes Manually-Viewed Slides
// Pause / Interrupt / Resume · 4 Parallel Workers · CORS R2 Safe · Zero Emojis
// ==============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Icons } from "../icons/SvgIcons";
import { resolveAssetUrl, type SubjectBundle } from "../../lib/dataService";
import {
  countTranslatedSlidesForList,
  getTranslationManifestUrl,
  isSlideTranslationAvailable,
  loadTranslationManifest,
  resolveTranslatedSlideUrl,
  type SlideTranslationManifest
} from "../../lib/slideTranslation";
import type { OfflineSlideLangMode } from "../../types";

export interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubjectCode: string;
  bundle: SubjectBundle | null;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  currentSubjectCode,
  bundle
}) => {
  const [langMode, setLangMode] = useState<OfflineSlideLangMode>(() => {
    const saved = localStorage.getItem("unified_offline_lang_mode") as OfflineSlideLangMode | null;
    if (saved === "en" || saved === "ar" || saved === "both") return saved;
    return "en";
  });
  const [manifest, setManifest] = useState<SlideTranslationManifest | null>(null);
  const [totalFiles, setTotalFiles] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [fromBrowseCount, setFromBrowseCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [statusText, setStatusText] = useState("فحص حالة التخزين المحلي...");
  const [errorCount, setErrorCount] = useState(0);

  const abortRef = useRef<boolean>(false);
  const runIdRef = useRef<number>(0);
  const runControllerRef = useRef<AbortController | null>(null);
  const isDownloadingRef = useRef<boolean>(false);
  const prevSubjectRef = useRef<string>(currentSubjectCode);

  const arabicOnly = Boolean(bundle?.meta?.arabic_only || bundle?.meta?.source_language === "ar");

  const allSlideImageUrls = useMemo(() => {
    if (!bundle) return [];
    const urls: string[] = [];
    (bundle.slides || []).forEach((s) => {
      if (s.image_url) urls.push(s.image_url);
    });
    (bundle.lab?.slides || []).forEach((s) => {
      if (s.image_url) urls.push(s.image_url);
    });
    return Array.from(new Set(urls));
  }, [bundle]);

  const translatedAvailableCount = useMemo(
    () => countTranslatedSlidesForList(manifest, allSlideImageUrls, arabicOnly),
    [manifest, allSlideImageUrls, arabicOnly]
  );

  const effectiveLangMode: OfflineSlideLangMode =
    arabicOnly || translatedAvailableCount === 0 ? "en" : langMode;

  useEffect(() => {
    if (!isOpen || arabicOnly) return;
    let active = true;
    loadTranslationManifest().then((m) => {
      if (active && m) setManifest(m);
    });
    return () => {
      active = false;
    };
  }, [isOpen, arabicOnly, currentSubjectCode]);

  const handleLangModeChange = (next: OfflineSlideLangMode) => {
    if (isDownloadingRef.current) return;
    setLangMode(next);
    try {
      localStorage.setItem("unified_offline_lang_mode", next);
    } catch {
      // ignore storage errors
    }
  };

  const prefetchLazyViewChunks = async () => {
    const loaders: Array<() => Promise<unknown>> = [
      () => import("../questions/ExamSimulator"),
      () => import("../interactive/InteractiveStudioHost"),
      () => import("../interactive/ConceptStudios"),
      () => import("../glossary/GlossaryView"),
      () => import("../patterns/PatternsLabView"),
      () => import("../lab/LabAppendixView")
    ];
    await Promise.allSettled(loaders.map((load) => load()));
  };

  // جمع روابط الملفات المطلوبة حسب اختيار اللغة (EN / AR / Both)
  const getResourceList = useCallback(
    (mode: OfflineSlideLangMode): string[] => {
      if (!bundle) return [];
      const list: string[] = [
        resolveAssetUrl(`data/${currentSubjectCode}/bundle.json`),
        resolveAssetUrl(`data/subjects.json`)
      ];

      if (mode !== "en" && translatedAvailableCount > 0) {
        list.push(getTranslationManifestUrl());
      }

      for (const rawUrl of allSlideImageUrls) {
        const hasAr = isSlideTranslationAvailable(manifest, rawUrl, arabicOnly);
        if (mode === "en") {
          list.push(resolveAssetUrl(rawUrl));
        } else if (mode === "ar") {
          // إذا لم تتوفر ترجمة لشريحة معينة (مثلاً شريحة عربية أصلية)، نحتفظ بالأصلية حتى لا تظهر فارغة أوفلاين
          list.push(hasAr ? resolveTranslatedSlideUrl(rawUrl) : resolveAssetUrl(rawUrl));
        } else {
          list.push(resolveAssetUrl(rawUrl));
          if (hasAr) {
            list.push(resolveTranslatedSlideUrl(rawUrl));
          }
        }
      }

      return Array.from(new Set(list.filter(Boolean)));
    },
    [bundle, currentSubjectCode, allSlideImageUrls, manifest, arabicOnly, translatedAvailableCount]
  );

  // فحص الملفات المحفوظة مسبقاً عبر كافة الكاشات (حزمة الأوفلاين + التصفح اليدوي التدريجي)
  const checkCachedStatus = useCallback(async () => {
    if (isDownloadingRef.current) return;
    if (typeof window === "undefined" || !("caches" in window)) {
      setStatusText("المتصفح لا يدعم واجهة التخزين المؤقت Cache API");
      return;
    }

    const resources = getResourceList(effectiveLangMode);
    setTotalFiles(resources.length);

    try {
      const cacheName = `usp-offline-${currentSubjectCode}`;
      const offlineCache = await caches.open(cacheName);
      let inOffline = 0;
      let inRuntimeOnly = 0;

      for (const url of resources) {
        const offlineHit = await offlineCache.match(url, { ignoreSearch: true });
        if (offlineHit) {
          inOffline++;
          continue;
        }
        const anyHit = await caches.match(url, { ignoreSearch: true });
        if (anyHit) {
          inRuntimeOnly++;
        }
      }

      if (isDownloadingRef.current) return;
      const totalCached = inOffline + inRuntimeOnly;
      setCachedCount(totalCached);
      setFromBrowseCount(inRuntimeOnly);
      const pct = resources.length > 0 ? Math.round((totalCached / resources.length) * 100) : 0;
      setProgressPct(pct);

      if (totalCached === resources.length && resources.length > 0) {
        setStatusText("الحزمة المختارة محفوظة بالكامل للعمل أوفلاين بدون إنترنت 100%");
      } else if (totalCached > 0) {
        setStatusText(
          `محفوظ جزئياً: ${totalCached} من أصل ${resources.length} ملف — جاهز للاستئناف من حيث توقفت`
        );
      } else {
        setStatusText("الحزمة غير محفوظة أوفلاين بعد — انقر للتحميل والتخزين");
      }
    } catch {
      if (!isDownloadingRef.current) {
        setStatusText("تعذر الوصول إلى الكاش المحلي");
      }
    }
  }, [currentSubjectCode, effectiveLangMode, getResourceList]);

  useEffect(() => {
    if (prevSubjectRef.current !== currentSubjectCode) {
      prevSubjectRef.current = currentSubjectCode;
      if (isDownloadingRef.current) {
        runIdRef.current++;
        abortRef.current = true;
        runControllerRef.current?.abort();
        runControllerRef.current = null;
        isDownloadingRef.current = false;
        setIsDownloading(false);
        (window as Window & { __OFFLINE_DOWNLOADING__?: boolean }).__OFFLINE_DOWNLOADING__ = false;
      }
    }
    if (isOpen && !isDownloadingRef.current) {
      checkCachedStatus();
    }
  }, [isOpen, bundle, currentSubjectCode, effectiveLangMode, checkCachedStatus]);

  useEffect(() => {
    return () => {
      runIdRef.current++;
      abortRef.current = true;
      runControllerRef.current?.abort();
      runControllerRef.current = null;
      isDownloadingRef.current = false;
      (window as Window & { __OFFLINE_DOWNLOADING__?: boolean }).__OFFLINE_DOWNLOADING__ = false;
    };
  }, []);

  // جلب مرن مع إعادة المحاولة ودعم CORS النظيف لسيرفر Cloudflare R2
  const fetchWithRetry = async (
    url: string,
    runSignal: AbortSignal,
    myRunId: number,
    retries = 2,
    delay = 500
  ): Promise<Response> => {
    if (runSignal.aborted || abortRef.current || runIdRef.current !== myRunId) {
      throw new DOMException("Aborted", "AbortError");
    }

    const controller = new AbortController();
    const onRunAbort = () => controller.abort();
    runSignal.addEventListener("abort", onRunAbort, { once: true });
    const timer = window.setTimeout(() => controller.abort(), 15000);

    try {
      const isCrossOrigin =
        typeof window !== "undefined" &&
        /^https?:/i.test(url) &&
        new URL(url).origin !== window.location.origin;

      const res = await fetch(url, {
        signal: controller.signal,
        cache: "default",
        ...(isCrossOrigin ? { mode: "cors" as RequestMode, credentials: "omit" as RequestCredentials } : {})
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (runSignal.aborted || abortRef.current || runIdRef.current !== myRunId) {
        throw err;
      }
      if (retries > 0) {
        await new Promise((r) => window.setTimeout(r, delay));
        if (runSignal.aborted || abortRef.current || runIdRef.current !== myRunId) {
          throw err;
        }
        return fetchWithRetry(url, runSignal, myRunId, retries - 1, delay * 2);
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
      runSignal.removeEventListener("abort", onRunAbort);
    }
  };

  // بدء أو استئناف التحميل الذري الموحد مع ترقية الملفات المفتوحة يدوياً بدون إعادة تنزيل
  const startDownload = async () => {
    if (isDownloadingRef.current) return;
    const myRunId = ++runIdRef.current;
    const runController = new AbortController();
    runControllerRef.current = runController;
    abortRef.current = false;
    isDownloadingRef.current = true;
    setIsDownloading(true);
    setErrorCount(0);
    (window as Window & { __OFFLINE_DOWNLOADING__?: boolean }).__OFFLINE_DOWNLOADING__ = true;

    try {
      const resources = getResourceList(effectiveLangMode);
      setTotalFiles(resources.length);
      const cacheName = `usp-offline-${currentSubjectCode}`;
      const offlineCache = await caches.open(cacheName);
      if (runIdRef.current !== myRunId || runController.signal.aborted) return;

      // 1. فرز الملفات: تخطي المحفوظة في حزمة الأوفلاين + ترقية المحفوظة من التصفح اليدوي محلياً (0 بايت شبكة)
      const todo: string[] = [];
      let completed = 0;

      for (const url of resources) {
        if (runIdRef.current !== myRunId || runController.signal.aborted) return;
        const offlineHit = await offlineCache.match(url, { ignoreSearch: true });
        if (offlineHit) {
          completed++;
          continue;
        }
        const runtimeHit = await caches.match(url, { ignoreSearch: true });
        if (runtimeHit && runtimeHit.ok && runtimeHit.type !== "opaque") {
          try {
            await offlineCache.put(url, runtimeHit.clone());
            completed++;
            continue;
          } catch {
            // إذا تعذر النسخ المحلي نضيفه لقائمة التحميل
          }
        }
        todo.push(url);
      }

      setCachedCount(completed);
      setFromBrowseCount(0);
      setProgressPct(resources.length > 0 ? Math.round((completed / resources.length) * 100) : 0);

      if (todo.length === 0) {
        setStatusText("جاري تجهيز وحدات الأقسام للعمل أوفلاين...");
        await prefetchLazyViewChunks();
        if (runIdRef.current !== myRunId || runController.signal.aborted) return;
        setStatusText("جميع ملفات الحزمة مخزنة ومحدثة بالفعل!");
        setProgressPct(100);
        return;
      }

      let nextIdx = 0;
      let failed = 0;
      const concurrency = 4;

      const worker = async () => {
        while (!abortRef.current && !runController.signal.aborted && runIdRef.current === myRunId) {
          if (nextIdx >= todo.length) break;
          const currentUrl = todo[nextIdx++];

          try {
            const res = await fetchWithRetry(currentUrl, runController.signal, myRunId);
            if (runIdRef.current !== myRunId || abortRef.current || runController.signal.aborted) {
              break;
            }
            const ct = (res.headers.get("content-type") || "").toLowerCase();
            if (ct.includes("text/html")) {
              throw new Error("Unexpected HTML fallback");
            }
            await offlineCache.put(currentUrl, res);
            if (runIdRef.current !== myRunId || abortRef.current || runController.signal.aborted) {
              break;
            }
            completed++;
            setCachedCount(completed);
            const pct = Math.round((completed / resources.length) * 100);
            setProgressPct(pct);
            setStatusText(`جاري التحميل والتخزين: ${completed} من ${resources.length} (${pct}%)`);
          } catch {
            if (runIdRef.current !== myRunId || abortRef.current || runController.signal.aborted) {
              break;
            }
            failed++;
            setErrorCount(failed);
          }
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, todo.length) }, () => worker());
      await Promise.all(workers);

      if (runIdRef.current !== myRunId) return;

      if (abortRef.current || runController.signal.aborted) {
        setStatusText(`تم الإيقاف المؤقت عند ${completed} من ${resources.length} — يمكنك الاستئناف في أي وقت`);
      } else {
        await prefetchLazyViewChunks();
        if (runIdRef.current !== myRunId) return;
        if (failed > 0) {
          setStatusText(`اكتمل مع تعثر ${failed} ملف — انقر «استئناف التحميل المتبقي» لإعادة المحاولة`);
        } else {
          setStatusText("اكتمل التحميل بنجاح تام! المادة جاهزة للدراسة بدون إنترنت.");
          setProgressPct(100);
        }
      }
    } finally {
      if (runIdRef.current === myRunId) {
        runControllerRef.current = null;
        isDownloadingRef.current = false;
        setIsDownloading(false);
        (window as Window & { __OFFLINE_DOWNLOADING__?: boolean }).__OFFLINE_DOWNLOADING__ = false;
        window.dispatchEvent(new CustomEvent("offline-download-complete"));
      }
    }
  };

  const handlePause = () => {
    runIdRef.current++;
    abortRef.current = true;
    runControllerRef.current?.abort();
    runControllerRef.current = null;
    isDownloadingRef.current = false;
    setIsDownloading(false);
    (window as Window & { __OFFLINE_DOWNLOADING__?: boolean }).__OFFLINE_DOWNLOADING__ = false;
    setStatusText(`تم الإيقاف المؤقت عند ${cachedCount} من ${totalFiles} — يمكنك الاستئناف في أي وقت`);
  };

  const handleClearCache = async () => {
    if (!window.confirm("هل تريد بالتأكيد حذف الملفات المحفوظة أوفلاين لهذه المادة وتحرير المساحة؟")) return;
    const cacheName = `usp-offline-${currentSubjectCode}`;
    await caches.delete(cacheName);

    // تنظيف شرائح هذه المادة من كاش التشغيل التدريجي أيضاً حتى تتحرر المساحة فعلياً
    try {
      const allKeys = await caches.keys();
      const slidePrefix = `/slides/${currentSubjectCode}/`;
      await Promise.all(
        allKeys
          .filter((k) => k.startsWith("usp-runtime-"))
          .map(async (k) => {
            const c = await caches.open(k);
            const reqs = await c.keys();
            await Promise.all(
              reqs
                .filter((r) => r.url.includes(slidePrefix))
                .map((r) => c.delete(r))
            );
          })
      );
    } catch {
      // تجاهل أخطاء تنظيف كاش التشغيل
    }

    setCachedCount(0);
    setFromBrowseCount(0);
    setProgressPct(0);
    setErrorCount(0);
    setStatusText("تم إفراغ الكاش المحلي لهذه المادة بنجاح");
  };

  if (!isOpen) return null;

  const remainingToDownload = Math.max(0, totalFiles - cachedCount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="حزمة الدراسة بدون إنترنت"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 2600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        className="card usp-modal-card"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90dvh",
          overflowY: "auto",
          background: "var(--sf)",
          border: "1px solid var(--ln)",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.55)",
          borderRadius: "var(--r-l)",
          padding: "22px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icons.Download size={22} />
              <span>حزمة الدراسة بدون إنترنت (Offline Pack)</span>
            </h3>
            <p style={{ color: "var(--ink-m)", fontSize: "0.82rem", marginTop: "3px" }}>
              يدعم الإيقاف والاستئناف التلقائي ويتعرّف على الشرائح التي فتحتها يدوياً بدون إعادة تحميلها
            </p>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="إغلاق">
            <Icons.Cross size={18} />
          </button>
        </div>

        {/* اختيار لغة السلايدات المراد تحميلها أوفلاين */}
        {!arabicOnly && (
          <div className="offline-lang-box">
            <div className="offline-lang-head">
              <Icons.Translate size={14} />
              <span>اختر لغة صور السلايدات للتحميل المحلي:</span>
            </div>
            <div className="offline-lang-grid" role="group" aria-label="اختيار لغة التحميل الأوفلاين">
              {(
                [
                  { id: "en", label: "الإنجليزي فقط", sub: "الأصل فقط (أقل حجماً)", disabled: false },
                  {
                    id: "ar",
                    label: "العربي فقط",
                    sub: translatedAvailableCount > 0 ? `${translatedAvailableCount} شريحة مترجمة` : "بانتظار الترجمة السحابية",
                    disabled: translatedAvailableCount === 0
                  },
                  {
                    id: "both",
                    label: "الاثنين معاً",
                    sub: "يدعم EN + AR + Hover أوفلاين",
                    disabled: translatedAvailableCount === 0
                  }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`offline-lang-opt ${effectiveLangMode === opt.id ? "active" : ""}`}
                  disabled={isDownloading || opt.disabled}
                  onClick={() => handleLangModeChange(opt.id)}
                  aria-pressed={effectiveLangMode === opt.id}
                >
                  <strong>{opt.label}</strong>
                  <small>{opt.sub}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* صندوق الحالة ومؤشر التقدم الحتمي */}
        <div
          style={{
            background: "var(--sf2)",
            border: "1px solid var(--ln)",
            borderRadius: "var(--r-m)",
            padding: "18px",
            marginBottom: "20px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--ink)" }}>
              {statusText}
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--acc)", fontFamily: "var(--fm)", flexShrink: 0 }}>
              {progressPct}%
            </span>
          </div>

          <div
            style={{
              height: "10px",
              background: "var(--sf)",
              borderRadius: "var(--r-pill)",
              overflow: "hidden",
              border: "1px solid var(--ln)",
              marginBottom: "12px"
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: progressPct === 100 ? "var(--ok, #10b981)" : "var(--acc)",
                transition: "width 0.2s ease"
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", fontSize: "0.78rem", color: "var(--ink-m)" }}>
            <span>الملفات المحفوظة: {cachedCount} من أصل {totalFiles}</span>
            {fromBrowseCount > 0 && (
              <span style={{ color: "var(--ok, #10b981)" }}>
                منها {fromBrowseCount} محفوظة من تصفحك اليدوي (لن يُعاد تحميلها)
              </span>
            )}
            {errorCount > 0 && <span style={{ color: "var(--err, #ef4444)" }}>تعثر: {errorCount} ملفات</span>}
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {isDownloading ? (
            <button type="button" className="btn btn-sm" onClick={handlePause}>
              إيقاف التحميل مؤقتاً
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={startDownload}
              disabled={progressPct === 100 && totalFiles > 0}
            >
              <Icons.Download size={16} />
              <span>
                {cachedCount > 0 && remainingToDownload > 0
                  ? `استئناف التحميل المتبقي (${remainingToDownload})`
                  : "بدء التحميل الآن"}
              </span>
            </button>
          )}

          {cachedCount > 0 && !isDownloading && (
            <button type="button" className="btn btn-sm btn-danger" onClick={handleClearCache}>
              حذف الملفات المخزنة
            </button>
          )}

          <button type="button" className="btn btn-sm" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

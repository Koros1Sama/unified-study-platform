// ==============================================================================
// المنصة التعليمية الموحدة — محرك ومدير التحميل الأوفلاين المقاوم لانقطاع الشبكات
// Rock-Solid Offline Downloader Standard (Rule 7) · Atomic Queue · Monotonic Progress
// 4 Parallel Socket Workers · Exponential Backoff Retry · Zero Emojis Standard
// ==============================================================================

import React, { useState, useEffect, useRef } from "react";
import { Icons } from "../icons/SvgIcons";
import { resolveAssetUrl, type SubjectBundle } from "../../lib/dataService";

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
  const [totalFiles, setTotalFiles] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [statusText, setStatusText] = useState("فحص حالة التخزين المحلي...");
  const [errorCount, setErrorCount] = useState(0);
  const abortRef = useRef<boolean>(false);

  // جمع كافة روابط الملفات الخاصة بالمادة (السلايدات والبيانات)
  const getResourceList = (): string[] => {
    if (!bundle) return [];
    const list: string[] = [
      resolveAssetUrl(`data/${currentSubjectCode}/bundle.json`),
      resolveAssetUrl(`data/subjects.json`)
    ];

    (bundle.slides || []).forEach((s) => {
      if (s.image_url) list.push(resolveAssetUrl(s.image_url));
    });

    if (bundle.lab?.slides) {
      bundle.lab.slides.forEach((s) => {
        if (s.image_url) list.push(resolveAssetUrl(s.image_url));
      });
    }

    return Array.from(new Set(list));
  };

  // فحص الملفات المحفوظة مسبقاً في كاش المتصفح
  const checkCachedStatus = async () => {
    if (typeof window === "undefined" || !("caches" in window)) {
      setStatusText("المتصفح لا يدعم واجهة التخزين المؤقت Cache API");
      return;
    }

    const resources = getResourceList();
    setTotalFiles(resources.length);

    try {
      const cacheName = `usp-offline-${currentSubjectCode}`;
      const cache = await caches.open(cacheName);
      let count = 0;

      for (const url of resources) {
        const match = await cache.match(url);
        if (match) count++;
      }

      setCachedCount(count);
      const pct = resources.length > 0 ? Math.round((count / resources.length) * 100) : 0;
      setProgressPct(pct);

      if (count === resources.length && resources.length > 0) {
        setStatusText("المقرر محفوظ بالكامل للعمل أوفلاين بدون إنترنت 100%");
      } else if (count > 0) {
        setStatusText(`محفوظ جزئياً: ${count} من أصل ${resources.length} ملف`);
      } else {
        setStatusText("المقرر غير محفوظ أوفلاين بعد — انقر للتحميل والتخزين");
      }
    } catch (_) {
      setStatusText("تعذر الوصول إلى الكاش المحلي");
    }
  };

  useEffect(() => {
    if (isOpen) {
      abortRef.current = false;
      checkCachedStatus();
    }
  }, [isOpen, bundle, currentSubjectCode]);

  // جلب مرن مع إعادة المحاولة بتأخير متصاعد (Rule 7: fetchWithRetry)
  const fetchWithRetry = async (url: string, retries = 2, delay = 400): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000); // 12 ثانية مهلة
      const res = await fetch(url, { signal: controller.signal, cache: "reload" });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (retries > 0 && !abortRef.current) {
        await new Promise((r) => setTimeout(r, delay));
        return fetchWithRetry(url, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  // بدء التحميل الذري الموحد
  const startDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    abortRef.current = false;
    setErrorCount(0);

    const resources = getResourceList();
    const cacheName = `usp-offline-${currentSubjectCode}`;
    const cache = await caches.open(cacheName);

    // حصر الملفات المتبقية فقط التي لم يتم تحميلها بعد
    const todo: string[] = [];
    for (const url of resources) {
      const match = await cache.match(url);
      if (!match) todo.push(url);
    }

    if (todo.length === 0) {
      setIsDownloading(false);
      setStatusText("جميع الملفات مخزنة ومحدثة بالفعل!");
      setProgressPct(100);
      return;
    }

    let nextIdx = 0;
    let completed = cachedCount;
    let failed = 0;
    const concurrency = 4; // 4 خيوط متوازية لمنع اختناق السوكيت

    const worker = async () => {
      while (!abortRef.current) {
        if (nextIdx >= todo.length) break;
        const currentUrl = todo[nextIdx++];

        try {
          const res = await fetchWithRetry(currentUrl);
          await cache.put(currentUrl, res);
          completed++;
          setCachedCount(completed);
          const pct = Math.round((completed / resources.length) * 100);
          setProgressPct(pct);
          setStatusText(`جاري التحميل والتخزين: ${completed} من ${resources.length} (${pct}%)`);
        } catch (_) {
          failed++;
          setErrorCount(failed);
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, todo.length) }, () => worker());
    await Promise.all(workers);

    setIsDownloading(false);
    if (abortRef.current) {
      setStatusText("تم إيقاف التحميل مؤقتاً — يمكنك استئنافه في أي وقت");
    } else if (failed > 0) {
      setStatusText(`اكتمل التحميل مع تعثر ${failed} ملف — يمكنك النقر مجدداً للاستئناف`);
    } else {
      setStatusText("اكتمل التحميل بنجاح تام! المادة جاهزة للدراسة بدون إنترنت.");
      setProgressPct(100);
    }
  };

  const handlePause = () => {
    abortRef.current = true;
    setIsDownloading(false);
  };

  const handleClearCache = async () => {
    if (!window.confirm("هل تريد بالتأكيد حذف الملفات المحفوظة أوفلاين لهذه المادة وتحرير المساحة؟")) return;
    const cacheName = `usp-offline-${currentSubjectCode}`;
    await caches.delete(cacheName);
    setCachedCount(0);
    setProgressPct(0);
    setStatusText("تم إفراغ الكاش المحلي بنجاح");
  };

  if (!isOpen) return null;

  return (
    <div
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
        className="card"
        style={{
          width: "100%",
          maxWidth: "600px",
          background: "var(--sf)",
          border: "1px solid var(--ln)",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.55)",
          borderRadius: "var(--r-l)",
          padding: "24px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icons.Download size={22} />
              <span>حزمة الدراسة بدون إنترنت (Offline Pack)</span>
            </h3>
            <p style={{ color: "var(--ink-m)", fontSize: "0.82rem", marginTop: "3px" }}>
              تحميل وتخزين كافة السلايدات والبيانات محلياً في متصفحك للوصول إليها في حال انقطاع الشبكة
            </p>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="إغلاق">
            <Icons.Cross size={18} />
          </button>
        </div>

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--ink)" }}>
              {statusText}
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--acc)", fontFamily: "var(--fm)" }}>
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

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--ink-m)" }}>
            <span>الملفات المحفوظة: {cachedCount} من أصل {totalFiles}</span>
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
              <span>{cachedCount > 0 && progressPct < 100 ? "استئناف التحميل المتبقي" : "بدء التحميل الآن"}</span>
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

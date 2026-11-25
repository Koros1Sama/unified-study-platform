// ==============================================================================
// المنصة التعليمية الموحدة — عارض صورة السلايد بالترجمة الذكية (Smart / AR / EN)
// Center-Screen Scroll-Synced 20dvh Reading Band (Mobile) + Cursor-Tracked Band (Desktop)
// Tap-Outside Dismiss (Scroll-Safe) · Pure GPU clip-path · Zero Clutter · Zero Emojis
// ==============================================================================

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Icons } from "../icons/SvgIcons";
import { resolveAssetUrl } from "../../lib/dataService";
import { resolveTranslatedSlideUrl } from "../../lib/slideTranslation";
import type { SlideImageMode } from "../../types";

export interface TranslatableSlideImageProps {
  imageUrl: string;
  alt: string;
  mode: SlideImageMode;
  isFlipped: boolean;
  canTranslate: boolean;
  smartPaused?: boolean;
  onResumeSmart?: () => void;
  onToggleFlip?: () => void;
  stageStyle?: React.CSSProperties;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  draggable?: boolean;
  loading?: "lazy" | "eager";
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onErrorFallback?: React.ReactEventHandler<HTMLImageElement>;
  onOpenLightbox?: () => void;
  isLightbox?: boolean;
}

interface BandState {
  active: boolean;
  topPct: number;
  bottomPct: number;
  heightPct: number;
}

const INACTIVE_BAND: BandState = { active: false, topPct: 50, bottomPct: 50, heightPct: 0 };

// متتبع مشترك خفيف لموضع المؤشر وحالة الشاشة لتحديث شريط القراءة أثناء التمرير بـ 60fps
const sharedPointer = { x: -1, y: -1, insideViewport: false };
let globalPointerAttached = false;

function ensureGlobalPointerTracker() {
  if (globalPointerAttached || typeof window === "undefined") return;
  globalPointerAttached = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "mouse") {
        sharedPointer.x = e.clientX;
        sharedPointer.y = e.clientY;
        sharedPointer.insideViewport = true;
      }
    },
    { passive: true }
  );
  document.addEventListener(
    "mouseleave",
    () => {
      sharedPointer.insideViewport = false;
    },
    { passive: true }
  );
}

function isCoarsePointerDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export const TranslatableSlideImage: React.FC<TranslatableSlideImageProps> = ({
  imageUrl,
  alt,
  mode,
  isFlipped,
  canTranslate,
  smartPaused = false,
  onResumeSmart,
  onToggleFlip,
  stageStyle,
  imgClassName,
  imgStyle,
  draggable,
  loading = "lazy",
  onLoad,
  onErrorFallback,
  onOpenLightbox,
  isLightbox = false
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  const [arBroken, setArBroken] = useState(false);
  const [band, setBand] = useState<BandState>(INACTIVE_BAND);
  const [customTouchY, setCustomTouchY] = useState<number | null>(null);

  useEffect(() => {
    ensureGlobalPointerTracker();
  }, []);

  useEffect(() => {
    setArBroken(false);
    setBand(INACTIVE_BAND);
    setCustomTouchY(null);
  }, [imageUrl]);

  const enSrc = resolveAssetUrl(imageUrl);
  const arSrc = resolveTranslatedSlideUrl(imageUrl);
  const translationReady = canTranslate && Boolean(arSrc) && !arBroken;

  const showingFullAr =
    translationReady &&
    ((mode === "ar" && !isFlipped) || (mode === "en" && isFlipped));

  const isSmartMode = translationReady && mode === "hover";

  const computeBandAtClientY = useCallback((clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0 || rect.width <= 0) {
      setBand((prev) => (prev.active ? INACTIVE_BAND : prev));
      return;
    }

    const viewportH = window.visualViewport?.height || window.innerHeight || 720;
    // خُمس ارتفاع الشاشة (20dvh): نصفه فوق خط القراءة ونصفه تحته
    const halfBand = viewportH * 0.1;
    const relY = clientY - rect.top;

    // إذا كان الشريط خارج حدود الصورة تماماً لا نفعّل الطبقة
    if (relY + halfBand <= 0 || relY - halfBand >= rect.height) {
      setBand((prev) => (prev.active ? INACTIVE_BAND : prev));
      return;
    }

    const topPx = Math.max(0, Math.min(rect.height, relY - halfBand));
    const botEdge = Math.max(0, Math.min(rect.height, relY + halfBand));
    const heightPx = Math.max(0, botEdge - topPx);
    if (heightPx < 6) {
      setBand((prev) => (prev.active ? INACTIVE_BAND : prev));
      return;
    }

    // استخدام النسب المئوية يضمن تطابق الشريط بدقة تامة حتى مع التكبير (100% - 400%) في اللايت بوكس
    const topPct = (topPx / rect.height) * 100;
    const bottomPct = Math.max(0, ((rect.height - botEdge) / rect.height) * 100);
    const heightPct = Math.max(0, 100 - topPct - bottomPct);
    setBand({ active: true, topPct, bottomPct, heightPct });
  }, []);

  // تحديث شريط القراءة بوسط الشاشة بشكل متوازٍ مع التمرير (للجوال) أو متابع للمؤشر أثناء التمرير (للحاسوب)
  useEffect(() => {
    if (!isSmartMode || smartPaused) {
      setBand(INACTIVE_BAND);
      return;
    }

    let rafId = 0;

    const syncBand = () => {
      rafId = 0;
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.visualViewport?.height || window.innerHeight || 720;

      if (isCoarsePointerDevice()) {
        // على الجوال: المستطيل يتمركز في وسط الشاشة ويتحرك تلقائياً بالتوازي مع التمرير
        const targetY = customTouchY !== null ? customTouchY : viewportH * 0.5;
        computeBandAtClientY(targetY);
      } else if (
        sharedPointer.insideViewport &&
        sharedPointer.x >= rect.left &&
        sharedPointer.x <= rect.right &&
        sharedPointer.y >= rect.top &&
        sharedPointer.y <= rect.bottom
      ) {
        computeBandAtClientY(sharedPointer.y);
      } else {
        setBand((prev) => (prev.active ? INACTIVE_BAND : prev));
      }
    };

    const onScrollOrResize = () => {
      // بمجرد التمرير على الجوال يعود الشريط بسلاسة لوسط الشاشة ليوازي القراءة
      if (isCoarsePointerDevice() && customTouchY !== null) {
        setCustomTouchY(null);
      }
      if (!rafId) {
        rafId = window.requestAnimationFrame(syncBand);
      }
    };

    syncBand();
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isSmartMode, smartPaused, customTouchY, computeBandAtClientY]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSmartMode || e.pointerType !== "mouse") return;
    if (smartPaused) onResumeSmart?.();
    computeBandAtClientY(e.clientY);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSmartMode || e.pointerType !== "mouse") return;
    setBand(INACTIVE_BAND);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") {
      tapStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || !tapStartRef.current) return;
    const dx = e.clientX - tapStartRef.current.x;
    const dy = e.clientY - tapStartRef.current.y;
    tapStartRef.current = null;
    // لا نحتسب التمرير كضغطة أبداً
    if (Math.hypot(dx, dy) >= 10) return;

    if (isSmartMode) {
      if (smartPaused) {
        setCustomTouchY(null);
        onResumeSmart?.();
      } else {
        setCustomTouchY(e.clientY);
        computeBandAtClientY(e.clientY);
      }
    }
  };

  const handleWrapClick = () => {
    // على الجوال في وضع الترجمة الذكي، اللمسة مخصصة للشريط والتكبير يتم عبر الزر السفلي الصغير
    if (isSmartMode && isCoarsePointerDevice()) return;
    onOpenLightbox?.();
  };

  const primarySrc = showingFullAr ? arSrc : enSrc;

  return (
    <div
      ref={wrapRef}
      data-tsl-stage="true"
      className={`tsl-stage ${isSmartMode && !smartPaused ? "is-hover-mode" : ""} ${band.active ? "is-band-active" : ""} ${isLightbox ? "is-lightbox" : ""}`}
      style={stageStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleWrapClick}
    >
      <img
        src={primarySrc}
        alt={alt}
        className={imgClassName}
        style={imgStyle}
        draggable={draggable}
        loading={loading}
        decoding="async"
        crossOrigin={primarySrc.startsWith("http") ? "anonymous" : undefined}
        onLoad={onLoad}
        onError={(e) => {
          if (showingFullAr) {
            setArBroken(true);
            return;
          }
          onErrorFallback?.(e);
        }}
      />

      {/* طبقة شريط الترجمة الذكي الأفقي (خُمس الشاشة: نصفه فوق خط القراءة ونصفه تحته) */}
      {isSmartMode && (
        <>
          <img
            src={arSrc}
            alt=""
            aria-hidden="true"
            className={`tsl-hover-overlay ${imgClassName || ""}`}
            style={{
              ...imgStyle,
              opacity: band.active ? 1 : 0,
              clipPath: band.active
                ? `inset(${band.topPct}% 0% ${band.bottomPct}% 0%)`
                : "inset(50% 0% 50% 0%)"
            }}
            draggable={false}
            loading="lazy"
            decoding="async"
            crossOrigin={arSrc.startsWith("http") ? "anonymous" : undefined}
            onError={() => setArBroken(true)}
          />

          {band.active && (
            <div
              className="tsl-hover-frame"
              style={{
                top: `${band.topPct}%`,
                height: `${band.heightPct}%`
              }}
              aria-hidden="true"
            />
          )}
        </>
      )}

      {/* زر عكس لغة السلايد الفردي (سفلي صغير بوضعي عربي/إنجليزي فقط، مخفي في الوضع الذكي) */}
      {translationReady && mode !== "hover" && !isLightbox && onToggleFlip && (
        <button
          type="button"
          className={`tsl-flip-btn ${isFlipped ? "is-flipped" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFlip();
          }}
          title={
            showingFullAr
              ? "إرجاع هذه الشريحة إلى الإنجليزية"
              : "ترجمة صورة هذه الشريحة إلى العربية"
          }
          aria-pressed={isFlipped}
        >
          <Icons.Translate size={12} />
          <span>{showingFullAr ? "EN" : "عربي"}</span>
        </button>
      )}
    </div>
  );
};

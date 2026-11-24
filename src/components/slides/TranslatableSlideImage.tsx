// ==============================================================================
// المنصة التعليمية الموحدة — عارض صورة السلايد ثلاثي الأوضاع (EN / AR / Hover Lens)
// 1/5-Screen (20dvh) Full-Width Horizontal Hover Reveal · Mobile Touch Friendly
// Pure GPU clip-path · Graceful Fallback · Zero Emojis
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
  onToggleFlip?: () => void;
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
  topPx: number;
  bottomPx: number;
  heightPx: number;
}

const INACTIVE_BAND: BandState = { active: false, topPx: 0, bottomPx: 0, heightPx: 0 };

export const TranslatableSlideImage: React.FC<TranslatableSlideImageProps> = ({
  imageUrl,
  alt,
  mode,
  isFlipped,
  canTranslate,
  onToggleFlip,
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
  const [arBroken, setArBroken] = useState(false);
  const [band, setBand] = useState<BandState>(INACTIVE_BAND);
  const [touchLocked, setTouchLocked] = useState(false);

  useEffect(() => {
    setArBroken(false);
    setBand(INACTIVE_BAND);
    setTouchLocked(false);
  }, [imageUrl]);

  useEffect(() => {
    if (mode !== "hover") {
      setBand(INACTIVE_BAND);
      setTouchLocked(false);
    }
  }, [mode]);

  const enSrc = resolveAssetUrl(imageUrl);
  const arSrc = resolveTranslatedSlideUrl(imageUrl);
  const translationReady = canTranslate && Boolean(arSrc) && !arBroken;

  // الوضع الفعلي للصورة في وضعي EN و AR
  const showingFullAr =
    translationReady &&
    ((mode === "ar" && !isFlipped) || (mode === "en" && isFlipped));

  const isHoverMode = translationReady && mode === "hover";

  const computeBandFromClientY = useCallback((clientY: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;

    const relY = clientY - rect.top;
    // خُمس ارتفاع الشاشة (20dvh): نصف الخُمس فوق المؤشر ونصف الخُمس تحته
    const viewportH = window.visualViewport?.height || window.innerHeight || 720;
    const halfBand = viewportH * 0.1;

    const topPx = Math.max(0, Math.min(rect.height, relY - halfBand));
    const botEdge = Math.max(0, Math.min(rect.height, relY + halfBand));
    const bottomPx = Math.max(0, rect.height - botEdge);

    setBand({
      active: true,
      topPx,
      bottomPx,
      heightPx: Math.max(0, botEdge - topPx)
    });
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHoverMode) return;
    if (e.pointerType === "mouse") {
      computeBandFromClientY(e.clientY);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHoverMode) return;
    if (e.pointerType === "mouse" && !touchLocked) {
      setBand(INACTIVE_BAND);
    }
  };

  const handleWrapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isHoverMode && !isLightbox) {
      // على الشاشات اللمسية: النقر على السلايد في وضع Hover يضع شريط الترجمة مكان اللمسة (أو يخفيه)
      const isTouchLike =
        typeof window !== "undefined" &&
        (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);
      if (isTouchLike) {
        e.stopPropagation();
        if (touchLocked && band.active) {
          computeBandFromClientY(e.clientY);
        } else {
          setTouchLocked(true);
          computeBandFromClientY(e.clientY);
        }
        return;
      }
    }
    onOpenLightbox?.();
  };

  const handleTouchBandMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isHoverMode || e.touches.length !== 1) return;
    setTouchLocked(true);
    computeBandFromClientY(e.touches[0].clientY);
  };

  const primarySrc = showingFullAr ? arSrc : enSrc;

  return (
    <div
      ref={wrapRef}
      className={`tsl-stage ${isHoverMode ? "is-hover-mode" : ""} ${band.active ? "is-band-active" : ""} ${isLightbox ? "is-lightbox" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
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

      {/* طبقة شريط Hover الأفقي المترجم (خُمس الشاشة: نصفه فوق المؤشر ونصفه تحته) */}
      {isHoverMode && (
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
                ? `inset(${band.topPx}px 0px ${band.bottomPx}px 0px)`
                : "inset(50% 0px 50% 0px)"
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
                top: `${band.topPx}px`,
                height: `${band.heightPx}px`
              }}
              aria-hidden="true"
            />
          )}

          {/* مقبض لمسي جانبي للجوال لتحريك شريط الترجمة بسلاسة دون تعطيل التمرير */}
          {!isLightbox && (
            <div
              className={`tsl-touch-rail ${touchLocked ? "active" : ""}`}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleTouchBandMove(e);
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                handleTouchBandMove(e);
              }}
              onClick={(e) => e.stopPropagation()}
              title="اسحب عمودياً لتحريك شريط الترجمة"
            >
              <Icons.Translate size={12} />
            </div>
          )}

          {touchLocked && band.active && (
            <button
              type="button"
              className="tsl-dismiss-band"
              onClick={(e) => {
                e.stopPropagation();
                setTouchLocked(false);
                setBand(INACTIVE_BAND);
              }}
              title="إخفاء شريط الترجمة"
            >
              <Icons.Cross size={11} />
              <span>إخفاء الشريط</span>
            </button>
          )}
        </>
      )}

      {/* زر عكس لغة السلايد الفردي في وضعي EN و AR (لا يظهر في وضع Hover ولا في Lightbox حيث يوجد في الشريط العلوي) */}
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
          <Icons.Translate size={13} />
          <span>{showingFullAr ? "EN" : "عربي"}</span>
        </button>
      )}
    </div>
  );
};

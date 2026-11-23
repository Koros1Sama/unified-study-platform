// ==============================================================================
// المنصة التعليمية الموحدة — عارض الصور والكتب المكبر (Lightbox & Book Lightbox)
// Persistent Manual Zoom · Working Touch Pinch/Pan/Double-Tap · Fit-Width Mode
// Paper Comfort Filter · Collapsible Translation/Notes Drawer · Zero Emojis
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icons } from "../icons/SvgIcons";
import { resolveAssetUrl } from "../../lib/dataService";
import type { BookPaperFilter, SlideItem } from "../../types";

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: SlideItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  isBookMode?: boolean;
  paperFilter?: BookPaperFilter;
  onChangePaperFilter?: (filter: BookPaperFilter) => void;
  arabicOnly?: boolean;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  slides,
  currentIndex,
  onNavigate,
  isBookMode = false,
  paperFilter = "original",
  onChangePaperFilter,
  arabicOnly = false
}) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [fitMode, setFitMode] = useState<"page" | "width">("page");
  const [showDrawer, setShowDrawer] = useState(true);

  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const lastTouchRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const wasPinchingRef = useRef<boolean>(false);
  const pinchStartDist = useRef<number>(0);
  const pinchStartScale = useRef<number>(1);
  const stageRef = useRef<HTMLDivElement>(null);

  const currentSlide = slides[currentIndex];
  const unitLabel = isBookMode ? "صفحة" : "شريحة";
  const unitDefinite = isBookMode ? "الصفحة" : "الشريحة";

  const clampPan = useCallback((x: number, y: number, s: number) => {
    if (s <= 1) return { x: 0, y: 0 };
    const maxBoundX = (window.innerWidth * (s - 1)) / 2;
    const maxBoundY = (window.innerHeight * (s - 1)) / 2;
    return {
      x: Math.max(-maxBoundX, Math.min(maxBoundX, x)),
      y: Math.max(-maxBoundY, Math.min(maxBoundY, y))
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    setFitMode("page");
    setScale((s) => {
      const next = Math.min(4, Number((s + 0.5).toFixed(2)));
      setPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  }, [clampPan]);

  const handleZoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(1, Number((s - 0.5).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      else setPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  }, [clampPan]);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleDoubleTap = useCallback(() => {
    setFitMode("page");
    setScale((s) => {
      if (s > 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return 2.25;
    });
  }, []);

  // عند تبديل الصفحة نعيد توسيط الإزاحة ونعود لأعلى الصفحة في وضع ملاءمة العرض
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    if (fitMode === "width" && stageRef.current) {
      stageRef.current.scrollTop = 0;
    }
  }, [currentIndex, fitMode]);

  // قفل تمرير الصفحة الخلفية
  useEffect(() => {
    if (!isOpen) return;
    const origDocOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = origDocOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, [isOpen]);

  const cyclePaperFilter = useCallback(() => {
    if (!onChangePaperFilter) return;
    const order: BookPaperFilter[] = ["original", "warm", "night"];
    const next = order[(order.indexOf(paperFilter) + 1) % order.length];
    onChangePaperFilter(next);
  }, [onChangePaperFilter, paperFilter]);

  // اختصارات لوحة المفاتيح مع منع تسربها إلى App.tsx
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        e.key === "Escape" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowLeft" ||
        k === "p" ||
        k === "n" ||
        k === "f" ||
        k === "c" ||
        e.key === "+" ||
        e.key === "=" ||
        e.key === "-" ||
        e.key === "_" ||
        e.key === "0"
      ) {
        e.stopImmediatePropagation();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight" || k === "p") {
        e.preventDefault();
        if (currentIndex > 0) onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowLeft" || k === "n") {
        e.preventDefault();
        if (currentIndex < slides.length - 1) onNavigate(currentIndex + 1);
      } else if (k === "f" && isBookMode) {
        e.preventDefault();
        setScale(1);
        setPan({ x: 0, y: 0 });
        setFitMode((m) => (m === "width" ? "page" : "width"));
      } else if (k === "c" && isBookMode && onChangePaperFilter) {
        e.preventDefault();
        cyclePaperFilter();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, currentIndex, slides.length, isBookMode, onChangePaperFilter, cyclePaperFilter, onNavigate, onClose, handleZoomIn, handleZoomOut, handleResetZoom]);

  // مستمع wheel أصلي غير سلبي (passive: false) لمنع زوم المتصفح عند Ctrl+Wheel
  useEffect(() => {
    if (!isOpen) return;
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [isOpen, handleZoomIn, handleZoomOut]);

  // إنهاء السحب حتى لو أُفلت زر الفأرة خارج النافذة
  useEffect(() => {
    if (!isDragging) return;
    const onWindowMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [isDragging]);

  if (!isOpen || !currentSlide) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (fitMode === "width" || scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan(clampPan(panStart.current.x + dx, panStart.current.y + dy, scale));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const prev = lastTouchRef.current;
      const tapDist = Math.hypot(touch.clientX - prev.x, touch.clientY - prev.y);

      if (!wasPinchingRef.current && now - prev.time < 300 && tapDist < 44) {
        handleDoubleTap();
        lastTouchRef.current = { time: 0, x: 0, y: 0 };
        swipeStartRef.current = null;
        swipeCurrentRef.current = null;
        return;
      }
      lastTouchRef.current = { time: now, x: touch.clientX, y: touch.clientY };

      if (fitMode === "page" && scale > 1) {
        setIsDragging(true);
        dragStart.current = { x: touch.clientX, y: touch.clientY };
        panStart.current = { ...pan };
        swipeStartRef.current = null;
        swipeCurrentRef.current = null;
      } else if (scale === 1 && !wasPinchingRef.current) {
        swipeStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };
        swipeCurrentRef.current = { x: touch.clientX, y: touch.clientY };
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartDist.current = dist;
      pinchStartScale.current = scale;
      wasPinchingRef.current = true;
      swipeStartRef.current = null;
      swipeCurrentRef.current = null;
      setFitMode("page");
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1 && fitMode === "page" && !wasPinchingRef.current) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPan(clampPan(panStart.current.x + dx, panStart.current.y + dy, scale));
    } else if (e.touches.length === 1 && swipeStartRef.current && scale === 1) {
      swipeCurrentRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && pinchStartDist.current > 0) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / pinchStartDist.current;
      const nextScale = Math.max(1, Math.min(4, pinchStartScale.current * ratio));
      setScale(nextScale);
      setPan((p) => clampPan(p.x, p.y, nextScale));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      if (!wasPinchingRef.current && scale === 1 && swipeStartRef.current && swipeCurrentRef.current) {
        const dx = swipeCurrentRef.current.x - swipeStartRef.current.x;
        const dy = swipeCurrentRef.current.y - swipeStartRef.current.y;
        const elapsed = Date.now() - swipeStartRef.current.time;
        if (elapsed < 650 && Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.45) {
          // في الواجهة العربية RTL: السهم الأيمن = السابق والأيسر = التالي، لذا السحب لليمين يقلب للتالي ولليسار للسابق
          if (dx > 0 && currentIndex < slides.length - 1) {
            onNavigate(currentIndex + 1);
          } else if (dx < 0 && currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
        }
      }
      setIsDragging(false);
      pinchStartDist.current = 0;
      wasPinchingRef.current = false;
      swipeStartRef.current = null;
      swipeCurrentRef.current = null;
    } else if (e.touches.length === 1) {
      setIsDragging(false);
      pinchStartDist.current = 0;
      swipeStartRef.current = null;
      swipeCurrentRef.current = null;
    }
  };

  const paperFilterClass =
    paperFilter === "warm"
      ? "book-paper-warm"
      : paperFilter === "night"
      ? "book-paper-night"
      : "";

  const paperLabel =
    paperFilter === "warm" ? "ورق دافئ" : paperFilter === "night" ? "ليلي ذكي" : "أصلي";

  const hasTextNotes = Boolean((!arabicOnly && currentSlide.content_ar) || currentSlide.notes_ar);

  return (
    <div
      id="lightboxModal"
      className="lightbox-overlay lb lb-overlay-root active"
      role="dialog"
      aria-modal="true"
      aria-label={`تكبير ${unitDefinite}`}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      {/* الترويسة العلوية للـ Lightbox */}
      <div className="lb-topbar">
        <div className="lb-top-meta">
          <span className="lb-top-ref">
            {currentSlide.ref}
          </span>
          <span className="lb-top-count">
            {unitLabel} {currentIndex + 1} من {slides.length}
          </span>
        </div>

        {/* أزرار التحكم بالزوم والورق وملاءمة العرض */}
        <div className="lb-top-controls">
          {isBookMode && (
            <button
              type="button"
              className={`btn btn-sm lb-ctrl-btn ${fitMode === "width" ? "btn-primary" : ""}`}
              onClick={() => {
                setScale(1);
                setPan({ x: 0, y: 0 });
                setFitMode((m) => (m === "width" ? "page" : "width"));
              }}
              title="التبديل بين ملاءمة عرض الشاشة (للقراءة المريحة للكتب) وكامل الصفحة"
            >
              <Icons.BookOpen size={14} />
              <span>{fitMode === "width" ? "كامل الصفحة" : "ملاءمة العرض"}</span>
            </button>
          )}

          {isBookMode && onChangePaperFilter && (
            <button
              type="button"
              className={`btn btn-sm lb-ctrl-btn ${paperFilter !== "original" ? "btn-primary" : ""}`}
              onClick={cyclePaperFilter}
              title="تبديل نمط ورق الكتاب (أصلي / دافئ / ليلي ذكي)"
            >
              <Icons.Contrast size={14} />
              <span>{paperLabel}</span>
            </button>
          )}

          {hasTextNotes && (
            <button
              type="button"
              className={`btn btn-sm lb-ctrl-btn ${showDrawer ? "btn-primary" : ""}`}
              onClick={() => setShowDrawer((v) => !v)}
              title="إظهار أو إخفاء لوحة الترجمة والشرح"
            >
              <Icons.Tip size={14} />
              <span>الشرح</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-sm btn-icon lb-zoom-desktop"
            onClick={handleZoomIn}
            title="تقريب (+)"
            aria-label="تقريب"
          >
            <Icons.ZoomIn size={17} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-icon lb-zoom-desktop"
            onClick={handleZoomOut}
            title="تصغير (-)"
            aria-label="تصغير"
          >
            <Icons.ZoomOut size={17} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-icon lb-zoom-desktop"
            onClick={handleResetZoom}
            title="تصفير الزوم (0)"
            aria-label="إعادة ضبط الزوم"
          >
            <Icons.Reset size={17} />
          </button>
          <button
            type="button"
            className={`lb-zoom-pill ${scale > 1 ? "is-zoomed" : ""}`}
            onClick={handleResetZoom}
            title={scale > 1 ? "انقر لإعادة التوسيط (100%)" : "مقياس العرض الحالي"}
            aria-label={`مقياس التكبير ${Math.round(scale * 100)} بالمائة`}
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="btn btn-sm btn-icon lb-close-btn"
            onClick={onClose}
            title="إغلاق (Esc)"
            aria-label="إغلاق"
          >
            <Icons.Cross size={18} />
          </button>
        </div>
      </div>

      {/* منطقة عرض صورة الشريحة/الصفحة */}
      <div className="lb-stage-shell">
        <div
          ref={stageRef}
          className={`lb-stage ${fitMode === "width" ? "is-fit-width" : ""}`}
          style={{
            cursor: fitMode === "page" && scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            touchAction: fitMode === "width" ? "pan-y" : "none"
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onDoubleClick={handleDoubleTap}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {currentSlide.image_url ? (
            <img
              src={resolveAssetUrl(currentSlide.image_url)}
              alt={currentSlide.title || currentSlide.ref}
              className={`lb-img ${paperFilterClass} ${fitMode === "width" ? "is-fit-width" : ""}`}
              style={
                fitMode === "width"
                  ? undefined
                  : {
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                      transition: isDragging ? "none" : "transform 0.15s ease-out"
                    }
              }
              draggable={false}
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src =
                  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='100%' height='100%' fill='%23191c24'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23f5b13d' font-family='sans-serif' font-size='24' font-weight='bold'>" +
                  encodeURIComponent(`${unitLabel} ${currentSlide.ref}`) +
                  "</text></svg>";
              }}
            />
          ) : (
            <div
              dir="ltr"
              style={{
                maxWidth: "780px",
                width: "92vw",
                maxHeight: "100%",
                overflowY: "auto",
                padding: "20px 22px",
                borderRadius: "16px",
                background: "var(--sf)",
                border: "1px solid var(--ln)",
                color: "var(--ink)",
                textAlign: "left",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transition: isDragging ? "none" : "transform 0.15s ease-out"
              }}
            >
              <div style={{ fontFamily: "var(--fm)", fontSize: "0.85rem", fontWeight: 800, color: "var(--acc)", marginBottom: 8 }}>
                {currentSlide.ref}
              </div>
              <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", fontWeight: 800, color: "var(--ink)" }}>
                {currentSlide.title || currentSlide.ref}
              </h3>
              {currentSlide.content_en && (
                <div style={{ fontFamily: "var(--fm)", fontSize: "0.95rem", lineHeight: 1.7, color: "var(--ink-m)", whiteSpace: "pre-wrap" }}>
                  {currentSlide.content_en}
                </div>
              )}
            </div>
          )}
        </div>

        {/* أزرار التنقل بين الصفحات/الشرائح (ثابتة بمنتصف المساحة المرئية حتى مع التمرير) */}
        {currentIndex > 0 && (
          <button
            type="button"
            className="lb-nav-btn lb-prev"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex - 1);
            }}
            title={`${unitDefinite} السابقة (السهم الأيمن)`}
            aria-label={`${unitDefinite} السابقة`}
          >
            <Icons.ChevronRight size={24} />
          </button>
        )}

        {currentIndex < slides.length - 1 && (
          <button
            type="button"
            className="lb-nav-btn lb-next"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(currentIndex + 1);
            }}
            title={`${unitDefinite} التالية (السهم الأيسر)`}
            aria-label={`${unitDefinite} التالية`}
          >
            <Icons.ChevronLeft size={24} />
          </button>
        )}
      </div>

      {/* شريط الشرح والترجمة السفلي القابل للطي */}
      {showDrawer && hasTextNotes && (
        <div className="lb-drawer">
          <div className="lb-drawer-bar">
            <span className="lb-drawer-title">الترجمة والشرح</span>
            <button
              type="button"
              className="lb-drawer-close"
              onClick={() => setShowDrawer(false)}
              aria-label="طي الشرح لتكبير الصفحة"
              title="طي الشرح لتكبير الصفحة"
            >
              <Icons.ChevronDown size={14} />
              <span>طي</span>
            </button>
          </div>
          {!arabicOnly && currentSlide.content_ar && (
            <div className="lb-drawer-sec">
              <strong style={{ color: "var(--acc)" }}>الترجمة: </strong>
              <span>{currentSlide.content_ar}</span>
            </div>
          )}
          {currentSlide.notes_ar && (
            <div className="lb-drawer-sec">
              <strong style={{ color: "var(--ok)" }}>الشرح: </strong>
              <span>{currentSlide.notes_ar}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

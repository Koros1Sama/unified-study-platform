// ==============================================================================
// المنصة التعليمية الموحدة — عارض الصور المكبر واللايت بوكس (Lightbox)
// Persistent Manual Zoom Standard (Double-tap, Pinch, Pan, +, -, 0 Shortcuts)
// Rule 10: Persistent across Next/Prev slide transitions
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icons } from "../icons/SvgIcons";
import { resolveAssetUrl } from "../../lib/dataService";
import type { SlideItem } from "../../types";

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: SlideItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  slides,
  currentIndex,
  onNavigate
}) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Touch handling refs
  const lastTouchTime = useRef<number>(0);
  const pinchStartDist = useRef<number>(0);
  const pinchStartScale = useRef<number>(1);

  const currentSlide = slides[currentIndex];

  // دالة حصر الإزاحة ضمن حدود منطقية لمنع هروب الصورة خارج الإطار
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
    setScale((s) => {
      const next = Math.min(4, s + 0.5);
      setPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  }, [clampPan]);

  const handleZoomOut = useCallback(() => {
    setScale((s) => {
      const next = Math.max(1, s - 0.5);
      if (next === 1) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((p) => clampPan(p.x, p.y, next));
      }
      return next;
    });
  }, [clampPan]);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleDoubleTap = useCallback(() => {
    setScale((s) => {
      if (s > 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return 2.5;
    });
  }, []);

  // قفل تمرير الصفحة الخلفية عبر overflow: hidden على documentElement و body (القاعدة 10)
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

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "p") {
        if (currentIndex > 0) onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowLeft" || e.key === "n") {
        if (currentIndex < slides.length - 1) onNavigate(currentIndex + 1);
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleResetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, slides.length, onNavigate, onClose, handleZoomIn, handleZoomOut, handleResetZoom]);

  if (!isOpen || !currentSlide) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
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

  // معالجة اللمس للهواتف والأجهزة اللوحية (Touch / Pinch / Double-Tap)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTouchTime.current < 300) {
        // Double-tap detected
        handleDoubleTap();
        lastTouchTime.current = 0;
        return;
      }
      lastTouchTime.current = now;

      if (scale > 1) {
        setIsDragging(true);
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panStart.current = { ...pan };
      }
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartDist.current = dist;
      pinchStartScale.current = scale;
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPan(clampPan(panStart.current.x + dx, panStart.current.y + dy, scale));
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

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDist.current = 0;
  };

  return (
    <div
      id="lightboxModal"
      className="lightbox-overlay lb active"
      role="dialog"
      aria-modal="true"
      aria-label="تكبير الشريحة"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.94)",
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      {/* الترويسة العلوية للـ Lightbox */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "rgba(18, 20, 26, 0.85)",
          borderBottom: "1px solid var(--ln)",
          color: "#fff"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontWeight: 800, color: "var(--acc)", fontSize: "1rem" }}>
            {currentSlide.ref}
          </span>
          <span style={{ color: "var(--ink-m)", fontSize: "0.85rem" }}>
            شريحة {currentIndex + 1} من {slides.length}
          </span>
        </div>

        {/* أزرار التحكم بالزوم اليدوي */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-sm btn-icon"
            onClick={handleZoomIn}
            title="تقريب (+)"
          >
            <Icons.ZoomIn size={18} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-icon"
            onClick={handleZoomOut}
            title="تصغير (-)"
          >
            <Icons.ZoomOut size={18} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-icon"
            onClick={handleResetZoom}
            title="تصفير الزوم (0)"
          >
            <Icons.Reset size={18} />
          </button>
          <span style={{ fontSize: "0.8rem", color: "var(--ink-m)", minWidth: "45px", textAlign: "center" }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="btn btn-sm btn-icon"
            onClick={onClose}
            title="إغلاق (Esc)"
            style={{ marginRight: "12px" }}
          >
            <Icons.Cross size={18} />
          </button>
        </div>
      </div>

      {/* منطقة عرض صورة الشريحة */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleTap}
      >
        <img
          src={resolveAssetUrl(currentSlide.image_url)}
          alt={currentSlide.title || currentSlide.ref}
          style={{
            maxWidth: "92vw",
            maxHeight: "82vh",
            objectFit: "contain",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            userSelect: "none"
          }}
          draggable={false}
          onError={(e) => {
            // صورة احتياطية توضيحية في حال تعذر تحميل مسار الصورة
            const target = e.currentTarget;
            target.onerror = null;
            target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'><rect width='100%' height='100%' fill='%23191c24'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23f5b13d' font-family='sans-serif' font-size='24' font-weight='bold'>شريحة " + currentSlide.ref + "</text></svg>";
          }}
        />

        {/* أزرار التنقل بين السلايدات (سابق / تالي) */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex - 1)}
            style={{
              position: "absolute",
              right: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0, 0, 0, 0.65)",
              border: "1px solid var(--ln)",
              color: "#fff",
              borderRadius: "50%",
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            title="السريحة السابقة (السهم الأيمن)"
          >
            <Icons.ChevronRight size={24} />
          </button>
        )}

        {currentIndex < slides.length - 1 && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex + 1)}
            style={{
              position: "absolute",
              left: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0, 0, 0, 0.65)",
              border: "1px solid var(--ln)",
              color: "#fff",
              borderRadius: "50%",
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            title="السريحة التالية (السهم الأيسر)"
          >
            <Icons.ChevronLeft size={24} />
          </button>
        )}
      </div>

      {/* شريط الشرح السفلي إن وجد */}
      {(currentSlide.content_ar || currentSlide.notes_ar) && (
        <div
          style={{
            background: "rgba(18, 20, 26, 0.9)",
            borderTop: "1px solid var(--ln)",
            padding: "10px 24px",
            color: "var(--ink)",
            fontSize: "0.9rem",
            maxHeight: "120px",
            overflowY: "auto"
          }}
        >
          {currentSlide.notes_ar || currentSlide.content_ar}
        </div>
      )}
    </div>
  );
};

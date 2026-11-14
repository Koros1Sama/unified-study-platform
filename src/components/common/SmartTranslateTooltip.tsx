// ==============================================================================
// المنصة التعليمية الموحدة — محرك الترجمة الذكية الفورية (.wtip)
// Desktop Hover Debounce (120ms) + Mobile Ghost Click Suppression (280ms)
// cleanArabicOnly helper + 16s Mobile Auto-Dismissal
// ==============================================================================

import React, { useEffect, useRef } from "react";
import { Icons } from "../icons/SvgIcons";

export function cleanArabicOnly(text: string): string {
  if (!text || typeof text !== "string") return "";
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  let clean = text;
  clean = clean.replace(/\s*\([A-Za-z][A-Za-z0-9\s,\-–—\.:\?/'"&%#+_=]*\)\s*/g, " ");
  clean = clean.replace(/\s*\[[A-Za-z][A-Za-z0-9\s,\-–—\.:\?/'"&%#+_=]*\]\s*/g, " ");
  clean = clean.replace(/\s{2,}/g, " ").replace(/\s+([،؛:\.؟?!])/g, "$1").trim();
  return clean;
}

interface SmartTranslateTooltipProps {
  visible: boolean;
  textAr: string;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onMouseEnterTooltip?: () => void;
  onMouseLeaveTooltip?: () => void;
  title?: string;
}

export const SmartTranslateTooltip: React.FC<SmartTranslateTooltipProps> = ({
  visible,
  textAr,
  position,
  onClose,
  onMouseEnterTooltip,
  onMouseLeaveTooltip,
  title = "الترجمة الفورية المعتمدة"
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimeRef = useRef<number>(0);
  const hoverOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverOutTimerRef.current) {
      clearTimeout(hoverOutTimerRef.current);
      hoverOutTimerRef.current = null;
    }
    if (onMouseEnterTooltip) onMouseEnterTooltip();
  };

  const handleMouseLeave = () => {
    if (onMouseLeaveTooltip) {
      onMouseLeaveTooltip();
      return;
    }
    hoverOutTimerRef.current = setTimeout(() => {
      onClose();
    }, 140);
  };

  useEffect(() => {
    if (visible) {
      openTimeRef.current = Date.now();

      // إغلاق تلقائي بعد 16 ثانية على الهواتف
      const timer = setTimeout(() => {
        onClose();
      }, 16000);

      // استماع للتمرير لإغلاق النافذة فور تحرك الصفحة لمنع انفصالها عن السؤال
      window.addEventListener("scroll", onClose, { passive: true });

      // استماع للنقر خارج النافذة مع حماية 280ms ضد النقرات الشبحية على الهواتف
      const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
        if (Date.now() - openTimeRef.current < 280) return;
        if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
          onClose();
        }
      };

      document.addEventListener("pointerdown", handleOutsideClick);

      return () => {
        clearTimeout(timer);
        if (hoverOutTimerRef.current) clearTimeout(hoverOutTimerRef.current);
        window.removeEventListener("scroll", onClose);
        document.removeEventListener("pointerdown", handleOutsideClick);
      };
    }
  }, [visible, onClose]);

  if (!visible || !position || !textAr) return null;

  // حصر الموضع داخل حدود الشاشة المرئية أفقياً وعمودياً
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(Math.max(16, position.x - 150), Math.max(16, screenWidth - 340));
  const top =
    position.y + 165 > screenHeight
      ? Math.max(16, position.y - 170)
      : Math.max(16, position.y + 10);

  const isTouchDevice =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  return (
    <>
      {/* غطاء حماية مقتصر على شاشات اللمس لمنع تسرب اللمسات، مع إبقائه غير حاجب على أجهزة اللابتوب والماوس */}
      {isTouchDevice && (
        <div
          className="wtip-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "transparent"
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        />
      )}
      <div
        ref={tooltipRef}
        className="wtip"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          zIndex: 9999
        }}
        role="tooltip"
        dir="rtl"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="wtip-header">
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icons.Translate size={15} />
            <span>{title}</span>
          </span>
          <button
            type="button"
            className="wtip-close"
            onClick={onClose}
            aria-label="إغلاق التلميح"
          >
            <Icons.Cross size={14} />
          </button>
        </div>
        <div style={{ fontSize: "0.93rem", color: "var(--ink)" }}>
          {cleanArabicOnly(textAr)}
        </div>
      </div>
    </>
  );
};

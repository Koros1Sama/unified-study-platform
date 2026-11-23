// ==============================================================================
// المنصة التعليمية الموحدة — محرك الترجمة الذكية الفورية (.wtip)
// Desktop Hover Debounce (120ms) + Mobile Ghost Click Suppression (280ms)
// cleanArabicOnly helper + 16s Mobile Auto-Dismissal
// ==============================================================================

import React, { useEffect, useRef } from "react";
import { Icons } from "../icons/SvgIcons";
import { cleanArabicOnly } from "../../lib/textUtils";

export { cleanArabicOnly };

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
  title
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

      // استماع للتمرير الحقيقي (أكثر من 22px) لإغلاق النافذة ومنع إغلاقها باهتزاز اللمس الطفيف على الهاتف
      const openScrollY = typeof window !== "undefined" ? window.scrollY : 0;
      const handleScroll = () => {
        if (Math.abs(window.scrollY - openScrollY) > 22) {
          onClose();
        }
      };
      window.addEventListener("scroll", handleScroll, { passive: true });

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
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("pointerdown", handleOutsideClick);
      };
    }
  }, [visible, onClose]);

  if (!visible || !position || !textAr) return null;

  // حصر الموضع والعرض بدقة داخل حدود الشاشة المرئية حتى على هواتف 360px
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1000;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const safeMargin = 12;
  const maxTooltipWidth = Math.min(360, Math.max(220, screenWidth - safeMargin * 2));
  const left = Math.min(
    Math.max(safeMargin, position.x - maxTooltipWidth / 2),
    Math.max(safeMargin, screenWidth - maxTooltipWidth - safeMargin)
  );
  const estimatedHeight = 190;
  const top =
    position.y + estimatedHeight > screenHeight - 16
      ? Math.max(safeMargin, position.y - estimatedHeight)
      : Math.max(safeMargin, position.y + 8);

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
          maxWidth: `${maxTooltipWidth}px`,
          maxHeight: "42dvh",
          overflowY: "auto",
          zIndex: 9999
        }}
        role="tooltip"
        dir="rtl"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {title && (
          <div className="wtip-header">
            <span>{title}</span>
          </div>
        )}
        <div className="wtip-body">
          <span className="wtip-text">{cleanArabicOnly(textAr)}</span>
          {isTouchDevice && (
            <button
              type="button"
              className="wtip-close"
              onClick={onClose}
              aria-label="إغلاق"
            >
              <Icons.Cross size={13} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

// ==============================================================================
// المنصة التعليمية الموحدة — كبسولة الأوضاع الثلاثية المفصولة عن تصفير Viewport
// Zen Mode Toggle (0: عادي / 1: تركيز / 2: تكبير)
// Rule 10: Persistent Manual Zoom & Decoupled Expansion Standard
// ==============================================================================

import React from "react";
import { Icons } from "../icons/SvgIcons";
import type { ZenZoomLevel } from "../../types";

interface ZenModeToggleProps {
  level: ZenZoomLevel;
  onChange: (level: ZenZoomLevel) => void;
}

export const ZenModeToggle: React.FC<ZenModeToggleProps> = ({ level, onChange }) => {
  const handleSelect = (nextLevel: ZenZoomLevel) => {
    onChange(nextLevel);

    if (nextLevel === 2) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "var(--sf2)",
        border: "1px solid var(--ln)",
        borderRadius: "var(--r-pill)",
        padding: "3px",
        gap: "2px"
      }}
      role="group"
      aria-label="أوضاع عرض الواجهة"
    >
      <button
        type="button"
        onClick={() => handleSelect(0)}
        className={`btn btn-sm ${level === 0 ? "btn-primary" : ""}`}
        style={{
          border: "none",
          borderRadius: "var(--r-pill)",
          padding: "4px 10px",
          background: level === 0 ? "var(--acc)" : "transparent",
          color: level === 0 ? "#000" : "var(--ink-m)"
        }}
        title="الوضع العادي (الشريط الجانبي ظاهر)"
      >
        <Icons.Normal size={15} />
        <span>عادي</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect(1)}
        className={`btn btn-sm ${level === 1 ? "btn-primary" : ""}`}
        style={{
          border: "none",
          borderRadius: "var(--r-pill)",
          padding: "4px 10px",
          background: level === 1 ? "var(--acc)" : "transparent",
          color: level === 1 ? "#000" : "var(--ink-m)"
        }}
        title="وضع التركيز (توسيع العرض وإخفاء الشريط الجانبي)"
      >
        <Icons.Focus size={15} />
        <span>تركيز</span>
      </button>

      <button
        type="button"
        onClick={() => handleSelect(2)}
        className={`btn btn-sm ${level === 2 ? "btn-primary" : ""}`}
        style={{
          border: "none",
          borderRadius: "var(--r-pill)",
          padding: "4px 10px",
          background: level === 2 ? "var(--acc)" : "transparent",
          color: level === 2 ? "#000" : "var(--ink-m)"
        }}
        title="وضع التكبير الشامل Zen Zoom"
      >
        <Icons.Maximize size={15} />
        <span>تكبير</span>
      </button>
    </div>
  );
};

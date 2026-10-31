// ==============================================================================
// المنصة التعليمية الموحدة — بانر تثبيت تطبيق الويب التقدمي (PWA Install Banner)
// Appears on first open, with instant installation or iOS instructions.
// Zero Emojis Standard · 100% SVG Vector Line-Art
// ==============================================================================

import React, { useState } from "react";
import { Icons } from "../icons/SvgIcons";

interface PwaInstallBannerProps {
  isOpen: boolean;
  onInstall: () => Promise<boolean>;
  onDismiss: () => void;
  onOpenGuide?: () => void;
  isIos?: boolean;
  isDesktop?: boolean;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  isOpen,
  onInstall,
  onDismiss,
  onOpenGuide,
  isIos = false,
  isDesktop = false
}) => {
  if (!isOpen) return null;

  return (
    <aside
      id="pwaInstallBanner"
      role="region"
      aria-label="تثبيت المنصة كتطبيق"
      style={{
        position: "fixed",
        bottom: "calc(64px + env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1500,
        width: "calc(100% - 24px)",
        maxWidth: "520px",
        backgroundColor: "var(--sf)",
        border: "1px solid var(--acc)",
        borderRadius: "var(--r-l)",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45)",
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        animation: "rise 0.28s var(--ease)"
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "var(--r-m)",
          backgroundColor: "color-mix(in srgb, var(--acc) 18%, transparent)",
          color: "var(--acc)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0
        }}
      >
        <Icons.Download size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1.3 }}>
          {isDesktop ? "تثبيت المنصة على اللابتوب (PWA)" : "تثبيت المنصة كتطبيق على جهازك"}
        </div>
        <div style={{ fontSize: "0.74rem", color: "var(--ink-m)", lineHeight: 1.35, marginTop: "2px" }}>
          تصفح شاشة كاملة، سرعة فائقة، وتجربة أوفلاين متكاملة بدون متصفح
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => {
            onInstall();
          }}
          style={{
            padding: "6px 14px",
            fontSize: "0.78rem",
            fontWeight: 800,
            borderRadius: "var(--r-pill)"
          }}
        >
          <span>تثبيت</span>
        </button>

        <button
          type="button"
          className="btn btn-sm"
          onClick={onDismiss}
          title="إخفاء هذا الإشعار لاحقاً"
          style={{
            padding: "6px 10px",
            fontSize: "0.76rem",
            borderRadius: "var(--r-pill)",
            background: "transparent",
            color: "var(--ink-m)",
            border: "1px solid var(--ln)"
          }}
        >
          <span>لاحقاً</span>
        </button>
      </div>
    </aside>
  );
};

// ==============================================================================
// المنصة التعليمية الموحدة — نافذة دليل تثبيت التطبيق للابتوب والجوال (PWA Install Modal)
// Step-by-step visual guidance for Desktop (Chrome/Edge/Brave), iOS, and Android
// Zero Emojis Standard · 100% SVG Vector Line-Art
// ==============================================================================

import React, { useState, useEffect } from "react";
import { Icons } from "../icons/SvgIcons";

interface PwaInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDesktop: boolean;
  isIos: boolean;
  onPromptNative?: () => Promise<boolean>;
}

export const PwaInstallGuideModal: React.FC<PwaInstallGuideModalProps> = ({
  isOpen,
  onClose,
  isDesktop,
  isIos,
  onPromptNative
}) => {
  const [activeTab, setActiveTab] = useState<"desktop" | "ios" | "android">(() => {
    if (isIos) return "ios";
    if (isDesktop) return "desktop";
    return "android";
  });

  useEffect(() => {
    if (isIos) setActiveTab("ios");
    else if (isDesktop) setActiveTab("desktop");
    else setActiveTab("android");
  }, [isIos, isDesktop]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease"
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--sf)",
          border: "1px solid var(--ln)",
          borderRadius: "var(--r-l)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ترويسة النافذة */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--r-m)",
                background: "color-mix(in srgb, var(--acc) 18%, transparent)",
                color: "var(--acc)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0
              }}
            >
              <Icons.Download size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1.3 }}>
                تثبيت المنصة كتطبيق أصيل (PWA)
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--ink-m)", marginTop: "2px" }}>
                يعمل على الحواسيب المحمولة والهواتف الذكية مع دعم كامل أوفلاين
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-icon btn-sm"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            style={{ borderRadius: "50%" }}
          >
            <Icons.Cross size={16} />
          </button>
        </div>

        {/* مبدل الأجهزة */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "4px",
            background: "var(--sf2)",
            padding: "4px",
            borderRadius: "var(--r-pill)",
            border: "1px solid var(--ln)"
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "desktop" ? "btn-primary" : ""}`}
            style={{ borderRadius: "var(--r-pill)", border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 8px" }}
            onClick={() => setActiveTab("desktop")}
          >
            <Icons.Laptop size={15} />
            <span>اللابتوب والحاسوب</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "ios" ? "btn-primary" : ""}`}
            style={{ borderRadius: "var(--r-pill)", border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 8px" }}
            onClick={() => setActiveTab("ios")}
          >
            <Icons.Mobile size={15} />
            <span>آيفون وآيباد</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "android" ? "btn-primary" : ""}`}
            style={{ borderRadius: "var(--r-pill)", border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 8px" }}
            onClick={() => setActiveTab("android")}
          >
            <Icons.Mobile size={15} />
            <span>أندرويد</span>
          </button>
        </div>

        {/* محتوى دليل التثبيت بحسب الجهاز */}
        {activeTab === "desktop" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "var(--sf2)", border: "1px solid var(--ln)", borderRadius: "var(--r-m)", padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--acc)", fontWeight: 800, fontSize: "0.88rem", marginBottom: "6px" }}>
                <Icons.Check size={16} />
                <span>طريقة التثبيت على اللابتوب (متصفحات Chrome / Edge / Brave):</span>
              </div>
              <ol style={{ paddingInlineStart: "20px", fontSize: "0.85rem", color: "var(--ink)", display: "flex", flexDirection: "column", gap: "10px", lineHeight: 1.6 }}>
                <li>
                  <b>أيقونة التثبيت في شريط العنوان (URL):</b> انظر إلى الطرف الأيمن أو الأيسر من شريط الرابط أعلى المتصفح؛ ستجد أيقونة تثبيت صغيرة (شاشة حاسوب مع سهم، أو علامة ⊕). اضغط عليها ثم اختر <b>«تثبيت» (Install)</b>.
                </li>
                <li>
                  <b>أو عبر قائمة المتصفح (⋮):</b> اضغط على القائمة الرئيسية في الزاوية العلوية للمتصفح، ثم اختر <b>«تثبيت المنصة الجامعية الموحدة»</b> أو ادخل إلى <b>«التطبيقات (Apps)»</b> ثم <b>«تثبيت هذا الموقع كتطبيق»</b>.
                </li>
              </ol>
            </div>

            <div style={{ background: "color-mix(in srgb, var(--acc) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--acc) 30%, transparent)", borderRadius: "var(--r-m)", padding: "12px 14px", fontSize: "0.82rem", color: "var(--ink)" }}>
              <span style={{ fontWeight: 800, color: "var(--acc)", display: "block", marginBottom: "4px" }}>
                ميزات التطبيق على اللابتوب:
              </span>
              تصفح كامل الشاشة دون أشرطة المتصفح المزدحمة، أيقونة مستقلة على سطح المكتب وشريط المهام (Taskbar)، وسرعة استجابة فائقة مع العمل كلياً بدون إنترنت.
            </div>
          </div>
        )}

        {activeTab === "ios" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "var(--sf2)", border: "1px solid var(--ln)", borderRadius: "var(--r-m)", padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--acc)", fontWeight: 800, fontSize: "0.88rem", marginBottom: "6px" }}>
                <Icons.Share size={16} />
                <span>طريقة التثبيت على Safari (آيفون وآيباد):</span>
              </div>
              <ol style={{ paddingInlineStart: "20px", fontSize: "0.85rem", color: "var(--ink)", display: "flex", flexDirection: "column", gap: "10px", lineHeight: 1.6 }}>
                <li>
                  اضغط على زر <b>المشاركة (Share)</b> في أسفل شريط Safari.
                </li>
                <li>
                  مرر للأسفل في قائمة الخيارات واختر <b>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</b>.
                </li>
                <li>
                  اضغط على <b>«إضافة» (Add)</b> في الزاوية العلوية لتثبيت التطبيق فوراً.
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === "android" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "var(--sf2)", border: "1px solid var(--ln)", borderRadius: "var(--r-m)", padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--acc)", fontWeight: 800, fontSize: "0.88rem", marginBottom: "6px" }}>
                <Icons.Check size={16} />
                <span>طريقة التثبيت على هواتف الأندرويد:</span>
              </div>
              <ol style={{ paddingInlineStart: "20px", fontSize: "0.85rem", color: "var(--ink)", display: "flex", flexDirection: "column", gap: "10px", lineHeight: 1.6 }}>
                <li>
                  اضغط على قائمة المتصفح <b>(الثلاث نقاط ⋮)</b> في الزاوية العلوية.
                </li>
                <li>
                  اختر <b>«تثبيت التطبيق» (Install app)</b> أو <b>«إضافة إلى الشاشة الرئيسية» (Add to Home screen)</b>.
                </li>
                <li>
                  أكّد التثبيت ليظهر التطبيق في شاشتك الرئيسية ويعمل بدون متصفح.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
          {onPromptNative && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ borderRadius: "var(--r-pill)", padding: "8px 18px", fontWeight: 800, fontSize: "0.84rem" }}
              onClick={async () => {
                const ok = await onPromptNative();
                if (ok) onClose();
              }}
            >
              <Icons.Download size={15} />
              <span>محاولة التثبيت المباشر الآن</span>
            </button>
          )}

          <button
            type="button"
            className="btn"
            style={{ borderRadius: "var(--r-pill)", padding: "8px 18px", fontSize: "0.84rem" }}
            onClick={onClose}
          >
            <span>فهمت ذلك</span>
          </button>
        </div>
      </div>
    </div>
  );
};

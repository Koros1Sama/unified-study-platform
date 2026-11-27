// ==============================================================================
// المنصة التعليمية الموحدة — بوابة اختيار المواد والفصول الدراسية
// Subject & Semester Portal (Term 1 & Term 2) · Dynamic Subject Addition
// ==============================================================================

import React, { useState } from "react";
import { Icons } from "../icons/SvgIcons";
import type { SubjectMeta } from "../../types";

interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectMeta[];
  currentSubjectCode: string;
  onSelectSubject: (code: string) => void;
  onRequestSubject?: () => void;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentSubjectCode,
  onSelectSubject,
  onRequestSubject
}) => {
  const [selectedTerm, setSelectedTerm] = useState<number | "all">("all");

  if (!isOpen) return null;

  const filtered = subjects.filter((s) => (selectedTerm === "all" ? true : s.term === selectedTerm));

  return (
    <div
      id="portalModal"
      className="portal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="بوابة اختيار المقررات"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        className="card usp-modal-card"
        style={{
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90dvh",
          overflowY: "auto",
          margin: 0,
          background: "var(--sf)",
          border: "1px solid var(--ln)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "18px" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Icons.Portal size={22} />
              <span>بوابة المقررات والفصول الدراسية</span>
            </h2>
            <p style={{ color: "var(--ink-m)", fontSize: "0.86rem", marginTop: "4px" }}>
              اختر المادة الدراسية لتصفح المحاضرات، الملخصات وبنوك الأسئلة
            </p>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="إغلاق البوابة" style={{ flexShrink: 0 }}>
            <Icons.Cross size={18} />
          </button>
        </div>

        {/* فلاتر الفصول الدراسية */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <button
            type="button"
            className={`btn btn-sm ${selectedTerm === "all" ? "btn-primary" : ""}`}
            onClick={() => setSelectedTerm("all")}
          >
            جميع الفصول
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedTerm === 1 ? "btn-primary" : ""}`}
            onClick={() => setSelectedTerm(1)}
          >
            الفصل الأول
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedTerm === 2 ? "btn-primary" : ""}`}
            onClick={() => setSelectedTerm(2)}
          >
            الفصل الثاني
          </button>
          {onRequestSubject && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                onClose();
                onRequestSubject();
              }}
              style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Icons.Plus size={14} />
              <span>طلب إضافة مادة / محتوى</span>
            </button>
          )}
        </div>

        {/* قائمة بطاقات المواد */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "14px" }}>
          {filtered.map((s) => {
            const isSelected = s.code === currentSubjectCode;
            return (
              <div
                key={s.code}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => {
                  onSelectSubject(s.code);
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSubject(s.code);
                    onClose();
                  }
                }}
                style={{
                  background: isSelected ? "color-mix(in srgb, var(--acc) 14%, var(--sf))" : "var(--sf2)",
                  border: `2px solid ${isSelected ? "var(--acc)" : "var(--ln)"}`,
                  borderRadius: "var(--r-m)",
                  padding: "16px",
                  cursor: "pointer",
                  transition: "all 0.16s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-pill)", background: "var(--sf)", color: "var(--ink-m)", border: "1px solid var(--ln)" }}>
                      ترم {s.term}
                    </span>
                    {s.page_layout === "book" && (
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 7px", borderRadius: "var(--r-pill)", background: "color-mix(in srgb, var(--acc) 14%, var(--sf))", color: "var(--acc)", border: "1px solid color-mix(in srgb, var(--acc) 35%, transparent)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Icons.BookOpen size={11} />
                        <span>كتاب مرجعي</span>
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: 800, color: s.accent_color || "var(--acc)", textTransform: "uppercase" }}>
                    {s.code}
                  </span>
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)", marginBottom: "4px" }}>
                  {s.name_ar}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--ink-m)", marginBottom: "10px" }}>
                  {s.name_en}
                </p>
                <div style={{ fontSize: "0.8rem", color: "var(--ink-m)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>المدرس:</span>
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>{s.professor_name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

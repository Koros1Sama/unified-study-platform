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
  onAddSubject: (subject: SubjectMeta) => void;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentSubjectCode,
  onSelectSubject,
  onAddSubject
}) => {
  const [selectedTerm, setSelectedTerm] = useState<number | "all">("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // New subject form state
  const [newCode, setNewCode] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newProfessor, setNewProfessor] = useState("");
  const [newTerm, setNewTerm] = useState<number>(2);
  const [newColor, setNewColor] = useState("#f5b13d");

  if (!isOpen) return null;

  const filtered = subjects.filter((s) => (selectedTerm === "all" ? true : s.term === selectedTerm));

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newNameAr) return;

    const subject: SubjectMeta = {
      code: newCode.trim().toLowerCase(),
      name_ar: newNameAr.trim(),
      name_en: newNameEn.trim() || newCode.toUpperCase(),
      term: newTerm,
      professor_name: newProfessor.trim() || "غير محدد",
      accent_color: newColor,
      is_active: true
    };

    onAddSubject(subject);
    setShowAddForm(false);
    setNewCode("");
    setNewNameAr("");
    setNewNameEn("");
    setNewProfessor("");
  };

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
        className="card"
        style={{
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          overflowY: "auto",
          margin: 0,
          background: "var(--sf)",
          border: "1px solid var(--ln)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Icons.Portal size={24} />
              <span>بوابة المقررات والفصول الدراسية</span>
            </h2>
            <p style={{ color: "var(--ink-m)", fontSize: "0.88rem", marginTop: "4px" }}>
              اختر المادة الدراسية لتصفح المحاضرات، الملخصات وبنوك الأسئلة
            </p>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="إغلاق البوابة">
            <Icons.Cross size={18} />
          </button>
        </div>

        {/* فلاتر الفصول الدراسية */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
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
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ marginRight: "auto" }}
          >
            {showAddForm ? "إلغاء الإضافة" : "+ إضافة مقرر جديد"}
          </button>
        </div>

        {/* نموذج إضافة مادة جديدة */}
        {showAddForm && (
          <form
            onSubmit={handleAddNew}
            style={{
              background: "var(--sf2)",
              border: "1px solid var(--ln)",
              borderRadius: "var(--r-m)",
              padding: "16px",
              marginBottom: "20px"
            }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "12px" }}>إضافة مقرر دراسي جديد أولاً بأول</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--ink-m)", marginBottom: "4px" }}>
                  كود المادة (إنجليزي)
                </label>
                <input
                  type="text"
                  placeholder="e.g. os, db, web"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--r-s)", border: "1px solid var(--ln)", background: "var(--sf)", color: "var(--ink)" }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--ink-m)", marginBottom: "4px" }}>
                  اسم المادة بالعربية
                </label>
                <input
                  type="text"
                  placeholder="e.g. نظم التشغيل"
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--r-s)", border: "1px solid var(--ln)", background: "var(--sf)", color: "var(--ink)" }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--ink-m)", marginBottom: "4px" }}>
                  اسم أستاذ المقرر
                </label>
                <input
                  type="text"
                  placeholder="e.g. د. فلان الفلاني"
                  value={newProfessor}
                  onChange={(e) => setNewProfessor(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--r-s)", border: "1px solid var(--ln)", background: "var(--sf)", color: "var(--ink)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--ink-m)", marginBottom: "4px" }}>
                  الفصل الدراسي
                </label>
                <select
                  value={newTerm}
                  onChange={(e) => setNewTerm(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--r-s)", border: "1px solid var(--ln)", background: "var(--sf)", color: "var(--ink)" }}
                >
                  <option value={1}>الفصل الأول</option>
                  <option value={2}>الفصل الثاني</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">حفظ وإدراج المقرر</button>
          </form>
        )}

        {/* قائمة بطاقات المواد */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "14px" }}>
          {filtered.map((s) => {
            const isSelected = s.code === currentSubjectCode;
            return (
              <div
                key={s.code}
                onClick={() => {
                  onSelectSubject(s.code);
                  onClose();
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--r-pill)", background: "var(--sf)", color: "var(--ink-m)", border: "1px solid var(--ln)" }}>
                    ترم {s.term}
                  </span>
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

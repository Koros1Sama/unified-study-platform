// ==============================================================================
// المنصة التعليمية الموحدة — نافذة تخصيص تسميات ألوان العلامات (BookmarkLabelModal)
// Zero Emojis Standard · 100% Vector SVG Line-Art
// ==============================================================================

import React, { useState, useEffect } from "react";
import { Icons } from "../icons/SvgIcons";
import type { BookmarkLabels } from "../../types";

interface BookmarkLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: BookmarkLabels;
  onSave: (newLabels: BookmarkLabels) => void;
}

export const BookmarkLabelModal: React.FC<BookmarkLabelModalProps> = ({
  isOpen,
  onClose,
  labels,
  onSave
}) => {
  const [red, setRed] = useState(labels.red || "أحمر");
  const [yellow, setYellow] = useState(labels.yellow || "أصفر");
  const [green, setGreen] = useState(labels.green || "أخضر");
  const [blue, setBlue] = useState(labels.blue || "أزرق");

  useEffect(() => {
    if (isOpen) {
      setRed(labels.red || "أحمر");
      setYellow(labels.yellow || "أصفر");
      setGreen(labels.green || "أخضر");
      setBlue(labels.blue || "أزرق");
    }
  }, [isOpen, labels]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      red: red.trim() || "أحمر",
      yellow: yellow.trim() || "أصفر",
      green: green.trim() || "أخضر",
      blue: blue.trim() || "أزرق"
    });
    onClose();
  };

  return (
    <div className="ref-modal" role="dialog" aria-modal="true" aria-label="تسمية العلامات">
      <div className="ref-modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="ref-modal-close"
          onClick={onClose}
          title="إغلاق"
          aria-label="إغلاق"
        >
          <Icons.Cross size={18} />
        </button>

        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--acc)", display: "inline-flex" }}>
            <Icons.Bookmark size={18} />
          </span>
          <span>تخصيص تسميات ألوان العلامات</span>
        </div>

        <p style={{ fontSize: "0.82rem", color: "var(--ink-m)", marginBottom: 16, lineHeight: 1.5 }}>
          يمكنك تحديد مسمى وتصنيف خاص لكل لون لتسهيل مراجعة الأسئلة وفق خطتك الدراسية:
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
            {/* الأحمر */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bm-red, #ef4444)", flexShrink: 0 }} />
              <input
                type="text"
                value={red}
                onChange={(e) => setRed(e.target.value)}
                placeholder="تسمية اللون الأحمر (مثال: هام جداً)"
                style={{ flex: 1, padding: "8px 12px", fontSize: "0.84rem", borderRadius: "var(--r-s)", border: "1px solid var(--ln)", background: "var(--sf2)", color: "var(--ink)" }}
              />
            </div>

            {/* الأصفر */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bm-yellow, #f59e0b)", flexShrink: 0 }} />
              <input
                type="text"
                value={yellow}
                onChange={(e) => setYellow(e.target.value)}
                placeholder="تسمية اللون الأصفر (مثال: يحتاج مراجعة ثانية)"
                style={{ flex: 1, padding: "8px 12px", fontSize: "0.84rem", borderRadius: "var(--r-s)", border: "1px solid var(--ln)", background: "var(--sf2)", color: "var(--ink)" }}
              />
            </div>

            {/* الأخضر */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bm-green, #10b981)", flexShrink: 0 }} />
              <input
                type="text"
                value={green}
                onChange={(e) => setGreen(e.target.value)}
                placeholder="تسمية اللون الأخضر (مثال: تم إتقانه تماماً)"
                style={{ flex: 1, padding: "8px 12px", fontSize: "0.84rem", borderRadius: "var(--r-s)", border: "1px solid var(--ln)", background: "var(--sf2)", color: "var(--ink)" }}
              />
            </div>

            {/* الأزرق */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bm-blue, #3b82f6)", flexShrink: 0 }} />
              <input
                type="text"
                value={blue}
                onChange={(e) => setBlue(e.target.value)}
                placeholder="تسمية اللون الأزرق (مثال: سؤال فخ دقيق)"
                style={{ flex: 1, padding: "8px 12px", fontSize: "0.84rem", borderRadius: "var(--r-s)", border: "1px solid var(--ln)", background: "var(--sf2)", color: "var(--ink)" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icons.Check size={14} />
              <span>حفظ التسميات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

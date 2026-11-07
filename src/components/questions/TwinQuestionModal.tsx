// ==============================================================================
// المنصة التعليمية الموحدة — نافذة تفاصيل وتوحيد الأسئلة التوأم (Twin Modal)
// Identical Duplicate Questions Modal · Conflict Resolution · Bidirectional Sync Note
// Zero Emojis Standard · 100% Vector SVG Line-Art
// ==============================================================================

import React, { useEffect } from "react";
import { Icons } from "../icons/SvgIcons";
import { cleanArabicOnly } from "../common/SmartTranslateTooltip";
import type { UnifiedQuestion } from "../../types";

interface TwinQuestionModalProps {
  question: UnifiedQuestion;
  twinQuestion?: UnifiedQuestion;
  onClose: () => void;
  onJumpToQuestion?: (questionId: string) => void;
}

export const TwinQuestionModal: React.FC<TwinQuestionModalProps> = ({
  question,
  twinQuestion,
  onClose,
  onJumpToQuestion
}) => {
  const currNum = question.orig_q_num;
  const twinNum = twinQuestion ? twinQuestion.orig_q_num : currNum;

  // إغلاق عبر زر الهروب Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isQ106_114 =
    (currNum === 106 && twinNum === 114) ||
    (currNum === 114 && twinNum === 106) ||
    (question.question_en.toLowerCase().includes("generalised conclusion") &&
      question.question_en.toLowerCase().includes("sample"));

  const letters = ["A", "B", "C", "D", "E"];
  const correctIdx = question.correct_answer;

  return (
    <div
      className="twin-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="تفاصيل السؤال التوأم"
    >
      <div
        className="twin-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="twin-modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid var(--ln)", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "0.95rem", padding: "4px 10px", background: "var(--sf2)", borderRadius: "8px", border: "1px solid var(--ln)" }}>
              س{currNum} ⟷ س{twinNum}
            </span>
            <span style={{ background: "color-mix(in srgb, var(--acc) 12%, transparent)", color: "var(--acc)", border: "1px solid color-mix(in srgb, var(--acc) 35%, transparent)", borderRadius: "8px", padding: "4px 10px", fontWeight: 700, fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Icons.Twin size={13} />
              <span>سؤالان متطابقان بنسبة 100% (توأم مدمج)</span>
            </span>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={onClose}
            style={{ minWidth: "32px", padding: "4px 8px" }}
            aria-label="إغلاق النافذة"
          >
            <Icons.Cross size={14} />
          </button>
        </div>

        {/* صندوق الشرح التوضيحي المعتمد */}
        <div style={{ background: "color-mix(in srgb, var(--acc) 8%, var(--sf2))", border: "1px solid color-mix(in srgb, var(--acc) 25%, var(--ln))", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, fontSize: "0.92rem", color: "var(--acc)", marginBottom: "8px" }}>
            <Icons.Definitions size={16} />
            <span>توضيح شامل ومفصل لدمج وتوحيد هذين السؤالين:</span>
          </div>
          <div style={{ fontSize: "0.86rem", lineHeight: 1.8, color: "var(--ink)" }}>
            <p style={{ margin: "0 0 8px" }}>
              <strong>1. لماذا يظهر هذا الوسم؟</strong> ورد هذا السؤال مرتين في بنك الأسئلة الرسمي المعتمد من الدكتور؛ الأولى برقم <strong>س{Math.min(currNum, twinNum)}</strong> والثانية برقم <strong>س{Math.max(currNum, twinNum)}</strong> بنفس الصياغة والخيارات حرفياً بنسبة 100% دون أي اختلاف.
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>2. حسم التناقضات السابقة:</strong> في بعض ملخصات ونماذج الطلاب القديمة، كان يتم تأشير خيار مختلف في كل موضع مما يربك الطالب. قمنا بالتدقيق العلمي الأكاديمي المنهجي ومطابقته مع سلايدات المحاضرات لحسم الحل الصحيح وتوحيده بشكل قاطع في كلا الموضعين.
            </p>
            <p style={{ margin: 0 }}>
              <strong>3. المزامنة الذكية لحماية وقتك:</strong> عند حلك أو تعديلك لأحد السؤالين (س{currNum} أو س{twinNum}) أو إضافة علامة مرجعية له، يقوم النظام تلقائياً وبشكل فوري بمزامنة الحل والعلامة للسؤال التوأم الآخر، وتوحيد النتيجة والإحصائيات دون أي تكرار أو مجهود مضاعف.
            </p>
          </div>
        </div>

        {/* تنبيه خاص بحسم الخلاف لسؤال س106 وس114 إن وجد */}
        {isQ106_114 && (
          <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", fontSize: "0.84rem", lineHeight: 1.7, color: "var(--ink)" }}>
            <strong style={{ color: "#10b981" }}>حسم الخلاف في هذا السؤال تحديداً:</strong> في بعض تجميعات الطلاب القديمة كان يتم اختيار (D) في موضع و (C) في موضع آخر؛ تم الرجوع لسلايدات المنهجية الرسمية والتأكيد الأكاديمي بأن الاستنتاج العام المبني على دراسة العينة هو <strong>Statistical inference (الاستدلال الإحصائي)</strong> وتم توحيده واعتماده هنا بشكل قطعي.
          </div>
        )}

        {/* عرض نص السؤال الموحد */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-m)", marginBottom: "4px" }}>نص السؤال المعتمد:</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)", marginBottom: "4px", direction: "ltr", textAlign: "left" }}>
            {question.question_en}
          </div>
          {question.question_ar && (
            <div style={{ fontSize: "0.88rem", color: "var(--ink-m)", direction: "rtl", textAlign: "right" }}>
              {cleanArabicOnly(question.question_ar)}
            </div>
          )}
        </div>

        {/* قائمة الخيارات مع إبراز الإجابة الموحدة */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {question.options_en.map((optEn, idx) => {
            const isCorrectOpt = idx === correctIdx;
            const optAr = question.options_ar?.[idx];
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: isCorrectOpt ? "2px solid #10b981" : "1px solid var(--ln)",
                  background: isCorrectOpt ? "rgba(16, 185, 129, 0.12)" : "var(--sf2)",
                  transition: "all var(--dur) var(--ease)"
                }}
              >
                <span
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background: isCorrectOpt ? "#10b981" : "var(--sf)",
                    color: isCorrectOpt ? "#fff" : "var(--ink)",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    flexShrink: 0
                  }}
                >
                  {letters[idx] || idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: isCorrectOpt ? 700 : 500, color: "var(--ink)", direction: "ltr", textAlign: "left" }}>
                    {optEn}
                  </div>
                  {optAr && (
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-m)", marginTop: "2px", direction: "rtl", textAlign: "right" }}>
                      {cleanArabicOnly(optAr)}
                    </div>
                  )}
                  {isCorrectOpt && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 700, color: "#10b981", marginTop: "4px" }}>
                      <Icons.Check size={13} />
                      <span>الإجابة النموذجية الموحدة والمعتمدة</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* التعليل الأكاديمي المعتمد */}
        {question.why_correct && (
          <div style={{ background: "var(--sf2)", border: "1px solid var(--ln)", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", fontSize: "0.84rem", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--acc)", display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
              <Icons.Check size={14} />
              <span>التعليل العلمي المعتمد:</span>
            </strong>
            <div style={{ color: "var(--ink)" }}>{cleanArabicOnly(question.why_correct)}</div>
          </div>
        )}

        {/* أزرار الإجراءات في أسفل النافذة */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid var(--ln)", paddingTop: "12px" }}>
          {twinQuestion && onJumpToQuestion && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => {
                onClose();
                onJumpToQuestion(twinQuestion.id);
              }}
            >
              <Icons.Jump size={13} />
              <span>الانتقال للسؤال التوأم (س{twinNum})</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm"
            onClick={onClose}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

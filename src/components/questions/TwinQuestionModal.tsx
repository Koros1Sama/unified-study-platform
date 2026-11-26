// ==============================================================================
// المنصة التعليمية الموحدة — نافذة تفاصيل وتوحيد الأسئلة التوأم (Twin Modal)
// Identical Duplicate Questions Modal · Conflict Resolution · Bidirectional Sync Note
// Zero Emojis Standard · 100% Vector SVG Line-Art
// ==============================================================================

import React, { useEffect, useMemo } from "react";
import { Icons } from "../icons/SvgIcons";
import { cleanArabicOnly } from "../../lib/textUtils";
import type { QuestionModelInfo, UnifiedQuestion } from "../../types";

interface TwinQuestionModalProps {
  question: UnifiedQuestion;
  twinQuestion?: UnifiedQuestion;
  twinGroup?: UnifiedQuestion[];
  models?: QuestionModelInfo[];
  syncTwins?: boolean;
  onClose: () => void;
  onJumpToQuestion?: (questionId: string) => void;
}

export const TwinQuestionModal: React.FC<TwinQuestionModalProps> = ({
  question,
  twinQuestion,
  twinGroup,
  models = [],
  syncTwins = false,
  onClose,
  onJumpToQuestion
}) => {
  const allTwins = useMemo(() => {
    const raw =
      twinGroup && twinGroup.length > 0
        ? twinGroup
        : twinQuestion
          ? [question, twinQuestion]
          : [question];
    const dedup = new Map<string, UnifiedQuestion>();
    raw.forEach((q) => dedup.set(q.id, q));
    return Array.from(dedup.values()).sort((a, b) => {
      if (a.orig_q_num !== b.orig_q_num) return (a.orig_q_num || 0) - (b.orig_q_num || 0);
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }, [question, twinQuestion, twinGroup]);

  const otherTwins = useMemo(
    () => allTwins.filter((q) => q.id !== question.id),
    [allTwins, question.id]
  );

  const modelLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    models.forEach((m) => {
      map.set(m.id, m.short_label || m.title_ar || m.id.toUpperCase());
    });
    return map;
  }, [models]);

  const currNum = question.orig_q_num;
  const twinNums = allTwins.map((t) => t.orig_q_num);
  const twinNumsJoined = twinNums.map((n) => `س${n}`).join(" ⟷ ");
  const twinCount = allTwins.length;

  // إغلاق عبر زر الهروب Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isQ106_114 =
    (twinNums.includes(106) && twinNums.includes(114)) ||
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
        <div className="twin-modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid var(--ln)", paddingBottom: "12px", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "0.95rem", padding: "4px 10px", background: "var(--sf2)", borderRadius: "8px", border: "1px solid var(--ln)" }}>
              {twinNumsJoined}
            </span>
            <span style={{ background: "color-mix(in srgb, var(--acc) 12%, transparent)", color: "var(--acc)", border: "1px solid color-mix(in srgb, var(--acc) 35%, transparent)", borderRadius: "8px", padding: "4px 10px", fontWeight: 700, fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Icons.Twin size={13} />
              <span>
                {twinCount <= 2
                  ? "سؤالان متطابقان بنسبة 100% (توأم مدمج)"
                  : `${twinCount} نسخ متطابقة بنسبة 100% (مجموعة توائم)`}
              </span>
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

        {/* قائمة كافة المواضع المتطابقة */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
          {allTwins.map((item) => {
            const isCurrent = item.id === question.id;
            const mLabel = modelLabelMap.get(item.model_id) || item.model_id.toUpperCase();
            return (
              <button
                key={item.id}
                type="button"
                disabled={isCurrent || !onJumpToQuestion}
                className={`fchip ${isCurrent ? "on" : ""}`}
                style={{
                  fontSize: "0.76rem",
                  padding: "4px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: isCurrent ? "default" : "pointer"
                }}
                onClick={() => {
                  if (!isCurrent && onJumpToQuestion) {
                    onClose();
                    onJumpToQuestion(item.id);
                  }
                }}
              >
                {!isCurrent && <Icons.Jump size={12} />}
                <span>
                  س{item.orig_q_num} · {mLabel}
                  {isCurrent ? " (الحالي)" : ""}
                </span>
              </button>
            );
          })}
        </div>

        {/* صندوق الشرح التوضيحي المعتمد */}
        <div style={{ background: "color-mix(in srgb, var(--acc) 8%, var(--sf2))", border: "1px solid color-mix(in srgb, var(--acc) 25%, var(--ln))", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, fontSize: "0.92rem", color: "var(--acc)", marginBottom: "8px" }}>
            <Icons.Definitions size={16} />
            <span>توضيح توحيد هذه النسخ المتطابقة:</span>
          </div>
          <div style={{ fontSize: "0.86rem", lineHeight: 1.8, color: "var(--ink)" }}>
            <p style={{ margin: "0 0 8px" }}>
              <strong>1. لماذا يظهر هذا الوسم؟</strong> ورد هذا السؤال{" "}
              {twinCount === 2 ? "مرتين" : `${twinCount} مرات`} في بنك الأسئلة الرسمي بالأرقام{" "}
              <strong>{twinNums.map((n) => `س${n}`).join("، ")}</strong> بنفس الصياغة والخيارات حرفياً دون اختلاف.
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>2. توحيد الإجابة النموذجية:</strong> تم تدقيق ومطابقة الحل الصحيح مع الشرائح الرسمية وتوحيده في جميع هذه المواضع لمنع التضارب بين النماذج.
            </p>
            <p style={{ margin: 0 }}>
              <strong>3. حالة مزامنة الحلول حالياً:</strong>{" "}
              {syncTwins ? (
                <>
                  المزامنة التلقائية للتوائم <strong style={{ color: "var(--ok)" }}>مفعّلة</strong> — عند حل س{currNum} أو تعديله أو إضافة علامة ملونة له، تتم مزامنة الحل والعلامة تلقائياً في بقية النسخ المتطابقة.
                </>
              ) : (
                <>
                  المزامنة التلقائية للتوائم <strong style={{ color: "var(--warn)" }}>متوقفة حالياً</strong> من الإعدادات — يمكنك حل كل نسخة على حدة للتدريب، أو تفعيل خيار «مزامنة التوائم» من لوحة الإعدادات لتوحيد الحلول تلقائياً.
                </>
              )}
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid var(--ln)", paddingTop: "12px" }}>
          {onJumpToQuestion &&
            otherTwins.map((other) => (
              <button
                key={other.id}
                type="button"
                className="btn btn-sm btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => {
                  onClose();
                  onJumpToQuestion(other.id);
                }}
              >
                <Icons.Jump size={13} />
                <span>الانتقال إلى س{other.orig_q_num}</span>
              </button>
            ))}
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

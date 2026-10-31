// ==============================================================================
// المنصة التعليمية الموحدة — بطاقة السؤال وتفنيد المشتتات المزدوج
// Full double refutation for EVERY distractor (why wrong + when correct),
// 4-color bookmarks, explanation mode compliance, quick-solve tactics, essay reveal.
// Zero Emojis Standard · 100% Vector SVG Line-Art
// ==============================================================================

import React, { useState, useEffect, useRef } from "react";
import { Icons } from "../icons/SvgIcons";
import { cleanArabicOnly } from "../common/SmartTranslateTooltip";
import { resolveAssetUrl } from "../../lib/dataService";
import type { UnifiedQuestion, DistractorDetail, ExplanationMode, BookmarkColor, BookmarkLabels } from "../../types";

interface QuestionCardProps {
  question: UnifiedQuestion;
  displayNumber?: number;
  userAnswer?: { selected_answer: number; is_correct: boolean };
  flagged?: boolean;
  onAnswer: (questionId: string, answerIdx: number, isCorrect: boolean, twinGroupId?: string) => void;
  onToggleFlag?: (questionId: string) => void;
  onJumpToSlide?: (ref: string) => void;
  onShowTranslate?: (text: string, pos: { x: number; y: number }) => void;
  languageMode?: "smart" | "en" | "ar" | "both";
  readOnly?: boolean;
  showBookmarks?: boolean;
  bookmarks?: string[];
  bmLabels?: BookmarkLabels;
  onToggleBookmark?: (color: string) => void;
  onOpenBmLabelModal?: () => void;
  expMode?: ExplanationMode;
}

export function parseDistractorItem(item: DistractorDetail | string | undefined): DistractorDetail {
  if (!item) {
    return {
      why_wrong: "خيار غير مطابق للسياق المعتمد.",
      when_correct: "في المسائل المعاكسة لهذا المفهوم."
    };
  }
  if (typeof item === "object" && "why_wrong" in item) {
    return {
      why_wrong: item.why_wrong || "خيار غير مطابق للمطلوب.",
      when_correct: item.when_correct || "في سياق امتحاني بديل."
    };
  }

  const text = String(item);
  const regex = /(?:[\s—–|\-•.,،;/\\]+|\s*\()\s*(?:متى\s*(?:يكون\s*)?(?:صحيح[^\s:：\-—]*|صواب[^\s:：\-—]*|يصح[^\s:：\-—]*)|السيناريو\s+(?:البديل|الصحيح))\s*[:：\?؟\-—]*\s*/iu;
  const parts = text.split(regex);
  if (parts.length > 1) {
    return { why_wrong: parts[0].trim(), when_correct: parts[1].trim().replace(/\)+$/, "") };
  }

  return {
    why_wrong: text.trim(),
    when_correct: "في حال عكست صيغة السؤال أو طُلب المفهوم المقابل له."
  };
}

const QuestionCardComponent: React.FC<QuestionCardProps> = ({
  question,
  displayNumber,
  userAnswer,
  flagged = false,
  onAnswer,
  onToggleFlag,
  onJumpToSlide,
  onShowTranslate,
  languageMode = "smart",
  readOnly = false,
  showBookmarks = true,
  bookmarks = [],
  bmLabels,
  onToggleBookmark,
  onOpenBmLabelModal,
  expMode = "always"
}) => {
  const isEssay = question.type === "essay";
  const isAnswered = Boolean(userAnswer) && !isEssay && (userAnswer?.selected_answer ?? -1) >= 0;
  const selectedIdx = userAnswer?.selected_answer;
  const isCorrect = isAnswered && selectedIdx === question.correct_answer;

  const [showExplanation, setShowExplanation] = useState<boolean>(() => {
    if (!isAnswered) return false;
    if (expMode === "always") return true;
    if (expMode === "wrong_only") return !isCorrect;
    return false;
  });
  const [showEssay, setShowEssay] = useState<boolean>(false);
  const [showAllAnalysis, setShowAllAnalysis] = useState<boolean>(true);
  const [isBmDropdownOpen, setIsBmDropdownOpen] = useState<boolean>(false);
  const bmWrapRef = useRef<HTMLDivElement>(null);

  // تحديث حالة الشرح عند تغيير نمط العرض
  useEffect(() => {
    if (isAnswered) {
      if (expMode === "always") setShowExplanation(true);
      else if (expMode === "wrong_only") setShowExplanation(!isCorrect);
    }
  }, [expMode, isAnswered, isCorrect]);

  // إغلاق قائمة العلامات عند النقر خارجها
  useEffect(() => {
    if (!isBmDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bmWrapRef.current && !bmWrapRef.current.contains(e.target as Node)) {
        setIsBmDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isBmDropdownOpen]);

  const cardStatusClass = isAnswered
    ? isCorrect
      ? "answered-right"
      : "answered-wrong"
    : "";

  const handleSelectOption = (idx: number) => {
    const ok = idx === question.correct_answer;
    onAnswer(question.id, idx, ok, question.twin_group_id);

    if (expMode === "always") {
      setShowExplanation(true);
    } else if (expMode === "wrong_only") {
      setShowExplanation(!ok);
    } else {
      setShowExplanation(false);
    }
    setShowAllAnalysis(true);
  };

  const handleTranslateClick = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (onShowTranslate) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      onShowTranslate(cleanArabicOnly(text), { x: rect.left, y: rect.bottom + 6 });
    }
  };

  const correctOptionText =
    question.options_en[question.correct_answer] ||
    question.options_ar[question.correct_answer] ||
    "";

  const wrongOptions = question.options_en
    .map((_, idx) => idx)
    .filter((idx) => idx !== question.correct_answer);

  return (
    <article
      id={`q-${question.id}`}
      className={`q-card ${cardStatusClass}`}
      style={{ scrollMarginTop: "80px" }}
    >
      <div className="q-head">
        <span className="q-num">س {displayNumber || question.orig_q_num}</span>

        {isEssay ? (
          <span className="q-type" style={{ color: "var(--acc)", borderColor: "var(--acc)" }}>سؤال مقالي</span>
        ) : question.type === "tf" ? (
          <span className="q-type" style={{ color: "var(--warn)", borderColor: "var(--warn)" }}>صح / خطأ</span>
        ) : (
          <span className="q-type">اختيار من متعدد</span>
        )}

        <span className="q-orig-model-badge">{question.model_id.toUpperCase()}</span>

        {question.is_ai_predicted && (
          <span className="q-ai-badge">تنبؤ ذكي</span>
        )}

        {question.twin_group_id && (
          <span className="q-twin-badge" title="سؤال مدمج مع توأم مطابق">
            <Icons.Twin size={11} />
            مدمج
          </span>
        )}

        {/* زر العلامات الملونة (Bookmarks) */}
        {showBookmarks && onToggleBookmark && (
          <div ref={bmWrapRef} className="q-bm-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`q-bm-btn ${bookmarks.length > 0 ? "has-bm" : ""}`}
              onClick={() => setIsBmDropdownOpen(!isBmDropdownOpen)}
              title="علامات المراجعة الملونة"
            >
              <Icons.Bookmark size={12} />
              <span>علامة</span>
              {bookmarks.length > 0 && (
                <span className="bm-dots-strip">
                  {bookmarks.map((c) => {
                    const hex = c === "red" ? "#ef4444" : c === "yellow" ? "#f59e0b" : c === "green" ? "#10b981" : "#3b82f6";
                    return (
                      <span
                        key={c}
                        className="bm-mini-dot"
                        style={{ background: hex }}
                      />
                    );
                  })}
                </span>
              )}
            </button>

            {isBmDropdownOpen && (
              <div className="bm-menu show">
                <div className="bm-menu-title">العلامات الملونة</div>
                <div className="bm-palette">
                  {(["red", "yellow", "green", "blue"] as BookmarkColor[]).map((c) => {
                    const isAct = bookmarks.includes(c);
                    const colName = bmLabels?.[c] || (c === "red" ? "أحمر" : c === "yellow" ? "أصفر" : c === "green" ? "أخضر" : "أزرق");
                    const hex = c === "red" ? "#ef4444" : c === "yellow" ? "#f59e0b" : c === "green" ? "#10b981" : "#3b82f6";
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`bm-color-dot ${isAct ? "active" : ""}`}
                        style={{ background: hex }}
                        title={colName}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(c);
                        }}
                      />
                    );
                  })}
                </div>
                {onOpenBmLabelModal && (
                  <button
                    type="button"
                    className="bm-menu-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsBmDropdownOpen(false);
                      onOpenBmLabelModal();
                    }}
                  >
                    <Icons.Pen size={12} />
                    <span>تسمية العلامات</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {onToggleFlag && (
          <button
            type="button"
            className={`q-flag-btn ${flagged ? "on" : ""}`}
            onClick={() => onToggleFlag(question.id)}
            title={flagged ? "إزالة من المراجعة السريعة" : "تعليم للمراجعة السريعة"}
            aria-pressed={flagged}
          >
            <Icons.Flag size={13} />
            <span>{flagged ? "معلّم" : "علّم"}</span>
          </button>
        )}

        {isAnswered && !readOnly && (
          <button
            type="button"
            className="q-undo-btn q-head-undo"
            onClick={() => {
              setShowExplanation(false);
              onAnswer(question.id, -1, false, question.twin_group_id);
            }}
            title="إلغاء اختيار هذا السؤال لإعادة المحاولة"
          >
            <Icons.Reset size={12} />
            <span>إعادة</span>
          </button>
        )}

        {question.slide_ref && onJumpToSlide && (
          <button
            type="button"
            className="ref-chip q-ref"
            onClick={() => onJumpToSlide(question.slide_ref!)}
            title={`الانتقال إلى شريحة ${question.slide_ref}`}
            style={{ marginInlineStart: "auto" }}
          >
            <Icons.Slides size={12} />
            <span>{question.slide_ref}</span>
          </button>
        )}
      </div>

      <div className="q-text" style={{ margin: "10px 0 14px" }}>
        {(languageMode === "en" || languageMode === "both" || languageMode === "smart") && question.question_en && (
          <div
            className={`q-stem-en ${languageMode === "smart" && question.question_ar ? "hover-ar" : ""}`}
            data-ar={cleanArabicOnly(question.question_ar || "")}
            onClick={(e) => {
              if (languageMode === "smart" && question.question_ar && onShowTranslate) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onShowTranslate(cleanArabicOnly(question.question_ar), { x: rect.left, y: rect.bottom + 6 });
              }
            }}
          >
            {question.question_en}
          </div>
        )}
        {(languageMode === "ar" || languageMode === "both" || (languageMode === "smart" && question.question_ar)) && (
          <div className="q-stem-ar">
            {cleanArabicOnly(question.question_ar || question.question_en)}
          </div>
        )}
        {question.image_url && (
          <img className="q-image" src={resolveAssetUrl(question.image_url)} alt={question.slide_ref || question.id} loading="lazy" />
        )}
      </div>

      {/* الأسئلة المقالية: إجابة نموذجية قابلة للكشف */}
      {isEssay ? (
        <div className="essay-box">
          <button
            type="button"
            className="btn btn-sm essay-reveal"
            onClick={() => setShowEssay(!showEssay)}
          >
            <Icons.Eye size={14} />
            <span>{showEssay ? "إخفاء الإجابة النموذجية" : "اكشف الإجابة النموذجية"}</span>
          </button>
          {showEssay && (
            <div className="essay-ans show">
              {question.essay_answer_ar && (
                <div className="essay-ans-ar">{cleanArabicOnly(question.essay_answer_ar)}</div>
              )}
              {question.essay_answer_en && (
                <div className="essay-ans-en" dir="ltr">{question.essay_answer_en}</div>
              )}
              {!question.essay_answer_ar && !question.essay_answer_en && (
                <div className="essay-ans-ar">{cleanArabicOnly(question.why_correct || "لا توجد إجابة نموذجية محفوظة لهذا السؤال.")}</div>
              )}
            </div>
          )}
          {question.exam_tip && (
            <div className="q-tip">
              <div className="t-head"><Icons.Tip size={14} /> تكتيك الإجابة المقالية</div>
              <div>{question.exam_tip}</div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="opts">
            {question.options_en.map((optEn, idx) => {
              const optAr = question.options_ar ? question.options_ar[idx] : undefined;
              const isSelected = selectedIdx === idx;
              const isRightOpt = idx === question.correct_answer;
              const isRtlOpt = languageMode === "ar" || (!optEn && !!optAr);

              let btnClass = "opt-btn " + (isRtlOpt ? "is-rtl" : "is-ltr");
              if (isAnswered) {
                if (isRightOpt) btnClass += " correct";
                else if (isSelected) btnClass += " wrong selected";
                else btnClass += " dimmed";
              } else if (isSelected) {
                btnClass += " selected";
              }

              const letter = question.type === "tf"
                ? (languageMode === "ar" ? (idx === 0 ? "ص" : "خ") : (idx === 0 ? "T" : "F"))
                : String.fromCharCode(65 + idx);

              return (
                <div key={idx} className="opt-row">
                  <button
                    type="button"
                    className={btnClass}
                    data-correct={isAnswered && isRightOpt ? "true" : undefined}
                    onClick={() => handleSelectOption(idx)}
                    disabled={readOnly}
                  >
                    <span className="letter">{letter}</span>
                    <span className={`opt-text-wrap ${isRtlOpt ? "is-rtl" : "is-ltr"}`}>
                      {languageMode === "ar" && optAr ? (
                        <span className="opt-ar">{cleanArabicOnly(optAr)}</span>
                      ) : languageMode === "both" ? (
                        <div>
                          <div className="opt-en">{optEn}</div>
                          {optAr && (
                            <div className="opt-ar" style={{ fontSize: "0.82rem", color: "var(--ink-m)", marginTop: "2px", direction: "rtl", textAlign: "right" }}>
                              {cleanArabicOnly(optAr)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="opt-en">{optEn}</span>
                      )}
                    </span>
                  </button>

                  {optAr && languageMode === "smart" && onShowTranslate && (
                    <button
                      type="button"
                      className="opt-tr"
                      onClick={(e) => handleTranslateClick(e, optAr)}
                      title="عرض الترجمة العربية الفورية"
                      aria-label="ترجمة"
                    >
                      <Icons.Translate size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {isAnswered && (
            <div className="q-feedback show">
              <div className="q-verdict-row">
                <span className={`q-verdict ${isCorrect ? "ok" : "err"}`}>
                  {isCorrect ? <Icons.Check size={16} /> : <Icons.Cross size={16} />}
                  <span>{isCorrect ? "إجابة صحيحة ومطابقة للبنك المعتمد" : "إجابة خاطئة — راجع تفنيد الخيارات أدناه"}</span>
                </span>

                <button
                  type="button"
                  className="ref-chip q-toggle-exp-btn"
                  onClick={() => setShowExplanation(!showExplanation)}
                >
                  <span>{showExplanation ? "طي التعليل" : "فتح التعليل المفصل"}</span>
                </button>
              </div>

              {question.exam_tip && (
                <div className="q-tip" style={{ marginBottom: "12px" }}>
                  <div className="t-head"><Icons.Tip size={14} /> تكتيك الحل السريع في 5 ثوانٍ</div>
                  <div>{question.exam_tip}</div>
                </div>
              )}

              {showExplanation && (
                <div className="q-exp-body">
                  {/* الخيار الصائب المعتمد */}
                  <div className={`why-item correct ${selectedIdx === question.correct_answer ? "user-picked" : ""}`}>
                    <div className="w-head">
                      <span className="why-opt-letter">{String.fromCharCode(65 + question.correct_answer)}</span>
                      <span className="why-opt-title" dir={isRtl(correctOptionText) ? "rtl" : "ltr"}>
                        {correctOptionText}
                      </span>
                      <span className="why-kind-badge why-badge-picked-correct">الخيار الصائب المعتمد</span>
                    </div>
                    <div className="why-section why-correct-section">
                      <div className="why-sec-title">
                        <Icons.Check size={14} />
                        <span>التعليل العلمي للصواب (حسب البنك المعتمد):</span>
                      </div>
                      <div className="why-sec-text">
                        {cleanArabicOnly(
                          question.why_correct ||
                            (correctOptionText
                              ? `الخيار «${correctOptionText}» هو المطابق الوحيد للتعريف أو الشرط المعتمد في السؤال.`
                              : "الخيار يطابق تعريف المفهوم المعتمد في السلايدات.")
                        )}
                      </div>
                    </div>
                  </div>

                  {/* تفنيد جميع الخيارات المشتتة الأخرى */}
                  {wrongOptions.map((optIdx) => {
                    const detail = parseDistractorItem(question.distractor_analysis?.[String(optIdx)]);
                    const isUserPick = selectedIdx === optIdx;
                    const optText = question.options_en[optIdx] || question.options_ar[optIdx];
                    return (
                      <div key={optIdx} className={`why-item wrong ${isUserPick ? "user-picked" : ""}`}>
                        <div className="w-head">
                          <span className="why-opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                          <span className="why-opt-title" dir={isRtl(optText) ? "rtl" : "ltr"}>
                            {optText}
                          </span>
                          {isUserPick && (
                            <span className="why-kind-badge why-badge-picked-wrong">اختيارك (إجابة خاطئة)</span>
                          )}
                        </div>

                        {detail.why_wrong && (
                          <div className="why-section why-wrong-section">
                            <div className="why-sec-title">
                              <Icons.Cross size={14} />
                              <span>لماذا هذا الخيار خطأ هنا؟ (علة الاستبعاد):</span>
                            </div>
                            <div className="why-sec-text">{cleanArabicOnly(detail.why_wrong)}</div>
                          </div>
                        )}

                        {detail.when_correct && (
                          <div className="why-section why-when-section">
                            <div className="why-sec-title">
                              <Icons.Target size={14} />
                              <span>متى يكون هذا الخيار بالذات هو الصحيح؟ (السيناريو الامتحاني البديل):</span>
                            </div>
                            <div className="why-sec-text">{cleanArabicOnly(detail.when_correct)}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(question.tg_url || question.tg_msg_id) && (
                    <div className="q-source-row" style={{ marginTop: "12px" }}>
                      {question.tg_url && (
                        <a className="ref-chip q-tglink" href={question.tg_url} target="_blank" rel="noopener noreferrer">
                          <Icons.Jump size={12} />
                          <span>مصدر السؤال في القناة</span>
                        </a>
                      )}
                      {question.tg_msg_id && <span className="q-src-id">MSG #{question.tg_msg_id}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
};

export const QuestionCard = React.memo(QuestionCardComponent, (prev, next) => {
  return (
    prev.question.id === next.question.id &&
    prev.displayNumber === next.displayNumber &&
    prev.flagged === next.flagged &&
    prev.readOnly === next.readOnly &&
    prev.showBookmarks === next.showBookmarks &&
    prev.languageMode === next.languageMode &&
    prev.expMode === next.expMode &&
    prev.userAnswer?.selected_answer === next.userAnswer?.selected_answer &&
    prev.userAnswer?.is_correct === next.userAnswer?.is_correct &&
    prev.bookmarks?.length === next.bookmarks?.length &&
    prev.bmLabels === next.bmLabels &&
    prev.question === next.question
  );
});

function isRtl(text?: string): boolean {
  return Boolean(text && /[\u0600-\u06FF]/.test(text));
}

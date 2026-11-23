// ==============================================================================
// المنصة التعليمية الموحدة — بطاقة السؤال وتفنيد المشتتات المزدوج
// Full double refutation for EVERY distractor (why wrong + when correct),
// 4-color bookmarks, explanation mode compliance, quick-solve tactics, essay reveal.
// Zero Emojis Standard · 100% Vector SVG Line-Art
// ==============================================================================

import React, { useState, useEffect, useRef } from "react";
import { Icons } from "../icons/SvgIcons";
import { cleanArabicOnly } from "../../lib/textUtils";
import { resolveAssetUrl } from "../../lib/dataService";
import type { UnifiedQuestion, DistractorDetail, ExplanationMode, BookmarkColor, BookmarkLabels } from "../../types";

interface QuestionCardProps {
  question: UnifiedQuestion;
  displayNumber?: number;
  userAnswer?: { selected_answer: number; is_correct: boolean };
  onAnswer: (questionId: string, answerIdx: number, isCorrect: boolean, twinGroupId?: string) => void;
  onJumpToSlide?: (ref: string) => void;
  onShowTranslate?: (text: string, pos: { x: number; y: number }) => void;
  onScheduleHideTranslate?: () => void;
  languageMode?: "smart" | "en" | "ar" | "both";
  readOnly?: boolean;
  examBlindMode?: boolean;
  showBookmarks?: boolean;
  bookmarks?: string[];
  bmLabels?: BookmarkLabels;
  onToggleBookmark?: (color: string) => void;
  onOpenBmLabelModal?: () => void;
  expMode?: ExplanationMode;
  onOpenTwinModal?: (question: UnifiedQuestion) => void;
  twinNumber?: number;
  isRetestQuestion?: boolean;
  expPromptSeen?: boolean;
  onDismissExpPrompt?: () => void;
  onOpenExpSettings?: () => void;
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
  onAnswer,
  onJumpToSlide,
  onShowTranslate,
  onScheduleHideTranslate,
  languageMode = "smart",
  readOnly = false,
  examBlindMode = false,
  showBookmarks = true,
  bookmarks = [],
  bmLabels,
  onToggleBookmark,
  onOpenBmLabelModal,
  expMode = "always",
  onOpenTwinModal,
  twinNumber,
  isRetestQuestion = false,
  expPromptSeen = true,
  onDismissExpPrompt,
  onOpenExpSettings
}) => {
  const isEssay = question.type === "essay";
  const isEssayReviewed = isEssay && (userAnswer?.selected_answer ?? -1) >= 0;
  const isAnswered = Boolean(userAnswer) && !isEssay && (userAnswer?.selected_answer ?? -1) >= 0;
  const showFeedback = isAnswered && !examBlindMode;
  const selectedIdx = userAnswer?.selected_answer;
  const isCorrect = isAnswered && selectedIdx === question.correct_answer;

  const [showExplanation, setShowExplanation] = useState<boolean>(() => {
    if (!showFeedback) return false;
    if (expMode === "always") return true;
    if (expMode === "wrong_only") return !isCorrect;
    return false;
  });
  const [showEssay, setShowEssay] = useState<boolean>(false);
  const [isBmDropdownOpen, setIsBmDropdownOpen] = useState<boolean>(false);
  const [bmAlign, setBmAlign] = useState<"left" | "right">("right");
  const bmWrapRef = useRef<HTMLDivElement>(null);

  // تحديث حالة الشرح عند تغيير نمط العرض أو تصفير الإجابة
  useEffect(() => {
    if (!showFeedback) {
      setShowExplanation(false);
    } else if (expMode === "always") {
      setShowExplanation(true);
    } else if (expMode === "wrong_only") {
      setShowExplanation(!isCorrect);
    } else {
      setShowExplanation(false);
    }
  }, [expMode, showFeedback, isCorrect]);

  // إغلاق قائمة العلامات عند النقر أو اللمس خارجها
  useEffect(() => {
    if (!isBmDropdownOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (bmWrapRef.current && !bmWrapRef.current.contains(e.target as Node)) {
        setIsBmDropdownOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [isBmDropdownOpen]);

  const handleToggleBmMenu = () => {
    setIsBmDropdownOpen((prev) => {
      const next = !prev;
      if (next && bmWrapRef.current && typeof window !== "undefined") {
        const rect = bmWrapRef.current.getBoundingClientRect();
        // إذا كان الزر في النصف الأيمن من الشاشة نثبت القائمة على يمينه كي تمتد يساراً داخل الشاشة، والعكس صحيح
        setBmAlign(rect.left + rect.width / 2 >= window.innerWidth / 2 ? "right" : "left");
      }
      return next;
    });
  };

  const cardStatusClass = showFeedback
    ? isCorrect
      ? "answered-right"
      : "answered-wrong"
    : "";

  const handleSelectOption = (idx: number) => {
    // في وضع المحاكاة العمياء يسمح للطالب بتبديل اختياره بحرية قبل التسليم
    if (isAnswered && !examBlindMode) return;
    const ok = idx === question.correct_answer;
    onAnswer(question.id, idx, ok, question.twin_group_id);

    if (!examBlindMode) {
      if (expMode === "always") {
        setShowExplanation(true);
      } else if (expMode === "wrong_only") {
        setShowExplanation(!ok);
      } else {
        setShowExplanation(false);
      }
    }
  };

  const handleTranslateClick = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (onShowTranslate) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      onShowTranslate(cleanArabicOnly(text), { x: rect.left, y: rect.bottom + 6 });
    }
  };

  const optionsEn = Array.isArray(question?.options_en) ? question.options_en : [];
  const optionsAr = Array.isArray(question?.options_ar) ? question.options_ar : [];

  const correctOptionText =
    optionsEn[question.correct_answer] ||
    optionsAr[question.correct_answer] ||
    "";

  const wrongOptions = optionsEn
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

        {isRetestQuestion && (
          <span className="retest-q-badge" title="سؤال لإعادة اختبار الأخطاء السابقة">
            إعادة اختبار
          </span>
        )}

        {question.is_ai_predicted && (
          <span className="q-ai-badge">تنبؤ ذكي</span>
        )}

        {question.twin_group_id && (
          <button
            type="button"
            className="q-twin-badge"
            title={`سؤال متكرر بصيغة مطابقة${twinNumber ? ` (س${twinNumber})` : ""} — انقر للمقارنة`}
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenTwinModal) onOpenTwinModal(question);
            }}
          >
            <Icons.Twin size={11} />
            <span>{twinNumber ? `متكرر · س${twinNumber}` : "سؤال متكرر"}</span>
          </button>
        )}

        {/* زر العلامات الملونة (Bookmarks) */}
        {showBookmarks && onToggleBookmark && (
          <div ref={bmWrapRef} className="q-bm-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`q-bm-btn ${bookmarks.length > 0 ? "has-bm" : ""}`}
              onClick={handleToggleBmMenu}
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
              <div className={`bm-menu show align-${bmAlign}`}>
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


        {showFeedback && !readOnly && (
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
            className={`q-stem-en ${languageMode === "smart" && question.question_ar && question.question_ar.trim() !== question.question_en.trim() ? "hover-ar" : ""}`}
            data-ar={cleanArabicOnly(question.question_ar || "")}
            onPointerEnter={(e) => {
              if (
                e.pointerType === "mouse" &&
                languageMode === "smart" &&
                question.question_ar &&
                question.question_ar.trim() !== question.question_en.trim() &&
                onShowTranslate
              ) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onShowTranslate(cleanArabicOnly(question.question_ar), { x: rect.left + rect.width / 2, y: rect.bottom + 4 });
              }
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse" && onScheduleHideTranslate) {
                onScheduleHideTranslate();
              }
            }}
            onClick={(e) => {
              if (languageMode === "smart" && question.question_ar && question.question_ar.trim() !== question.question_en.trim() && onShowTranslate) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onShowTranslate(cleanArabicOnly(question.question_ar), { x: rect.left + rect.width / 2, y: rect.bottom + 6 });
              }
            }}
          >
            {question.question_en}
          </div>
        )}
        {(languageMode === "ar" || (languageMode === "both" && question.question_ar && question.question_ar.trim() !== question.question_en.trim()) || (!question.question_en && question.question_ar)) && (
          <div className="q-stem-ar">
            {cleanArabicOnly(question.question_ar || question.question_en)}
          </div>
        )}
        {question.image_url && (
          <img className="q-image" src={resolveAssetUrl(question.image_url)} alt={question.slide_ref || question.id} loading="lazy" />
        )}
      </div>

      {/* الأسئلة المقالية: إجابة نموذجية قابلة للكشف + تتبع المراجعة */}
      {isEssay ? (
        <div className="essay-box">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-sm essay-reveal"
              onClick={() => setShowEssay(!showEssay)}
            >
              <Icons.Eye size={14} />
              <span>{showEssay ? "إخفاء الإجابة النموذجية" : "اكشف الإجابة النموذجية"}</span>
            </button>
            {!readOnly && (
              <button
                type="button"
                className={`fchip ${isEssayReviewed ? "on" : ""}`}
                onClick={() =>
                  onAnswer(question.id, isEssayReviewed ? -1 : 0, !isEssayReviewed, question.twin_group_id)
                }
                title="تعليم هذا السؤال المقالي كمُراجَع لاحتسابه في التقدم"
              >
                <Icons.Check size={13} />
                <span>{isEssayReviewed ? "تمت مراجعته" : "علّم كمُراجَع"}</span>
              </button>
            )}
          </div>
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
            {optionsEn.map((optEn, idx) => {
              const optAr = optionsAr[idx];
              const isSelected = selectedIdx === idx;
              const isRightOpt = idx === question.correct_answer;
              const isRtlOpt = languageMode === "ar" || (!optEn && !!optAr);

              let btnClass = "opt-btn " + (isRtlOpt ? "is-rtl" : "is-ltr");
              if (showFeedback) {
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
                  {optAr && optEn && optAr !== optEn && languageMode === "smart" && onShowTranslate && (
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

                  <button
                    type="button"
                    className={btnClass}
                    data-correct={showFeedback && isRightOpt ? "true" : undefined}
                    onClick={() => handleSelectOption(idx)}
                    onPointerEnter={(e) => {
                      if (
                        e.pointerType === "mouse" &&
                        languageMode === "smart" &&
                        optAr &&
                        optAr.trim() !== optEn.trim() &&
                        onShowTranslate
                      ) {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onShowTranslate(cleanArabicOnly(optAr), { x: rect.left + rect.width / 2, y: rect.bottom + 4 });
                      }
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse" && onScheduleHideTranslate) {
                        onScheduleHideTranslate();
                      }
                    }}
                    disabled={readOnly}
                  >
                    <span className="letter">{letter}</span>
                    <span className={`opt-text-wrap ${isRtlOpt ? "is-rtl" : "is-ltr"}`}>
                      {languageMode === "ar" && (optAr || optEn) ? (
                        <span className="opt-ar">{cleanArabicOnly(optAr || optEn)}</span>
                      ) : languageMode === "both" ? (
                        <div>
                          <div className="opt-en">{optEn}</div>
                          {optAr && optAr.trim() !== optEn.trim() && (
                            <div className="opt-ar" style={{ fontSize: "0.82rem", color: "var(--ink-m)", marginTop: "2px", direction: "rtl", textAlign: "right" }}>
                              {cleanArabicOnly(optAr)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className={`opt-en ${languageMode === "smart" && optAr && optAr.trim() !== optEn.trim() ? "hover-ar" : ""}`}>
                          {optEn}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {showFeedback && (
            <div className="q-feedback show">
              <div className="q-verdict-row">
                <span className={`q-verdict ${isCorrect ? "ok" : "err"}`}>
                  {isCorrect ? <Icons.Check size={16} /> : <Icons.Cross size={16} />}
                  <span>
                    {isCorrect
                      ? "إجابة صحيحة!"
                      : `إجابة خاطئة — الصحيح: ${
                          question.type === "tf"
                            ? languageMode === "ar"
                              ? question.correct_answer === 0
                                ? "ص"
                                : "خ"
                              : question.correct_answer === 0
                              ? "T"
                              : "F"
                            : String.fromCharCode(65 + question.correct_answer)
                        }`}
                  </span>
                </span>

                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    className={`ref-chip q-toggle-exp-btn ${showExplanation ? "is-active" : ""}`}
                    onClick={() => setShowExplanation(!showExplanation)}
                    title={showExplanation ? "طي الشرح والتعليل المفصل" : "عرض الشرح والتعليل المفصل"}
                  >
                    {showExplanation ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}
                    <span>{showExplanation ? "إخفاء الشرح" : "عرض الشرح والتعليل"}</span>
                  </button>

                  {!readOnly && (
                    <button
                      type="button"
                      className="ref-chip q-undo-btn"
                      onClick={() => {
                        setShowExplanation(false);
                        onAnswer(question.id, -1, false, question.twin_group_id);
                      }}
                      title="إلغاء اختيار هذا السؤال لإعادة المحاولة من جديد"
                    >
                      <Icons.Reset size={12} />
                      <span>إلغاء الاختيار</span>
                    </button>
                  )}
                </div>
              </div>

              {question.exam_tip && (
                <div className="q-tip" style={{ marginBottom: "12px" }}>
                  <div className="t-head"><Icons.Tip size={14} /> تكتيك الحل السريع في 5 ثوانٍ</div>
                  <div>{question.exam_tip}</div>
                </div>
              )}

              {showExplanation && (
                <div className="q-exp-body">
                  {!expPromptSeen && (
                    <div className="q-exp-prompt-banner">
                      <div className="q-exp-prompt-content">
                        <Icons.Eye size={16} />
                        <span>ألا يعجبك ظهور الشرح تلقائياً؟ ادخل الإعدادات لتغيير ذلك وضبطه</span>
                      </div>
                      <div className="q-exp-prompt-actions">
                        <button
                          type="button"
                          className="q-exp-prompt-btn"
                          title="تخصيص وضع ظهور الشرح والتعليل من لوحة الإعدادات"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenExpSettings?.();
                          }}
                        >
                          ضبط الإعدادات
                        </button>
                        <button
                          type="button"
                          className="q-exp-prompt-close"
                          title="إغلاق هذه الرسالة وعدم إظهارها مجدداً"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissExpPrompt?.();
                          }}
                        >
                          فهمت
                        </button>
                      </div>
                    </div>
                  )}
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
                    const optText = optionsEn[optIdx] || optionsAr[optIdx];
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

function sameStringList(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const QuestionCard = React.memo(QuestionCardComponent, (prev, next) => {
  return (
    prev.question === next.question &&
    prev.displayNumber === next.displayNumber &&
    prev.readOnly === next.readOnly &&
    prev.examBlindMode === next.examBlindMode &&
    prev.showBookmarks === next.showBookmarks &&
    prev.languageMode === next.languageMode &&
    prev.expMode === next.expMode &&
    prev.expPromptSeen === next.expPromptSeen &&
    prev.isRetestQuestion === next.isRetestQuestion &&
    prev.twinNumber === next.twinNumber &&
    prev.userAnswer?.selected_answer === next.userAnswer?.selected_answer &&
    prev.userAnswer?.is_correct === next.userAnswer?.is_correct &&
    sameStringList(prev.bookmarks, next.bookmarks) &&
    prev.bmLabels === next.bmLabels &&
    prev.onAnswer === next.onAnswer
  );
});

function isRtl(text?: string): boolean {
  return Boolean(text && /[\u0600-\u06FF]/.test(text));
}

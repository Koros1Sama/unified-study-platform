// ==============================================================================
// المنصة التعليمية الموحدة — محاكي الاختبار (Exam Simulator)
// Bank scope · timed/stopwatch · flagging · palette statuses · grade · history ·
// weak-area review. Zero Emojis.
// ==============================================================================

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Icons } from "../icons/SvgIcons";
import { QuestionCard } from "./QuestionCard";
import { SmartTranslateTooltip } from "../common/SmartTranslateTooltip";
import { fisherYatesShuffle } from "../../lib/textUtils";
import type { ExplanationMode, UnifiedQuestion, UserStudyProgress } from "../../types";

interface ExamSimulatorProps {
  questions: UnifiedQuestion[];
  models?: Array<{ id: string; title_ar: string; short_label?: string }>;
  lectures?: Array<{ id: string; title_ar: string }>;
  examHistory?: UserStudyProgress["exam_history"];
  onRecordResult: (result: { total: number; score: number; timeSpentSec: number; mode: string }) => void;
  onJumpToSlide?: (ref: string) => void;
  languageMode?: "smart" | "en" | "ar" | "both";
  expMode?: ExplanationMode;
  expPromptSeen?: boolean;
  onDismissExpPrompt?: () => void;
  onOpenExpSettings?: () => void;
}

type ReviewFilter = "all" | "wrong" | "correct" | "unanswered" | "flagged";

function gradeFor(percent: number) {
  if (percent >= 90) return { label: "A+", cls: "a" };
  if (percent >= 80) return { label: "A", cls: "a" };
  if (percent >= 70) return { label: "B", cls: "b" };
  if (percent >= 60) return { label: "C", cls: "c" };
  if (percent >= 50) return { label: "D", cls: "c" };
  return { label: "F", cls: "f" };
}

export const ExamSimulator: React.FC<ExamSimulatorProps> = ({
  questions,
  models = [],
  lectures = [],
  examHistory = [],
  onRecordResult,
  onJumpToSlide,
  languageMode = "smart",
  expMode = "always",
  expPromptSeen = true,
  onDismissExpPrompt,
  onOpenExpSettings
}) => {
  const [examState, setExamState] = useState<"setup" | "running" | "results">("setup");
  const [scope, setScope] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">("countdown");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20);
  const [examGradingMode, setExamGradingMode] = useState<"blind" | "instant">("blind");
  const [examQuestions, setExamQuestions] = useState<UnifiedQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<
    Record<string, { selected_answer: number; is_correct: boolean }>
  >({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const submittedRef = useRef<boolean>(false);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    text: string;
    pos: { x: number; y: number } | null;
  }>({ visible: false, text: "", pos: null });
  const hoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverHideTimerRef.current) clearTimeout(hoverHideTimerRef.current);
    };
  }, []);

  const handleCloseTooltip = useCallback(() => {
    setTooltipState((s) => (s.visible ? { ...s, visible: false } : s));
  }, []);

  const handleShowTranslate = useCallback((text: string, pos: { x: number; y: number }) => {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
    setTooltipState({ visible: true, text, pos });
  }, []);

  const handleScheduleHideTranslate = useCallback(() => {
    if (hoverHideTimerRef.current) clearTimeout(hoverHideTimerRef.current);
    hoverHideTimerRef.current = setTimeout(() => {
      setTooltipState((s) => ({ ...s, visible: false }));
    }, 180);
  }, []);

  const handleCancelHideTranslate = useCallback(() => {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  }, []);

  const examEligibleQuestions = useMemo(
    () => questions.filter((q) => q.type !== "essay" && q.options_en.length > 0),
    [questions]
  );

  const pool = useMemo(
    () => (scope === "all" ? examEligibleQuestions : examEligibleQuestions.filter((q) => q.model_id === scope)),
    [examEligibleQuestions, scope]
  );

  const startExam = (customPool?: UnifiedQuestion[]) => {
    const source = customPool && customPool.length > 0 ? customPool : pool;
    if (source.length === 0) return;
    const shuffled = fisherYatesShuffle(source);
    const selected = customPool && customPool.length > 0
      ? shuffled
      : shuffled.slice(0, Math.min(questionCount, source.length));
    submittedRef.current = false;
    setExamQuestions(selected);
    setCurrentIdx(0);
    setUserAnswers({});
    setFlagged(new Set());
    setReviewFilter("all");
    const totalSecs = timeLimitMinutes * 60;
    setSecondsRemaining(totalSecs);
    setTimeSpent(0);
    setExamState("running");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finishExam = useCallback((isAuto = false) => {
    if (submittedRef.current) return;
    if (!isAuto) {
      const answeredCount = Object.values(userAnswers).filter((a) => a.selected_answer >= 0).length;
      const unanswered = examQuestions.length - answeredCount;
      if (
        unanswered > 0 &&
        !window.confirm(`لا تزال هناك ${unanswered} أسئلة لم تُجب عنها بعد. هل تريد إنهاء الاختبار وتسليمه الآن؟`)
      ) {
        return;
      }
    }
    submittedRef.current = true;
    let score = 0;
    examQuestions.forEach((q) => {
      if (userAnswers[q.id]?.is_correct) score++;
    });
    onRecordResult({
      total: examQuestions.length,
      score,
      timeSpentSec: timeSpent,
      mode: `${examQuestions.length}Q-${scope === "all" ? "all" : scope}-${timerMode === "countdown" ? `${timeLimitMinutes}m` : "open"}-${examGradingMode}`
    });
    setExamState("results");
  }, [examQuestions, userAnswers, onRecordResult, timeSpent, scope, timerMode, timeLimitMinutes, examGradingMode]);

  useEffect(() => {
    if (examState !== "running") return;
    const timer = setInterval(() => {
      setTimeSpent((s) => s + 1);
      if (timerMode === "countdown") {
        setSecondsRemaining((sec) => Math.max(0, sec - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [examState, timerMode]);

  useEffect(() => {
    if (examState === "running" && timerMode === "countdown" && secondsRemaining === 0 && !submittedRef.current) {
      finishExam(true);
    }
  }, [examState, timerMode, secondsRemaining, finishExam]);

  const handleAnswerQuestion = (qId: string, ansIdx: number, isOk: boolean) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: { selected_answer: ansIdx, is_correct: isOk }
    }));
  };

  const toggleFlag = (qId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (examEligibleQuestions.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--ink-m)" }}>
        <p>لا توجد أسئلة اختيار من متعدد متوفرة حالياً لإنشاء امتحان تجريبي.</p>
      </div>
    );
  }

  if (examState === "setup") {
    return (
      <div id="examView">
        {/* الترويسة الأكاديمية الكانونية (.headline) المتناغمة مع باقي المنصة */}
        <div className="headline">
          <div className="kicker">
            <span className="dot"></span>
            <span>محاكي الاختبار النهائي</span>
          </div>
          <h1>محاكي الاختبار التجريبي</h1>
          <p className="sub">
            اختبر جاهزيتك تحت ضغط زمني واقعي مع لوحة أسئلة تفاعلية وأعلام مراجعة ودرجة تقديرية فورية.
          </p>
        </div>

        <div className="exam-setup">
          <div className="exam-setup-head">
            <div className="exam-setup-icon"><Icons.Exam size={22} /></div>
            <div>
              <h2>تخصيص جلسة الاختبار</h2>
              <p>اختر النطاق وعدد الأسئلة ونمط المؤقت وطريقة التصحيح للبدء فوراً.</p>
            </div>
          </div>

          <div className="exam-setup-grid">
            <div className="exam-field">
              <label>نطاق الأسئلة (البنك)</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">البنك الشامل ({examEligibleQuestions.length})</option>
                {models.map((m) => {
                  const count = examEligibleQuestions.filter((q) => q.model_id === m.id).length;
                  if (count === 0) return null;
                  return <option key={m.id} value={m.id}>{m.short_label || m.id.toUpperCase()} · {m.title_ar} ({count})</option>;
                })}
              </select>
            </div>

            <div className="exam-field">
              <label>عدد الأسئلة</label>
              <div className="exam-pills">
                {[10, 20, 30, 50, 100]
                  .filter((n) => n <= pool.length || n === 10)
                  .map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`fchip ${questionCount === Math.min(n, pool.length) ? "on" : ""}`}
                      onClick={() => setQuestionCount(Math.min(n, pool.length))}
                    >
                      {Math.min(n, pool.length)} سؤالاً
                    </button>
                  ))}
              </div>
            </div>

            <div className="exam-field">
              <label>نمط التصحيح</label>
              <div className="exam-pills">
                <button
                  type="button"
                  className={`fchip ${examGradingMode === "blind" ? "on" : ""}`}
                  onClick={() => setExamGradingMode("blind")}
                >
                  <Icons.Exam size={13} />
                  امتحان حقيقي (تصحيح بعد التسليم)
                </button>
                <button
                  type="button"
                  className={`fchip ${examGradingMode === "instant" ? "on" : ""}`}
                  onClick={() => setExamGradingMode("instant")}
                >
                  <Icons.Check size={13} />
                  تدريب فوري (إظهار النتيجة مباشرة)
                </button>
              </div>
            </div>

            <div className="exam-field">
              <label>نمط المؤقت</label>
              <div className="exam-pills">
                <button
                  type="button"
                  className={`fchip ${timerMode === "countdown" ? "on" : ""}`}
                  onClick={() => setTimerMode("countdown")}
                >
                  <Icons.Clock size={13} />
                  عد تنازلي
                </button>
                <button
                  type="button"
                  className={`fchip ${timerMode === "stopwatch" ? "on" : ""}`}
                  onClick={() => setTimerMode("stopwatch")}
                >
                  <Icons.Clock size={13} />
                  ساعة إيقاف
                </button>
              </div>
            </div>

            {timerMode === "countdown" && (
              <div className="exam-field">
                <label>المدة الزمنية</label>
                <div className="exam-pills">
                  {[10, 20, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`fchip ${timeLimitMinutes === m ? "on" : ""}`}
                      onClick={() => setTimeLimitMinutes(m)}
                    >
                      {m} دقيقة
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="button" className="btn btn-primary exam-start-btn" disabled={pool.length === 0} onClick={() => startExam()}>
            بدء جلسة الامتحان الآن ({Math.min(questionCount, pool.length)} سؤالاً)
          </button>

          {examHistory.length > 0 && (
            <div className="exam-mini-history">
              <div className="exam-mini-history-head">
                <Icons.Award size={15} />
                <span>آخر المحاولات</span>
              </div>
              <div className="exam-mini-history-list">
                {examHistory.slice(0, 5).map((entry, idx) => {
                  const pct = entry.total > 0 ? Math.round((entry.score / entry.total) * 100) : 0;
                  const g = gradeFor(pct);
                  return (
                    <div key={idx} className="exam-history-row">
                      <span className={`grade-badge ${g.cls}`}>{g.label}</span>
                      <span>{entry.score} / {entry.total}</span>
                      <b>{pct}%</b>
                      <span className="exam-history-mode">{entry.mode}</span>
                      <span className="exam-history-date">
                        {new Date(entry.date).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (examState === "running") {
    const currentQ = examQuestions[currentIdx];
    const answeredCount = Object.values(userAnswers).filter((a) => a.selected_answer >= 0).length;
    const timeValue = timerMode === "countdown" ? secondsRemaining : timeSpent;
    const urgent = timerMode === "countdown" && secondsRemaining <= 300;

    return (
      <div id="examRunningView">
        <div className="card exam-hud">
          <div className="exam-hud-left">
            <span className="exam-hud-progress">السؤال {currentIdx + 1} من {examQuestions.length}</span>
            <span className="exam-hud-meta">تم حل {answeredCount} · معلّم {flagged.size}</span>
          </div>

          <div className="exam-hud-right">
            <div className={`exam-hud-timer ${urgent ? "urgent" : ""}`}>
              <Icons.Clock size={18} />
              <span>{formatTime(timeValue)}</span>
            </div>
            <button type="button" className="btn btn-sm exam-finish-btn" onClick={() => finishExam(false)}>
              إنهاء وتسليم
            </button>
          </div>
        </div>

        <div className="exam-progress-line">
          <span style={{ width: `${Math.round((answeredCount / examQuestions.length) * 100)}%` }} />
        </div>

        {currentQ && (
          <QuestionCard
            question={currentQ}
            displayNumber={currentIdx + 1}
            userAnswer={userAnswers[currentQ.id]}
            onAnswer={handleAnswerQuestion}
            onJumpToSlide={onJumpToSlide}
            onShowTranslate={handleShowTranslate}
            onScheduleHideTranslate={handleScheduleHideTranslate}
            languageMode={languageMode}
            expMode={expMode}
            expPromptSeen={expPromptSeen}
            onDismissExpPrompt={onDismissExpPrompt}
            onOpenExpSettings={onOpenExpSettings}
            examBlindMode={examGradingMode === "blind"}
          />
        )}

        <div className="exam-nav">
          <button
            type="button"
            className="btn btn-sm"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          >
            <Icons.ChevronRight size={16} />
            <span>السابق</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${flagged.has(currentQ.id) ? "btn-warning" : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => toggleFlag(currentQ.id)}
            title="تأجيل أو تمييز السؤال للمراجعة قبل تسليم الاختبار"
          >
            <Icons.Flag size={14} />
            <span>{flagged.has(currentQ.id) ? "مؤجل للمراجعة" : "تأجيل للمراجعة"}</span>
          </button>

          <div className="exam-palette">
            {examQuestions.map((q, idx) => {
              const ans = userAnswers[q.id];
              const isAns = ans && ans.selected_answer >= 0;
              const isCurr = idx === currentIdx;
              const isFlag = flagged.has(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`exam-pal-btn ${isCurr ? "is-current" : ""} ${isAns ? "is-answered" : ""} ${isFlag ? "is-flagged" : ""}`}
                  onClick={() => setCurrentIdx(idx)}
                  title={`سؤال ${idx + 1}${isFlag ? " · معلّم" : ""}${isAns ? " · محلول" : ""}`}
                >
                  {idx + 1}
                  {isFlag && <i className="exam-pal-flag" />}
                </button>
              );
            })}
          </div>

          {currentIdx < examQuestions.length - 1 ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setCurrentIdx((i) => i + 1)}>
              <span>التالي</span>
              <Icons.ChevronLeft size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => finishExam(false)}>
              <span>تسليم نهائي</span>
              <Icons.Check size={16} />
            </button>
          )}
        </div>

        <SmartTranslateTooltip
          visible={tooltipState.visible}
          textAr={tooltipState.text}
          position={tooltipState.pos}
          onClose={handleCloseTooltip}
          onMouseEnterTooltip={handleCancelHideTranslate}
          onMouseLeaveTooltip={handleScheduleHideTranslate}
        />
      </div>
    );
  }

  const totalScore = examQuestions.filter((q) => userAnswers[q.id]?.is_correct).length;
  const percent = examQuestions.length > 0 ? Math.round((totalScore / examQuestions.length) * 100) : 0;
  const grade = gradeFor(percent);
  const elapsed = timeSpent;

  const wrongOrUnansweredQuestions = examQuestions.filter((q) => {
    const ans = userAnswers[q.id];
    return !ans || ans.selected_answer < 0 || !ans.is_correct;
  });
  const flaggedQuestionsList = examQuestions.filter((q) => flagged.has(q.id));

  const byLecture = (() => {
    const hasLec = lectures.length > 0 && examQuestions.some((q) => Boolean(q.lecture_id || q.slide_ref));
    const map = new Map<string, { label: string; total: number; correct: number; wrong: number }>();
    examQuestions.forEach((q) => {
      const key = hasLec
        ? q.lecture_id || (q.slide_ref ? q.slide_ref.split("-")[0] : "عام")
        : q.model_id;
      const label = hasLec
        ? (() => {
            const lm = lectures.find((l) => l.id === key);
            return lm ? `${key} · ${lm.title_ar}` : key;
          })()
        : (() => {
            const mm = models.find((m) => m.id === key);
            return mm ? mm.short_label || mm.title_ar : key;
          })();
      const entry = map.get(key) || { label, total: 0, correct: 0, wrong: 0 };
      entry.total++;
      if (userAnswers[q.id]?.is_correct) entry.correct++;
      else entry.wrong++;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([lec, entry]) => ({
        lec,
        ...entry,
        pct: Math.round((entry.correct / entry.total) * 100)
      }))
      .sort((a, b) => a.pct - b.pct);
  })();

  const weakestAreas = byLecture.filter((b) => b.wrong > 0).slice(0, 3);

  const reviewList = examQuestions.filter((q) => {
    const ans = userAnswers[q.id];
    if (reviewFilter === "wrong") return ans && ans.selected_answer >= 0 && !ans.is_correct;
    if (reviewFilter === "correct") return ans?.is_correct;
    if (reviewFilter === "unanswered") return !ans || ans.selected_answer < 0;
    if (reviewFilter === "flagged") return flagged.has(q.id);
    return true;
  });

  return (
    <div id="examResultsView">
      <div className="exam-result-card">
        <div className="exam-result-score">
          <div className={`score-circle ${grade.cls}`}>
            <b>{percent}%</b>
            <span>{totalScore} / {examQuestions.length}</span>
          </div>
          <div className="exam-result-info">
            <div className={`grade-badge ${grade.cls}`}>{grade.label}</div>
            <h2>تقرير نتيجة الاختبار التجريبي</h2>
            <p>
              أجبت بشكل صحيح عن {totalScore} من أصل {examQuestions.length} سؤالاً في مدة {formatTime(elapsed)}.
            </p>
            <div className="exam-result-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {wrongOrUnansweredQuestions.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: "var(--ok)", borderColor: "var(--ok)", color: "#fff" }}
                  onClick={() => startExam(wrongOrUnansweredQuestions)}
                >
                  <Icons.Rotate size={15} />
                  <span>إعادة اختبار الأخطاء فقط ({wrongOrUnansweredQuestions.length})</span>
                </button>
              )}
              {flaggedQuestionsList.length > 0 && (
                <button
                  type="button"
                  className="btn"
                  style={{ background: "var(--warn)", borderColor: "var(--warn)", color: "#000" }}
                  onClick={() => startExam(flaggedQuestionsList)}
                >
                  <Icons.Flag size={15} />
                  <span>إعادة اختبار المميزة ({flaggedQuestionsList.length})</span>
                </button>
              )}
              <button type="button" className="btn" onClick={() => startExam()}>
                <Icons.Shuffle size={15} />
                <span>اختبار جديد بنفس الإعدادات</span>
              </button>
              <button type="button" className="btn" onClick={() => setExamState("setup")}>
                <Icons.Settings size={15} />
                <span>تعديل الإعدادات</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`exam-rec-card ${weakestAreas.length > 0 ? "is-warn" : ""}`}>
          <div className="exam-rec-head">
            <Icons.Award size={16} />
            <span>التوصية الذكية للمراجعة قبل الامتحان النهائي</span>
          </div>
          <div className="exam-rec-text">
            {weakestAreas.length === 0 ? (
              "أداء متفوق! أجبت على جميع الأسئلة بشكل صحيح. يمكنك خوض اختبار شامل جديد لرفع سرعة الاستجابة."
            ) : (
              <>
                أضعف محاورك في هذه المحاولة:{" "}
                <b>{weakestAreas.map((w) => `${w.label} (${w.pct}%)`).join(" · ")}</b>. اضغط على
                «إعادة اختبار الأخطاء فقط» لإعادة تدريب الأسئلة الخاطئة والمتروكة حتى تتقنها بنسبة 100%.
              </>
            )}
          </div>
        </div>

        <div className="exam-mastery">
          <div className="exam-mastery-head">
            <Icons.Target size={15} />
            <span>تحليل الإتقان التفصيلي</span>
          </div>
          {byLecture.map((entry) => (
            <div key={entry.lec} className="exam-mastery-row">
              <span className="exam-mastery-lec" title={entry.label}>{entry.label}</span>
              <span className="exam-mastery-bar"><span style={{ width: `${entry.pct}%` }} /></span>
              <b>{entry.correct} / {entry.total} ({entry.pct}%)</b>
            </div>
          ))}
        </div>
      </div>

      <div className="fchips" style={{ margin: "18px 0" }}>
        {[
          { id: "all" as const, label: `الكل (${examQuestions.length})` },
          { id: "wrong" as const, label: "الخاطئة" },
          { id: "correct" as const, label: "الصحيحة" },
          { id: "unanswered" as const, label: "غير المجابة" },
          { id: "flagged" as const, label: `المعلّمة (${flagged.size})` }
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`fchip ${reviewFilter === f.id ? "on" : ""}`}
            onClick={() => setReviewFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {reviewList.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            displayNumber={q.orig_q_num}
            userAnswer={userAnswers[q.id]}
            onAnswer={() => undefined}
            onJumpToSlide={onJumpToSlide}
            onShowTranslate={handleShowTranslate}
            onScheduleHideTranslate={handleScheduleHideTranslate}
            languageMode={languageMode}
            expMode={expMode}
            expPromptSeen={expPromptSeen}
            onDismissExpPrompt={onDismissExpPrompt}
            onOpenExpSettings={onOpenExpSettings}
            readOnly
          />
        ))}
      </div>

      <SmartTranslateTooltip
        visible={tooltipState.visible}
        textAr={tooltipState.text}
        position={tooltipState.pos}
        onClose={handleCloseTooltip}
        onMouseEnterTooltip={handleCancelHideTranslate}
        onMouseLeaveTooltip={handleScheduleHideTranslate}
      />
    </div>
  );
};

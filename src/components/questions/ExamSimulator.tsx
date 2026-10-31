// ==============================================================================
// المنصة التعليمية الموحدة — محاكي الاختبار (Exam Simulator)
// Bank scope · timed/stopwatch · flagging · palette statuses · grade · history ·
// weak-area review. Zero Emojis.
// ==============================================================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "../icons/SvgIcons";
import { QuestionCard } from "./QuestionCard";
import type { UnifiedQuestion, UserStudyProgress } from "../../types";

interface ExamSimulatorProps {
  questions: UnifiedQuestion[];
  models?: Array<{ id: string; title_ar: string; short_label?: string }>;
  examHistory?: UserStudyProgress["exam_history"];
  onRecordResult: (result: { total: number; score: number; timeSpentSec: number; mode: string }) => void;
  onJumpToSlide?: (ref: string) => void;
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
  examHistory = [],
  onRecordResult,
  onJumpToSlide
}) => {
  const [examState, setExamState] = useState<"setup" | "running" | "results">("setup");
  const [scope, setScope] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [timerMode, setTimerMode] = useState<"countdown" | "stopwatch">("countdown");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20);
  const [examQuestions, setExamQuestions] = useState<UnifiedQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<
    Record<string, { selected_answer: number; is_correct: boolean }>
  >({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const finishRef = useRef<() => void>(() => undefined);

  const pool = useMemo(
    () => (scope === "all" ? questions : questions.filter((q) => q.model_id === scope)),
    [questions, scope]
  );

  const startExam = () => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, pool.length));
    setExamQuestions(selected);
    setCurrentIdx(0);
    setUserAnswers({});
    setFlagged(new Set());
    setReviewFilter("all");
    const totalSecs = timeLimitMinutes * 60;
    setSecondsRemaining(totalSecs);
    setTimeSpent(0);
    setExamState("running");
  };

  const finishExam = () => {
    let score = 0;
    examQuestions.forEach((q) => {
      if (userAnswers[q.id]?.is_correct) score++;
    });
    onRecordResult({
      total: examQuestions.length,
      score,
      timeSpentSec: timerMode === "countdown" ? timeLimitMinutes * 60 - secondsRemaining : timeSpent,
      mode: `${examQuestions.length}Q-${scope === "all" ? "all" : scope}-${timerMode === "countdown" ? `${timeLimitMinutes}m` : "open"}`
    });
    setExamState("results");
  };

  finishRef.current = finishExam;

  useEffect(() => {
    if (examState !== "running") return;
    const timer = setInterval(() => {
      setTimeSpent((s) => s + 1);
      if (timerMode === "countdown") {
        setSecondsRemaining((sec) => {
          if (sec <= 1) {
            clearInterval(timer);
            finishRef.current();
            return 0;
          }
          return sec - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [examState, timerMode]);

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

  if (questions.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--ink-m)" }}>
        <p>لا توجد أسئلة متوفرة حالياً لإنشاء امتحان تجريبي.</p>
      </div>
    );
  }

  if (examState === "setup") {
    return (
      <div className="exam-setup">
        <div className="exam-setup-head">
          <div className="exam-setup-icon"><Icons.Exam size={24} /></div>
          <div>
            <h1>محاكي الاختبار النهائي</h1>
            <p>اختبر جاهزيتك تحت ضغط زمني واقعي مع لوحة أسئلة وأعلام مراجعة ودرجة تقديرية.</p>
          </div>
        </div>

        <div className="exam-setup-grid">
          <div className="exam-field">
            <label>نطاق الأسئلة (البنك)</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">البنك الشامل ({questions.length})</option>
              {models.map((m) => {
                const count = questions.filter((q) => q.model_id === m.id).length;
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
                    className={`fchip ${questionCount === n ? "on" : ""}`}
                    onClick={() => setQuestionCount(Math.min(n, pool.length))}
                  >
                    {Math.min(n, pool.length)} سؤالاً
                  </button>
                ))}
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

        <button type="button" className="btn btn-primary exam-start-btn" onClick={startExam}>
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
    );
  }

  if (examState === "running") {
    const currentQ = examQuestions[currentIdx];
    const answeredCount = Object.values(userAnswers).filter((a) => a.selected_answer >= 0).length;
    const timeValue = timerMode === "countdown" ? secondsRemaining : timeSpent;
    const urgent = timerMode === "countdown" && secondsRemaining <= 300;

    return (
      <div>
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
            <button type="button" className="btn btn-sm exam-finish-btn" onClick={finishExam}>
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
            flagged={flagged.has(currentQ.id)}
            onAnswer={handleAnswerQuestion}
            onToggleFlag={toggleFlag}
            onJumpToSlide={onJumpToSlide}
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
            <button type="button" className="btn btn-sm btn-primary" onClick={finishExam}>
              <span>تسليم نهائي</span>
              <Icons.Check size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const totalScore = examQuestions.filter((q) => userAnswers[q.id]?.is_correct).length;
  const percent = examQuestions.length > 0 ? Math.round((totalScore / examQuestions.length) * 100) : 0;
  const grade = gradeFor(percent);
  const elapsed = timerMode === "countdown" ? timeLimitMinutes * 60 - secondsRemaining : timeSpent;

  const byLecture = (() => {
    const map = new Map<string, { total: number; correct: number }>();
    examQuestions.forEach((q) => {
      const lec = q.lecture_id || (q.slide_ref ? q.slide_ref.split("-")[0] : "عام");
      const entry = map.get(lec) || { total: 0, correct: 0 };
      entry.total++;
      if (userAnswers[q.id]?.is_correct) entry.correct++;
      map.set(lec, entry);
    });
    return Array.from(map.entries()).map(([lec, entry]) => ({
      lec,
      ...entry,
      pct: Math.round((entry.correct / entry.total) * 100)
    }));
  })();

  const reviewList = examQuestions.filter((q) => {
    const ans = userAnswers[q.id];
    if (reviewFilter === "wrong") return ans && ans.selected_answer >= 0 && !ans.is_correct;
    if (reviewFilter === "correct") return ans?.is_correct;
    if (reviewFilter === "unanswered") return !ans || ans.selected_answer < 0;
    if (reviewFilter === "flagged") return flagged.has(q.id);
    return true;
  });

  return (
    <div>
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
            <div className="exam-result-actions">
              <button type="button" className="btn btn-primary" onClick={() => setExamState("setup")}>
                جلسة جديدة
              </button>
            </div>
          </div>
        </div>

        <div className="exam-mastery">
          <div className="exam-mastery-head">
            <Icons.Target size={15} />
            <span>الإتقان بحسب المحاضرة</span>
          </div>
          {byLecture.map((entry) => (
            <div key={entry.lec} className="exam-mastery-row">
              <span className="exam-mastery-lec">{entry.lec}</span>
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
            flagged={flagged.has(q.id)}
            onAnswer={() => undefined}
            onToggleFlag={toggleFlag}
            onJumpToSlide={onJumpToSlide}
            readOnly
          />
        ))}
      </div>
    </div>
  );
};


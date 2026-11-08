// ==============================================================================
// المنصة التعليمية الموحدة — بنك الأسئلة الموحد (Authentic Question Bank)
// Model pills · origin docs · live scores · weak-lecture insights · flagged &
// wrong-only retest session · manual number filter · 4-color bookmarks ·
// deterministic shuffle (questions & choices) · zero emojis.
// ==============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import { QuestionCard } from "./QuestionCard";
import { TwinQuestionModal } from "./TwinQuestionModal";
import { SmartTranslateTooltip } from "../common/SmartTranslateTooltip";
import type {
  UnifiedQuestion,
  QuestionModelInfo,
  UserStudyProgress,
  ExplanationMode,
  BookmarkColor,
  BookmarkLabels
} from "../../types";

interface UnifiedQuestionBankViewProps {
  subjectCode: string;
  questions: UnifiedQuestion[];
  models: QuestionModelInfo[];
  userProgress: UserStudyProgress;
  onAnswerQuestion: (questionId: string, answerIdx: number, isCorrect: boolean, twinGroupId?: string) => void;
  onToggleFlag?: (questionId: string) => void;
  onJumpToSlide?: (ref: string) => void;
  onJumpToQuestion?: (questionId: string) => void;
  languageMode?: "smart" | "en" | "ar" | "both";
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  focusQuestionId?: string | null;
  showBookmarks?: boolean;
  bmLabels?: BookmarkLabels;
  onToggleBookmark?: (questionId: string, color: string, twinGroupId?: string) => void;
  onOpenBmLabelModal?: () => void;
  expMode?: ExplanationMode;
  onChangeExpMode?: (mode: ExplanationMode) => void;
  shuffleChoices?: boolean;
  onToggleShuffleChoices?: () => void;
  shuffleQuestions?: boolean;
  onToggleShuffleQuestions?: () => void;
  shuffleSeed?: number;
  onChangeShuffleSeed?: (seed: number) => void;
  onResetModelAnswers?: (modelId: string) => void;
  onReshuffle?: () => void;
}

function ordSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function questionLecture(q: UnifiedQuestion): string {
  if (q.lecture_id) return q.lecture_id;
  if (q.slide_ref && q.slide_ref.includes("-")) return q.slide_ref.split("-")[0];
  return "عام";
}

function parseManualFilter(
  raw: string,
  allQuestions?: UnifiedQuestion[]
): { numSet: Set<number>; textQuery: string | null } | null {
  const text = raw.trim();
  if (!text) return null;
  const numSet = new Set<number>();
  const parts = text.split(/[,،\s]+/).filter(Boolean);
  let hasNumber = false;
  for (const part of parts) {
    const range = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (range) {
      hasNumber = true;
      const start = Number(range[1]);
      const end = Number(range[2]);
      const [mn, mx] = start <= end ? [start, end] : [end, start];
      for (let n = mn; n <= mx; n++) numSet.add(n);
    } else if (/^\d+$/.test(part)) {
      hasNumber = true;
      numSet.add(Number(part));
    }
  }

  // إضافة أرقام التوائم للأسئلة المحددة تلقائياً لضمان عدم إخفاء السؤال التوأم
  if (hasNumber && allQuestions && numSet.size > 0) {
    const twinsToAdd: number[] = [];
    allQuestions.forEach((q) => {
      if (numSet.has(q.orig_q_num) && q.twin_group_id) {
        allQuestions.forEach((other) => {
          if (other.twin_group_id === q.twin_group_id && other.id !== q.id) {
            twinsToAdd.push(other.orig_q_num);
          }
        });
      }
    });
    twinsToAdd.forEach((n) => numSet.add(n));
  }

  return {
    numSet,
    textQuery: hasNumber ? null : text.toLowerCase()
  };
}

export const UnifiedQuestionBankView: React.FC<UnifiedQuestionBankViewProps> = ({
  subjectCode,
  questions,
  models,
  userProgress,
  onAnswerQuestion,
  onToggleFlag,
  onJumpToSlide,
  onJumpToQuestion,
  languageMode = "smart",
  selectedModelId: propSelectedModelId,
  onSelectModel,
  focusQuestionId,
  showBookmarks = true,
  bmLabels,
  onToggleBookmark,
  onOpenBmLabelModal,
  expMode = "always",
  onChangeExpMode,
  shuffleChoices = false,
  onToggleShuffleChoices,
  shuffleQuestions = false,
  onToggleShuffleQuestions,
  shuffleSeed = 1,
  onChangeShuffleSeed,
  onResetModelAnswers,
  onReshuffle
}) => {
  const [internalModelId, setInternalModelId] = useState<string>("all");
  const selectedModelId = propSelectedModelId !== undefined ? propSelectedModelId : internalModelId;
  const setSelectedModelId = (id: string) => {
    setInternalModelId(id);
    if (onSelectModel) onSelectModel(id);
  };

  const [hideTwins, setHideTwins] = useState<boolean>(true);
  const [filterState, setFilterState] = useState<"all" | "unsolved" | "solved" | "wrong" | "correct" | "flagged">("all");
  const [filterBm, setFilterBm] = useState<"all" | BookmarkColor>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lectureFilter, setLectureFilter] = useState<string>("all");
  const [manualFilter, setManualFilter] = useState<string>("");
  const [retest, setRetest] = useState<null | "wrong" | "flagged">(null);
  const [retestIds, setRetestIds] = useState<Set<string>>(new Set());
  const [retestAnswered, setRetestAnswered] = useState<Set<string>>(new Set());
  const [retestAnswers, setRetestAnswers] = useState<
    Record<string, { selected_answer: number; is_correct: boolean }>
  >({});
  const [activeTwinModalQ, setActiveTwinModalQ] = useState<UnifiedQuestion | null>(null);
  const [visibleLimit, setVisibleLimit] = useState<number>(40);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    text: string;
    pos: { x: number; y: number } | null;
  }>({ visible: false, text: "", pos: null });

  const [activeShuffleChoices, setActiveShuffleChoices] = useState<boolean>(shuffleChoices);
  const [activeShuffleQuestions, setActiveShuffleQuestions] = useState<boolean>(shuffleQuestions);
  const [activeSeed, setActiveSeed] = useState<number>(shuffleSeed);
  const [activeExpMode, setActiveExpMode] = useState<ExplanationMode>(expMode);

  useEffect(() => {
    setActiveShuffleChoices(shuffleChoices);
  }, [shuffleChoices]);
  useEffect(() => {
    setActiveShuffleQuestions(shuffleQuestions);
  }, [shuffleQuestions]);
  useEffect(() => {
    setActiveSeed(shuffleSeed);
  }, [shuffleSeed]);
  useEffect(() => {
    setActiveExpMode(expMode);
  }, [expMode]);

  const toggleShuffleChoicesSync = () => {
    const next = !activeShuffleChoices;
    setActiveShuffleChoices(next);
    if (onToggleShuffleChoices) onToggleShuffleChoices();
    else localStorage.setItem("unified_shuffle_choices", String(next));
  };

  const toggleShuffleQuestionsSync = () => {
    const next = !activeShuffleQuestions;
    setActiveShuffleQuestions(next);
    if (onToggleShuffleQuestions) onToggleShuffleQuestions();
    else localStorage.setItem("unified_shuffle_questions", String(next));
  };

  const updateSeedSync = (nextSeed: number) => {
    const s = Math.max(1, nextSeed);
    setActiveSeed(s);
    if (onChangeShuffleSeed) onChangeShuffleSeed(s);
    else localStorage.setItem("unified_seed", String(s));
  };

  const cycleExpModeSync = () => {
    const cycle: Record<ExplanationMode, ExplanationMode> = {
      always: "wrong_only",
      wrong_only: "manual",
      manual: "always"
    };
    const next = cycle[activeExpMode] || "always";
    setActiveExpMode(next);
    if (onChangeExpMode) onChangeExpMode(next);
    else localStorage.setItem("unified_exp_mode", next);
  };

  const answeredMap = userProgress.answered_questions || {};
  const flaggedIds = userProgress.flagged_questions || [];
  const bookmarksMap = userProgress.bookmarks || {};

  const modelQuestions = useMemo(
    () => (selectedModelId === "all" ? questions : questions.filter((q) => q.model_id === selectedModelId)),
    [questions, selectedModelId]
  );

  const activeTwinTarget = useMemo(() => {
    if (!activeTwinModalQ || !activeTwinModalQ.twin_group_id) return undefined;
    return questions.find(
      (q) => q.twin_group_id === activeTwinModalQ.twin_group_id && q.id !== activeTwinModalQ.id
    );
  }, [activeTwinModalQ, questions]);

  const twinNumberMap = useMemo(() => {
    const map: Record<string, number> = {};
    questions.forEach((q) => {
      if (q.twin_group_id) {
        const other = questions.find((o) => o.twin_group_id === q.twin_group_id && o.id !== q.id);
        if (other) map[q.id] = other.orig_q_num;
      }
    });
    return map;
  }, [questions]);

  const lectures = useMemo(() => {
    const map = new Map<string, number>();
    modelQuestions.forEach((q) => {
      const lec = questionLecture(q);
      map.set(lec, (map.get(lec) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en"));
  }, [modelQuestions]);

  const manualData = useMemo(() => parseManualFilter(manualFilter, questions), [manualFilter, questions]);

  // حساب أعداد العلامات الملونة في النموذج الحالي
  const bookmarkCounts = useMemo(() => {
    const counts: Record<BookmarkColor, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
    modelQuestions.forEach((q) => {
      const bms = bookmarksMap[q.id];
      if (bms) {
        bms.forEach((c) => {
          if (c in counts) counts[c as BookmarkColor]++;
        });
      }
    });
    return counts;
  }, [modelQuestions, bookmarksMap]);

  // إحصائيات حالة الأسئلة للنموذج الحالي
  const statusCounts = useMemo(() => {
    let solved = 0;
    let correct = 0;
    let wrong = 0;
    let flagged = 0;
    modelQuestions.forEach((q) => {
      const a = answeredMap[q.id];
      if (a && a.selected_answer >= 0) {
        solved++;
        if (a.is_correct) correct++;
        else wrong++;
      }
      if (flaggedIds.includes(q.id)) flagged++;
    });
    return {
      total: modelQuestions.length,
      unsolved: Math.max(0, modelQuestions.length - solved),
      solved,
      correct,
      wrong,
      flagged
    };
  }, [modelQuestions, answeredMap, flaggedIds]);

  // عدد الأسئلة المحلولة في النموذج الحالي
  const activeAnsCount = statusCounts.solved;

  const filteredQuestions = useMemo(() => {
    const seenTwins = new Set<string>();
    const q = searchQuery.trim().toLowerCase();

    return modelQuestions.filter((question) => {
      if (retest && !retestIds.has(question.id)) return false;
      // خلال جلسة الإعادة لا نخفي السؤال فور إجابته بل نبقيه ليرى الطالب التعليل
      if (lectureFilter !== "all" && questionLecture(question) !== lectureFilter) return false;

      if (manualData) {
        if (manualData.numSet.size > 0 && !manualData.numSet.has(question.orig_q_num)) return false;
        if (manualData.textQuery) {
          const haystack = [
            question.question_en,
            question.question_ar,
            ...question.options_en,
            ...(question.options_ar || []),
            question.why_correct || "",
            question.slide_ref || ""
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(manualData.textQuery)) return false;
        }
      }

      // فلتر العلامات الملونة
      if (showBookmarks && filterBm !== "all") {
        const qBms = bookmarksMap[question.id] || [];
        if (!qBms.includes(filterBm)) return false;
      }

      if (hideTwins && question.twin_group_id) {
        if (seenTwins.has(question.twin_group_id)) return false;
        seenTwins.add(question.twin_group_id);
      }

      if (!retest) {
        const ans = answeredMap[question.id];
        if (filterState === "unsolved" && ans && ans.selected_answer >= 0) return false;
        if (filterState === "solved" && (!ans || ans.selected_answer < 0)) return false;
        if (filterState === "wrong" && (!ans || ans.is_correct || ans.selected_answer < 0)) return false;
        if (filterState === "correct" && (!ans || !ans.is_correct)) return false;
        if (filterState === "flagged" && !flaggedIds.includes(question.id)) return false;
      }

      if (q) {
        const haystack = [
          question.question_en,
          question.question_ar,
          ...question.options_en,
          ...(question.options_ar || []),
          question.why_correct,
          question.slide_ref || ""
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    modelQuestions,
    retest,
    retestIds,
    lectureFilter,
    manualData,
    hideTwins,
    filterState,
    filterBm,
    showBookmarks,
    bookmarksMap,
    answeredMap,
    flaggedIds,
    searchQuery
  ]);

  // ترتيب الأسئلة: إذا كان الخلط مفعلاً، تبقى الأسئلة المحلولة في البداية بترتيبها المستقر، والأسئلة غير المحلولة تُخلط عشوائياً
  const orderedQuestions = useMemo(() => {
    if (!activeShuffleQuestions) return filteredQuestions;

    const answered: UnifiedQuestion[] = [];
    const unanswered: UnifiedQuestion[] = [];

    filteredQuestions.forEach((q) => {
      const a = retest ? retestAnswers[q.id] : answeredMap[q.id];
      if (a && a.selected_answer >= 0) {
        answered.push(q);
      } else {
        unanswered.push(q);
      }
    });

    const seedStr = `${subjectCode}#${selectedModelId}#unans#${activeSeed}`;
    const rnd = ordSeed(seedStr);
    const shuffledUnanswered = [...unanswered];
    for (let i = shuffledUnanswered.length - 1; i > 0; i--) {
      const j = rnd() % (i + 1);
      const tmp = shuffledUnanswered[i];
      shuffledUnanswered[i] = shuffledUnanswered[j];
      shuffledUnanswered[j] = tmp;
    }

    return [...answered, ...shuffledUnanswered];
  }, [
    filteredQuestions,
    activeShuffleQuestions,
    subjectCode,
    selectedModelId,
    activeSeed,
    answeredMap,
    retest,
    retestAnswers
  ]);

  const visibleQuestions = useMemo(
    () => orderedQuestions.slice(0, visibleLimit),
    [orderedQuestions, visibleLimit]
  );

  const stats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    modelQuestions.forEach((q) => {
      const ans = answeredMap[q.id];
      if (ans && ans.selected_answer >= 0) {
        answered++;
        if (ans.is_correct) correct++;
      }
    });
    return {
      total: modelQuestions.length,
      answered,
      correct,
      percentage: answered > 0 ? Math.round((correct / answered) * 100) : 0
    };
  }, [modelQuestions, answeredMap]);

  const insights = useMemo(() => {
    const map = new Map<string, { total: number; answered: number; right: number }>();
    modelQuestions.forEach((q) => {
      const lec = questionLecture(q);
      const cur = map.get(lec) || { total: 0, answered: 0, right: 0 };
      cur.total++;
      const ans = answeredMap[q.id];
      if (ans && ans.selected_answer >= 0) {
        cur.answered++;
        if (ans.is_correct) cur.right++;
      }
      map.set(lec, cur);
    });

    return Array.from(map.entries())
      .map(([lec, cur]) => ({
        lec,
        total: cur.total,
        answered: cur.answered,
        right: cur.right,
        accuracy: cur.answered > 0 ? Math.round((cur.right / cur.answered) * 100) : null
      }))
      .sort((a, b) => a.lec.localeCompare(b.lec, "en"));
  }, [modelQuestions, answeredMap]);

  const weakLectures = useMemo(
    () => insights.filter((i) => i.accuracy !== null && i.answered >= 3 && i.accuracy < 60),
    [insights]
  );

  const startRetest = (kind: "wrong" | "flagged") => {
    const ids = new Set<string>();
    modelQuestions.forEach((q) => {
      if (kind === "wrong") {
        const a = answeredMap[q.id];
        if (a && !a.is_correct && a.selected_answer >= 0) ids.add(q.id);
      } else {
        if (flaggedIds.includes(q.id)) ids.add(q.id);
      }
    });
    setRetest(kind);
    setRetestIds(ids);
    setRetestAnswers({});
    setRetestAnswered(new Set());
    setVisibleLimit(Math.max(40, ids.size));
  };

  const stopRetest = () => {
    setRetest(null);
    setRetestIds(new Set());
    setRetestAnswers({});
    setRetestAnswered(new Set());
  };

  const handleAnswerWithRetest = (
    qId: string,
    idx: number,
    ok: boolean,
    twinGroupId?: string
  ) => {
    if (retest) {
      if (idx < 0) {
        setRetestAnswers((prev) => {
          const next = { ...prev };
          delete next[qId];
          return next;
        });
        setRetestAnswered((prev) => {
          const next = new Set(prev);
          next.delete(qId);
          return next;
        });
      } else {
        setRetestAnswers((prev) => ({
          ...prev,
          [qId]: { selected_answer: idx, is_correct: ok }
        }));
        setRetestAnswered((prev) => {
          const next = new Set(prev);
          next.add(qId);
          return next;
        });
        // حفظ التحسين في السجل الأساسي عند الإجابة الصائبة
        if (ok) {
          onAnswerQuestion(qId, idx, ok, twinGroupId);
        }
      }
    } else {
      onAnswerQuestion(qId, idx, ok, twinGroupId);
    }
  };

  const retestRemaining = retest ? Math.max(0, retestIds.size - retestAnswered.size) : 0;

  const retestSessionStats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    const wrongSet = new Set<string>();
    retestIds.forEach((id) => {
      const a = retestAnswers[id];
      if (a && a.selected_answer >= 0) {
        if (a.is_correct) correct++;
        else {
          wrong++;
          wrongSet.add(id);
        }
      }
    });
    return {
      total: retestIds.size,
      answered: retestAnswered.size,
      remaining: Math.max(0, retestIds.size - retestAnswered.size),
      correct,
      wrong,
      wrongSet
    };
  }, [retestIds, retestAnswers, retestAnswered]);

  const retryRemainingWrong = () => {
    if (retestSessionStats.wrongSet.size === 0) return;
    const nextIds = new Set(retestSessionStats.wrongSet);
    setRetestIds(nextIds);
    setRetestAnswers({});
    setRetestAnswered(new Set());
    setVisibleLimit(Math.max(40, nextIds.size));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!focusQuestionId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`q-${focusQuestionId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("focus-glow");
        setTimeout(() => el.classList.remove("focus-glow"), 2500);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [focusQuestionId]);

  const getModelScore = (mId: string) => {
    const qs = mId === "all" ? questions : questions.filter((x) => x.model_id === mId);
    let right = 0;
    qs.forEach((q) => {
      const a = answeredMap[q.id];
      if (a && a.is_correct) right++;
    });
    return { right, total: qs.length };
  };

  const handleShowTranslate = (text: string, pos: { x: number; y: number }) => {
    setTooltipState({ visible: true, text, pos });
  };

  // محرك اختصارات لوحة المفاتيح لبنك الأسئلة (1, 2, 3, 4, J, K, E, F, B, T)
  useEffect(() => {
    const handleBankKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toUpperCase();
      const isInput =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT" ||
        (document.activeElement as HTMLElement)?.isContentEditable;
      if (isInput || e.ctrlKey || e.metaKey || e.altKey) return;

      const qCards = Array.from(document.querySelectorAll<HTMLElement>(".q-card"));
      if (qCards.length === 0) return;

      // العثور على بطاقة السؤال الأكثر تمركزاً في منتصف الشاشة حالياً
      const viewportMid = window.innerHeight * 0.45;
      let activeCard: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const card of qCards) {
        const rect = card.getBoundingClientRect();
        if (rect.bottom >= 60 && rect.top <= window.innerHeight - 60) {
          const dist = Math.abs(rect.top - viewportMid);
          if (dist < minDistance) {
            minDistance = dist;
            activeCard = card;
          }
        }
      }
      if (!activeCard) activeCard = qCards[0];

      const activeIdx = qCards.indexOf(activeCard);

      // J: السؤال التالي
      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        const nextCard = qCards[Math.min(qCards.length - 1, activeIdx + 1)];
        if (nextCard) {
          nextCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // K: السؤال السابق
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        const prevCard = qCards[Math.max(0, activeIdx - 1)];
        if (prevCard) {
          prevCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // 1 أو 2 أو 3 أو 4 (أو A, B, C, D): اختيار الإجابة
      const optMap: Record<string, number> = {
        "1": 0, "a": 0,
        "2": 1, "b": 1,
        "3": 2, "c": 2,
        "4": 3, "d": 3
      };
      const optIdx = optMap[e.key.toLowerCase()];
      if (optIdx !== undefined) {
        const optBtns = activeCard.querySelectorAll<HTMLButtonElement>(".opt-btn");
        if (optBtns && optBtns[optIdx]) {
          e.preventDefault();
          optBtns[optIdx].click();
          return;
        }
      }

      // E: كشف أو طي الشرح والتعليل
      if (e.key.toLowerCase() === "e") {
        const whyBtn = activeCard.querySelector<HTMLButtonElement>(".q-btn.why, .essay-reveal");
        if (whyBtn) {
          e.preventDefault();
          whyBtn.click();
          return;
        }
      }

      // F: تعليم السؤال بعلم للمراجعة
      if (e.key.toLowerCase() === "f") {
        const flagBtn = activeCard.querySelector<HTMLButtonElement>(".q-flag-btn");
        if (flagBtn) {
          e.preventDefault();
          flagBtn.click();
          return;
        }
      }

      // B: إضافة أو إزالة العلامة المرجعية
      if (e.key.toLowerCase() === "b") {
        const bmBtn = activeCard.querySelector<HTMLButtonElement>(".bm-btn");
        if (bmBtn) {
          e.preventDefault();
          bmBtn.click();
          return;
        }
      }

      // T: إظهار الترجمة
      if (e.key.toLowerCase() === "t") {
        const stemEn = activeCard.querySelector<HTMLElement>(".q-stem-en");
        if (stemEn) {
          e.preventDefault();
          stemEn.click();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleBankKeyDown);
    return () => window.removeEventListener("keydown", handleBankKeyDown);
  }, []);

  const activeModelMeta = models.find((m) => m.id === selectedModelId);
  const activeModelScore = getModelScore(selectedModelId);
  const modelProgressPct =
    activeModelScore.total > 0 ? Math.round((activeModelScore.right / activeModelScore.total) * 100) : 0;

  return (
    <div id="allbankView">
      <div className="headline">
        <div className="kicker">
          <span className="dot" />
          <span>
            {selectedModelId === "all"
              ? `البنك الشامل المجمع · ${questions.length} سؤالاً`
              : `${activeModelMeta?.title_ar || selectedModelId.toUpperCase()} · ${modelQuestions.length} سؤالاً`}
          </span>
        </div>
        <h1>
          {selectedModelId === "all"
            ? `بنك الأسئلة الشامل (${questions.length} سؤالاً)`
            : activeModelMeta?.title_ar || "نماذج الاختبارات"}
        </h1>
        <p className="sub">
          أجبت عن {stats.answered} من {stats.total} سؤالاً · نسبة الدقة الإجمالية: {stats.percentage}% ·
          المعلّم للمراجعة: {flaggedIds.length}
        </p>
      </div>

      {/* Model Pills with proper icons & clean titles */}
      <div className="model-pills" id="modelPills">
        {(() => {
          const allScore = getModelScore("all");
          return (
            <button
              type="button"
              className={`model-pill is-allbank ${selectedModelId === "all" ? "active" : ""}`}
              onClick={() => {
                setSelectedModelId("all");
                setLectureFilter("all");
              }}
            >
              <span className="kind-badge">
                <Icons.Models size={12} />
                شامل
              </span>
              <span>البنك الموحد الكامل</span>
              <span className="model-score">{allScore.right} / {allScore.total}</span>
            </button>
          );
        })()}
        {models.map((m) => {
          const s = getModelScore(m.id);
          const short = m.short_label || m.id.toUpperCase();
          const cleanTitle = m.title_ar.includes(short)
            ? m.title_ar
            : `${short} · ${m.title_ar}`;

          return (
            <button
              key={m.id}
              type="button"
              className={`model-pill ${selectedModelId === m.id ? "active" : ""}`}
              onClick={() => {
                setSelectedModelId(m.id);
                setLectureFilter("all");
              }}
            >
              <span className="kind-badge">
                <Icons.Models size={12} />
                {m.kind || "نموذج"}
              </span>
              <span>{cleanTitle}</span>
              <span className="model-score">{s.right} / {s.total}</span>
            </button>
          );
        })}
      </div>

      <div className="model-progress">
        <div className="model-progress-text">
          <span>إتقان النموذج الحالي</span>
          <b>{activeModelScore.right} / {activeModelScore.total} ({modelProgressPct}%)</b>
        </div>
        <div className="em-progress-bar"><span style={{ width: `${modelProgressPct}%` }} /></div>
      </div>

      {retest && (
        <div className={`retest-banner ${retestRemaining === 0 ? "is-done" : ""}`}>
          <div className="retest-banner-text">
            {retestRemaining === 0 ? <Icons.Check size={18} /> : <Icons.Reset size={18} />}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontWeight: 800 }}>
                {retestRemaining === 0
                  ? `أنهيت جلسة إعادة ${retest === "wrong" ? "الأسئلة الخاطئة" : "الأسئلة المعلّمة"}`
                  : `جلسة إعادة ${retest === "wrong" ? "الأسئلة الخاطئة" : "الأسئلة المعلّمة"}`}
              </span>
              <small style={{ color: "var(--ink-m)" }}>
                {retestRemaining === 0
                  ? retestSessionStats.wrong === 0
                    ? "أجبت عن جميع الأسئلة بشكل صحيح — أحسنت!"
                    : `أنهيت ${retestSessionStats.total} سؤالاً · صحيح ${retestSessionStats.correct} · لا يزال خطأ ${retestSessionStats.wrong}`
                  : `أعد الإجابة على هذه الأسئلة بنفسك · أجبت ${retestSessionStats.answered} من ${retestSessionStats.total} · صحيح ${retestSessionStats.correct} · خطأ ${retestSessionStats.wrong}`}
              </small>
            </div>
          </div>

          <div
            className="rt-bar"
            style={{
              width: "100%",
              height: "6px",
              background: "var(--sf2)",
              borderRadius: "999px",
              overflow: "hidden",
              margin: "6px 0"
            }}
          >
            <div
              style={{
                width: `${retestIds.size > 0 ? Math.round((retestAnswered.size / retestIds.size) * 100) : 0}%`,
                height: "100%",
                background: retestRemaining === 0 ? "var(--ok)" : "var(--acc)",
                transition: "width 0.25s ease"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {retestSessionStats.wrong > 0 && (
              <button type="button" className="btn btn-sm btn-primary" onClick={retryRemainingWrong}>
                <Icons.Rotate size={13} />
                <span>
                  {retestSessionStats.wrong === retestSessionStats.total && retestRemaining === 0
                    ? "أعد المحاولة من جديد"
                    : `أعد محاولة الأخطاء المتبقية (${retestSessionStats.wrong})`}
                </span>
              </button>
            )}
            <button type="button" className="btn btn-sm" onClick={stopRetest}>
              <Icons.Back size={13} />
              <span>إنهاء المراجعة والعودة للبنك</span>
            </button>
          </div>
        </div>
      )}

      <div className="model-insights">
        <div className="model-insights-head">
          <Icons.Target size={16} />
          <span>خريطة الإتقان بحسب المحاضرة</span>
        </div>
        <div className="ins-grid">
          {insights.map((entry) => {
            const isWeak = entry.accuracy !== null && entry.answered >= 3 && entry.accuracy < 60;
            return (
              <button
                key={entry.lec}
                type="button"
                className={`ins-lec ${isWeak ? "is-weak" : ""} ${lectureFilter === entry.lec ? "active" : ""}`}
                onClick={() => setLectureFilter(lectureFilter === entry.lec ? "all" : entry.lec)}
                title="تصفية البنك على هذه المحاضرة"
              >
                <span className="ins-lec-name">{entry.lec}</span>
                <span className="ins-lec-meta">
                  {entry.answered} / {entry.total}
                </span>
                <span className="ins-lec-bar">
                  <span style={{ width: `${entry.accuracy ?? 0}%` }} />
                </span>
                <b>{entry.accuracy === null ? "—" : `${entry.accuracy}%`}</b>
              </button>
            );
          })}
        </div>
        {weakLectures.length > 0 && (
          <div className="ins-weak-note" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Icons.Warning size={14} />
              <span>
                محاضرات تحتاج مراجعة عاجلة: <b>{weakLectures.map((entry) => entry.lec).join(" · ")}</b>
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ padding: "3px 10px", fontSize: "0.78rem" }}
              onClick={() => {
                if (weakLectures[0]) {
                  setLectureFilter(weakLectures[0].lec);
                  setFilterState("wrong");
                }
              }}
            >
              مراجعة أضعف محاضرة ({weakLectures[0]?.lec})
            </button>
          </div>
        )}
      </div>

      {/* شريط الفلاتر الأساسي مع العدادات الحية المطابق لـ RM_Viewer */}
      <div className="fchips bank-toolbar">
        {[
          { id: "all" as const, label: `الكل (${statusCounts.total})` },
          { id: "unsolved" as const, label: `لم يُحل (${statusCounts.unsolved})` },
          { id: "solved" as const, label: `محلول (${statusCounts.solved})` },
          { id: "correct" as const, label: `صحيح (${statusCounts.correct})` },
          { id: "wrong" as const, label: `خاطئ (${statusCounts.wrong})` },
          { id: "flagged" as const, label: `المعلّمة (${statusCounts.flagged})` }
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`fchip ${filterState === f.id ? "on" : ""}`}
            onClick={() => setFilterState(f.id)}
          >
            {f.label}
          </button>
        ))}

        <button
          type="button"
          className={`fchip ${hideTwins ? "on" : ""}`}
          onClick={() => setHideTwins(!hideTwins)}
          title="دمج الأسئلة التوأمية المتطابقة نصاً"
        >
          <Icons.Twin size={13} />
          {hideTwins ? "دمج التوائم" : "عرض المكررات"}
        </button>

        <button
          type="button"
          className={`fchip fchip-review-wrong ${statusCounts.wrong === 0 ? "is-empty" : ""}`}
          onClick={() => startRetest("wrong")}
          disabled={statusCounts.wrong === 0}
          title="جلسة مركزة على الأسئلة التي أخطأت فيها فقط"
        >
          <Icons.Reset size={13} />
          جلسة الأخطاء{statusCounts.wrong > 0 ? ` (${statusCounts.wrong})` : ""}
        </button>

        {/* أزرار اللخبطة والبذرة والشرح المطابقة لـ RM_Viewer والمرتبطة بالتخزين والإعدادات */}
        <button
          type="button"
          className={`fchip ${activeShuffleChoices ? "on" : ""}`}
          onClick={toggleShuffleChoicesSync}
          title="تبديل عشوائي لترتيب خيارات الإجابة"
        >
          <Icons.Shuffle size={13} />
          <span>{activeShuffleChoices ? "لخبطة الخيارات: مفعلة" : "لخبطة الخيارات: ملغاة"}</span>
        </button>

        <button
          type="button"
          className={`fchip ${activeShuffleQuestions ? "on" : ""}`}
          onClick={toggleShuffleQuestionsSync}
          title="خلط عشوائي متزن للأسئلة غير المحلولة"
        >
          <Icons.Shuffle size={13} />
          <span>{activeShuffleQuestions ? "لخبطة الأسئلة: مفعلة" : "لخبطة الأسئلة: ملغاة"}</span>
        </button>

        <div className="seed-control-capsule" title="رقم البذرة العشوائية للخلط والتوليد (Seed)">
          <span className="seed-label">
            <Icons.Hash size={11} />
            Seed
          </span>
          <button
            type="button"
            className="seed-btn seed-dec"
            onClick={() => updateSeedSync(activeSeed - 1)}
            title="إنقاص رقم البذرة"
          >
            -
          </button>
          <input
            type="number"
            className="seed-input-num"
            value={activeSeed}
            onChange={(e) => updateSeedSync(parseInt(e.target.value, 10) || 1)}
            min={1}
            max={9999}
          />
          <button
            type="button"
            className="seed-btn seed-inc"
            onClick={() => updateSeedSync(activeSeed + 1)}
            title="زيادة رقم البذرة"
          >
            +
          </button>
          <button
            type="button"
            className="seed-btn seed-rnd"
            onClick={() => updateSeedSync(Math.floor(Math.random() * 999) + 1)}
            title="توليد بذرة عشوائية جديدة"
          >
            <Icons.Rotate size={11} />
            <span className="seed-rnd-txt">عشوائي</span>
          </button>
        </div>

        <button
          type="button"
          className="fchip fchip-expmode"
          onClick={cycleExpModeSync}
          title="التبديل السريع بين أوضاع ظهور الشرح والتعليل"
        >
          {activeExpMode === "manual" ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}
          <span>
            {activeExpMode === "wrong_only"
              ? "الشرح: عند الخطأ"
              : activeExpMode === "manual"
              ? "الشرح: يدوي"
              : "الشرح: دائماً"}
          </span>
        </button>

        <button
          type="button"
          className="fchip print-hide"
          onClick={() => window.print()}
          title="طباعة نموذج الأسئلة المعروضة كأوراق تدريب ورقية أو ملف PDF"
        >
          <Icons.Print size={13} />
          <span>طباعة ورقة تدريب</span>
        </button>

        <button
          type="button"
          className={`fchip ${retest === "flagged" ? "on" : ""}`}
          onClick={() => startRetest("flagged")}
          disabled={flaggedIds.length === 0}
        >
          <Icons.Flag size={13} />
          مراجعة المعلّمة
        </button>

        {/* زر تصفير إجابات هذا النموذج المطابق لـ RM_Viewer */}
        {onResetModelAnswers && activeAnsCount > 0 && (
          <button
            type="button"
            className="fchip fchip-danger"
            onClick={() => {
              const targetName = selectedModelId === "all" ? "البنك الموحد" : (activeModelMeta?.title_ar || "هذا النموذج");
              if (window.confirm(`هل أنت متأكد من إلغاء اختيار كافة إجابات ${targetName} (${activeAnsCount} إجابة) لإعادة المحاولة؟`)) {
                onResetModelAnswers(selectedModelId);
              }
            }}
            title="إلغاء اختيار إجابات هذا النموذج لإعادة الحل"
          >
            <Icons.Rotate size={13} />
            <span>إلغاء اختيار الكل ({activeAnsCount})</span>
          </button>
        )}

      </div>

      {/* شريط البحث الموحد الأنيق في بنك الأسئلة */}
      <div className="unified-search-box" style={{ margin: "10px 0 16px" }}>
        <Icons.Search size={16} style={{ color: "var(--acc)", flexShrink: 0 }} />
        <input
          type="search"
          placeholder="ابحث في نصوص الأسئلة، الخيارات، أو الشروح والتعليلات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="البحث في بنك الأسئلة"
        />
        {searchQuery && (
          <span className="search-count-badge">
            {orderedQuestions.length} سؤال
          </span>
        )}
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            style={{ background: "none", border: "none", color: "var(--ink-m)", cursor: "pointer", padding: "4px", display: "flex" }}
            title="مسح البحث"
            aria-label="مسح البحث"
          >
            <Icons.Cross size={14} />
          </button>
        )}
      </div>

      {/* شريط فلتر العلامات الملونة (Bookmarks Strip) المطابق لـ RM_Viewer */}
      {showBookmarks && (
        <div className="fchips bank-bm-toolbar" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--ink-m)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icons.Bookmark size={13} />
            <span>العلامات:</span>
          </span>
          <button
            type="button"
            className={`fchip ${filterBm === "all" ? "on" : ""}`}
            onClick={() => setFilterBm("all")}
          >
            كل العلامات
          </button>
          {(["red", "yellow", "green", "blue"] as BookmarkColor[]).map((c) => {
            const count = bookmarkCounts[c] || 0;
            const label = bmLabels?.[c] || (c === "red" ? "أحمر" : c === "yellow" ? "أصفر" : c === "green" ? "أخضر" : "أزرق");
            const hex = c === "red" ? "#ef4444" : c === "yellow" ? "#f59e0b" : c === "green" ? "#10b981" : "#3b82f6";
            return (
              <button
                key={c}
                type="button"
                className={`fchip ${filterBm === c ? "on" : ""}`}
                onClick={() => setFilterBm(filterBm === c ? "all" : c)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: hex }} />
                <span>{label} ({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* شريط المحاضرات والبحث اليدوي */}
      <div className="bank-subtools">
        <div className="fchips">
          <button
            type="button"
            className={`fchip ${lectureFilter === "all" ? "on" : ""}`}
            onClick={() => setLectureFilter("all")}
          >
            كل المحاضرات
          </button>
          {lectures.map(([lec, count]) => (
            <button
              key={lec}
              type="button"
              className={`fchip ${lectureFilter === lec ? "on" : ""}`}
              onClick={() => setLectureFilter(lec)}
            >
              {lec} ({count})
            </button>
          ))}
        </div>

        <div className="manual-q-input" title="تصفية البنك بأرقام أسئلة محددة أو نطاق (مثال: 1-25 أو 3,7,12)">
          <span className="manual-q-ic">
            <Icons.List size={14} />
          </span>
          <input
            type="text"
            value={manualFilter}
            onChange={(e) => setManualFilter(e.target.value)}
            placeholder="أرقام أسئلة: 1-25 أو 3,7,12"
            aria-label="تصفية بأرقام الأسئلة"
          />
          {manualFilter && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setManualFilter("")}
              aria-label="مسح التصفية"
            >
              <Icons.Cross size={13} />
            </button>
          )}
        </div>

        <span className="def-result-count">
          المعروض: <b>{orderedQuestions.length}</b>
        </span>
      </div>

      <div className="model-origin" id="modelOrigin">
        <div className="model-origin-desc">
          <span className="model-origin-tag">
            <Icons.Definitions size={14} />
            {selectedModelId === "all"
              ? "البنك المجمع الموحد"
              : activeModelMeta?.origin_tag || activeModelMeta?.title_ar || "نموذج اختبار"}
          </span>
          <span>
            {selectedModelId === "all"
              ? "قسم شامل يضم كافة الأسئلة بعد دمج التوائم المكررة طبق الأصل، مع تفنيد المشتتات المزدوج والتعليل الصائب لكل سؤال."
              : activeModelMeta?.origin_ar || "أسئلة النموذج المعتمد مع الشرح المفصل وتفنيد الخيارات الخاطئة."}
          </span>
        </div>
        {(activeModelMeta?.origin_url ||
          (activeModelMeta?.origin_sources && activeModelMeta.origin_sources.length > 0)) && (
          <div className="model-origin-links">
            {activeModelMeta.origin_url && (
              <a href={activeModelMeta.origin_url} target="_blank" rel="noopener noreferrer" className="model-origin-link">
                <Icons.Jump size={12} />
                المصدر المعتمد
              </a>
            )}
            {activeModelMeta.origin_sources?.map((s, idx) =>
              s.url ? (
                <a key={idx} href={s.url} target="_blank" rel="noopener noreferrer" className="model-origin-link">
                  <Icons.Jump size={12} />
                  {s.label}
                </a>
              ) : (
                <span key={idx} className="model-origin-tag" style={{ background: "var(--sf)", color: "var(--ink-m)" }}>
                  {s.label}
                </span>
              )
            )}
          </div>
        )}
      </div>

      {orderedQuestions.length === 0 ? (
        <div className="pending-box">
          <div className="pb-ic"><Icons.Search size={30} /></div>
          <div className="pb-t">لا توجد أسئلة تطابق معايير التصفية المحددة</div>
          <div className="pb-s">
            {retest
              ? "أكملت جميع أسئلة جلسة الإعادة — أنهِ الجلسة أو غيّر الفلتر."
              : "جرّب إلغاء فلتر المحاضرة أو البحث أو أرقام الأسئلة."}
          </div>
        </div>
      ) : (
        <div id="bankCards" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {visibleQuestions.map((q, idx) => {
            // معالجة لخبطة خيارات السؤال إن كانت مفعلة
            let renderedQ = q;
            let currentAnswer = retest ? retestAnswers[q.id] : answeredMap[q.id];
            let onAnswerHandler = handleAnswerWithRetest;

            if (activeShuffleChoices && q.options_en && q.options_en.length >= 2) {
              const seedStr = `${subjectCode}#${q.id}#opts#${activeSeed}`;
              const rnd = ordSeed(seedStr);
              const perm = q.options_en.map((_, i) => i);
              for (let i = perm.length - 1; i > 0; i--) {
                const j = rnd() % (i + 1);
                const tmp = perm[i];
                perm[i] = perm[j];
                perm[j] = tmp;
              }

              const newOptsEn = perm.map((origIdx) => q.options_en[origIdx]);
              const newOptsAr = q.options_ar ? perm.map((origIdx) => q.options_ar[origIdx]) : [];
              const newCorrect = perm.indexOf(q.correct_answer);

              // إعادة تعيين تفنيد الخيارات
              let newDistractor: Record<string, any> | undefined = undefined;
              if (q.distractor_analysis) {
                newDistractor = {};
                perm.forEach((origIdx, newIdx) => {
                  if (q.distractor_analysis?.[String(origIdx)] !== undefined) {
                    newDistractor![String(newIdx)] = q.distractor_analysis[String(origIdx)];
                  }
                });
              }

              renderedQ = {
                ...q,
                options_en: newOptsEn,
                options_ar: newOptsAr,
                correct_answer: newCorrect,
                distractor_analysis: newDistractor || q.distractor_analysis
              };

              // إعادة تعيين إجابة المستخدم المختارة للموضع المخلوط
              if (currentAnswer && currentAnswer.selected_answer >= 0) {
                const shuffledPick = perm.indexOf(currentAnswer.selected_answer);
                currentAnswer = {
                  ...currentAnswer,
                  selected_answer: shuffledPick >= 0 ? shuffledPick : currentAnswer.selected_answer
                };
              }

              // معالج الإجابة يعيد التحويل للأصل
              onAnswerHandler = (qId, ansIdx, isCorrect, twinGroupId) => {
                const origIdx = ansIdx >= 0 && ansIdx < perm.length ? perm[ansIdx] : ansIdx;
                handleAnswerWithRetest(qId, origIdx, isCorrect, twinGroupId);
              };
            }

            return (
              <QuestionCard
                key={q.id}
                question={renderedQ}
                displayNumber={q.orig_q_num || idx + 1}
                userAnswer={currentAnswer}
                flagged={flaggedIds.includes(q.id)}
                onAnswer={onAnswerHandler}
                onToggleFlag={onToggleFlag}
                onJumpToSlide={onJumpToSlide}
                onShowTranslate={handleShowTranslate}
                languageMode={languageMode}
                showBookmarks={showBookmarks}
                bookmarks={bookmarksMap[q.id] || []}
                bmLabels={bmLabels}
                onToggleBookmark={(col) => onToggleBookmark?.(q.id, col, q.twin_group_id)}
                onOpenBmLabelModal={onOpenBmLabelModal}
                expMode={activeExpMode}
                onOpenTwinModal={(targetQ) => setActiveTwinModalQ(targetQ)}
                twinNumber={twinNumberMap[q.id]}
              />
            );
          })}
        </div>
      )}

      {orderedQuestions.length > visibleQuestions.length && (
        <div className="bank-more">
          <button type="button" className="btn btn-sm" onClick={() => setVisibleLimit((n) => n + 40)}>
            عرض المزيد من الأسئلة ({orderedQuestions.length - visibleQuestions.length} متبقٍ)
          </button>
        </div>
      )}

      {activeTwinModalQ && (
        <TwinQuestionModal
          question={activeTwinModalQ}
          twinQuestion={activeTwinTarget}
          onClose={() => setActiveTwinModalQ(null)}
          onJumpToQuestion={(qId) => {
            setActiveTwinModalQ(null);
            if (onJumpToQuestion) onJumpToQuestion(qId);
          }}
        />
      )}

      <SmartTranslateTooltip
        visible={tooltipState.visible}
        textAr={tooltipState.text}
        position={tooltipState.pos}
        onClose={() => setTooltipState((s) => ({ ...s, visible: false }))}
      />
    </div>
  );
};

// ==============================================================================
// المنصة التعليمية الموحدة — بنك الأسئلة الموحد (Authentic Question Bank)
// Model pills · origin docs · live scores · weak-lecture insights · flagged &
// wrong-only retest session · manual number filter · 4-color bookmarks ·
// deterministic shuffle (questions & choices) · zero emojis.
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import { QuestionCard } from "./QuestionCard";
import { TwinQuestionModal } from "./TwinQuestionModal";
import { SmartTranslateTooltip } from "../common/SmartTranslateTooltip";
import {
  sortQuestionsBySimilarity,
  sortQuestionsBySlides,
  type QuestionSortMode
} from "../../lib/questionOrder";
import {
  applyOptionPermutation,
  buildShuffledOptionPermutation,
  createDeterministicRng,
  fisherYatesShuffle,
  matchesNormalizedTerms
} from "../../lib/textUtils";
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
  lectures?: Array<{ id: string; title_ar: string }>;
  userProgress: UserStudyProgress;
  onAnswerQuestion: (questionId: string, answerIdx: number, isCorrect: boolean, twinGroupId?: string) => void;
  onJumpToSlide?: (ref: string) => void;
  onJumpToQuestion?: (questionId: string) => void;
  languageMode?: "smart" | "en" | "ar" | "both";
  onLanguageChange?: (mode: "smart" | "en" | "ar" | "both") => void;
  arabicOnly?: boolean;
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  focusQuestionId?: string | null;
  showBookmarks?: boolean;
  bmLabels?: BookmarkLabels;
  onToggleBookmark?: (questionId: string, color: string, twinGroupId?: string) => void;
  onOpenBmLabelModal?: () => void;
  expMode?: ExplanationMode;
  onChangeExpMode?: (mode: ExplanationMode) => void;
  expPromptSeen?: boolean;
  onDismissExpPrompt?: () => void;
  onOpenExpSettings?: () => void;
  shuffleChoices?: boolean;
  shuffleQuestions?: boolean;
  choicesSeed?: number;
  questionsSeed?: number;
  syncTwins?: boolean;
  onResetModelAnswers?: (modelId: string) => void;
}

function questionLecture(q: UnifiedQuestion): string {
  if (q.lecture_id) return q.lecture_id;
  if (q.slide_ref && q.slide_ref.includes("-")) return q.slide_ref.split("-")[0];
  return "عام";
}

function parseManualFilter(
  raw: string,
  allQuestions?: UnifiedQuestion[],
  twinGroups?: Map<string, UnifiedQuestion[]>
): { numSet: Set<number>; textQuery: string | null } | null {
  const text = raw.trim();
  if (!text) return null;
  const maxQNum = Math.max(
    500,
    ...(allQuestions || []).map((q) => q.orig_q_num || 0)
  );
  const numSet = new Set<number>();
  const parts = text.split(/[,،\s]+/).filter(Boolean);
  let hasNumber = false;
  for (const part of parts) {
    const range = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (range) {
      hasNumber = true;
      const start = Number(range[1]);
      const end = Number(range[2]);
      const mn = Math.max(1, Math.min(start, end));
      const mx = Math.min(maxQNum, Math.max(start, end));
      for (let n = mn; n <= mx; n++) numSet.add(n);
    } else if (/^\d+$/.test(part)) {
      hasNumber = true;
      numSet.add(Number(part));
    }
  }

  // إضافة أرقام التوائم للأسئلة المحددة بتعقيد O(n) بدلاً من O(n^2)
  if (hasNumber && allQuestions && twinGroups && numSet.size > 0) {
    const twinsToAdd: number[] = [];
    for (const q of allQuestions) {
      if (numSet.has(q.orig_q_num) && q.twin_group_id) {
        const group = twinGroups.get(q.twin_group_id) || [];
        for (const other of group) {
          if (other.id !== q.id) twinsToAdd.push(other.orig_q_num);
        }
      }
    }
    twinsToAdd.forEach((n) => numSet.add(n));
  }

  return {
    numSet,
    textQuery: hasNumber ? null : text
  };
}

export const UnifiedQuestionBankView: React.FC<UnifiedQuestionBankViewProps> = ({
  subjectCode,
  questions,
  models,
  lectures: subjectLectures = [],
  userProgress,
  onAnswerQuestion,
  onJumpToSlide,
  onJumpToQuestion,
  languageMode = "smart",
  onLanguageChange,
  arabicOnly = false,
  selectedModelId: propSelectedModelId,
  onSelectModel,
  focusQuestionId,
  showBookmarks = true,
  bmLabels,
  onToggleBookmark,
  onOpenBmLabelModal,
  expMode = "always",
  onChangeExpMode,
  expPromptSeen = true,
  onDismissExpPrompt,
  onOpenExpSettings,
  shuffleChoices = false,
  shuffleQuestions = false,
  choicesSeed = 1,
  questionsSeed = 1,
  syncTwins = false,
  onResetModelAnswers
}) => {
  const [internalModelId, setInternalModelId] = useState<string>("all");
  const selectedModelId = propSelectedModelId !== undefined ? propSelectedModelId : internalModelId;
  const setSelectedModelId = (id: string) => {
    setInternalModelId(id);
    if (onSelectModel) onSelectModel(id);
  };

  const [sortMode, setSortMode] = useState<QuestionSortMode>("natural");
  const [filterState, setFilterState] = useState<"all" | "unsolved" | "solved" | "wrong" | "correct">("all");
  const [filterBm, setFilterBm] = useState<"all" | BookmarkColor>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lectureFilter, setLectureFilter] = useState<string>("all");
  const [manualFilter, setManualFilter] = useState<string>("");
  const retestStorageKey = `unified_retest_${subjectCode}`;
  const [retest, setRetest] = useState<null | "wrong">(() => {
    try {
      const saved = sessionStorage.getItem(retestStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.ids?.length) return "wrong";
      }
    } catch {}
    return null;
  });
  const [retestIds, setRetestIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem(retestStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.ids)) return new Set(parsed.ids);
      }
    } catch {}
    return new Set();
  });
  const [retestAnswered, setRetestAnswered] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem(retestStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.answers) return new Set(Object.keys(parsed.answers));
      }
    } catch {}
    return new Set();
  });
  const [retestAnswers, setRetestAnswers] = useState<
    Record<string, { selected_answer: number; is_correct: boolean }>
  >(() => {
    try {
      const saved = sessionStorage.getItem(retestStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.answers) return parsed.answers;
      }
    } catch {}
    return {};
  });
  const [retestOrigAns, setRetestOrigAns] = useState<
    Record<string, { selected_answer: number; is_correct: boolean }>
  >(() => {
    try {
      const saved = sessionStorage.getItem(retestStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.origAns) return parsed.origAns;
      }
    } catch {}
    return {};
  });
  const [activeTwinModalQ, setActiveTwinModalQ] = useState<UnifiedQuestion | null>(null);
  const [visibleLimit, setVisibleLimit] = useState<number>(40);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    text: string;
    pos: { x: number; y: number } | null;
  }>({ visible: false, text: "", pos: null });
  const hoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeExpMode, setActiveExpMode] = useState<ExplanationMode>(expMode);

  useEffect(() => {
    setActiveExpMode(expMode);
  }, [expMode]);

  useEffect(() => {
    return () => {
      if (hoverHideTimerRef.current) clearTimeout(hoverHideTimerRef.current);
    };
  }, []);

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
  const bookmarksMap = userProgress.bookmarks || {};

  const modelQuestions = useMemo(
    () => (selectedModelId === "all" ? questions : questions.filter((q) => q.model_id === selectedModelId)),
    [questions, selectedModelId]
  );

  const twinGroupsMap = useMemo(() => {
    const groups = new Map<string, UnifiedQuestion[]>();
    for (const q of questions) {
      if (!q.twin_group_id) continue;
      const list = groups.get(q.twin_group_id) || [];
      list.push(q);
      groups.set(q.twin_group_id, list);
    }
    return groups;
  }, [questions]);

  const activeTwinTarget = useMemo(() => {
    if (!activeTwinModalQ || !activeTwinModalQ.twin_group_id) return undefined;
    const group = twinGroupsMap.get(activeTwinModalQ.twin_group_id) || [];
    return group.find((q) => q.id !== activeTwinModalQ.id);
  }, [activeTwinModalQ, twinGroupsMap]);

  const twinNumberMap = useMemo(() => {
    const map: Record<string, number> = {};
    twinGroupsMap.forEach((group) => {
      if (group.length < 2) return;
      for (const q of group) {
        const other = group.find((o) => o.id !== q.id);
        if (other) map[q.id] = other.orig_q_num;
      }
    });
    return map;
  }, [twinGroupsMap]);

  const lectures = useMemo(() => {
    const map = new Map<string, number>();
    modelQuestions.forEach((q) => {
      const lec = questionLecture(q);
      map.set(lec, (map.get(lec) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en"));
  }, [modelQuestions]);

  const manualData = useMemo(
    () => parseManualFilter(manualFilter, questions, twinGroupsMap),
    [manualFilter, questions, twinGroupsMap]
  );

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
    modelQuestions.forEach((q) => {
      const a = answeredMap[q.id];
      if (a && a.selected_answer >= 0) {
        solved++;
        if (a.is_correct) correct++;
        else wrong++;
      }
    });
    return {
      total: modelQuestions.length,
      unsolved: Math.max(0, modelQuestions.length - solved),
      solved,
      correct,
      wrong
    };
  }, [modelQuestions, answeredMap]);

  // عدد الأسئلة المحلولة في النموذج الحالي
  const activeAnsCount = statusCounts.solved;

  const filteredQuestions = useMemo(() => {
    const q = searchQuery.trim();

    return modelQuestions.filter((question) => {
      if (retest && !retestIds.has(question.id)) return false;
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
          ].join(" ");
          if (!matchesNormalizedTerms(haystack, manualData.textQuery)) return false;
        }
      }

      if (showBookmarks && filterBm !== "all") {
        const qBms = bookmarksMap[question.id] || [];
        if (!qBms.includes(filterBm)) return false;
      }

      if (!retest) {
        const ans = answeredMap[question.id];
        if (filterState === "unsolved" && ans && ans.selected_answer >= 0) return false;
        if (filterState === "solved" && (!ans || ans.selected_answer < 0)) return false;
        if (filterState === "wrong" && (!ans || ans.is_correct || ans.selected_answer < 0)) return false;
        if (filterState === "correct" && (!ans || !ans.is_correct)) return false;
      }

      if (q) {
        const haystack = [
          question.question_en,
          question.question_ar,
          ...question.options_en,
          ...(question.options_ar || []),
          question.why_correct,
          question.slide_ref || ""
        ].join(" ");
        if (!matchesNormalizedTerms(haystack, q)) return false;
      }
      return true;
    });
  }, [
    modelQuestions,
    retest,
    retestIds,
    lectureFilter,
    manualData,
    filterState,
    filterBm,
    showBookmarks,
    bookmarksMap,
    answeredMap,
    searchQuery
  ]);

  const orderedQuestions = useMemo(() => {
    if (sortMode === "similarity") {
      return sortQuestionsBySimilarity(filteredQuestions);
    }
    if (sortMode === "slides") {
      return sortQuestionsBySlides(filteredQuestions);
    }
    if (!shuffleQuestions) return filteredQuestions;

    const answered: UnifiedQuestion[] = [];
    const unanswered: UnifiedQuestion[] = [];

    filteredQuestions.forEach((q) => {
      const a = retest ? retestAnswers[q.id] : answeredMap[q.id];
      if (a && a.selected_answer >= 0) answered.push(q);
      else unanswered.push(q);
    });

    const seedStr = `${subjectCode}#${selectedModelId}#unans#${questionsSeed}`;
    const shuffledUnanswered = fisherYatesShuffle(unanswered, createDeterministicRng(seedStr));
    return [...answered, ...shuffledUnanswered];
  }, [
    filteredQuestions,
    sortMode,
    shuffleQuestions,
    subjectCode,
    selectedModelId,
    questionsSeed,
    answeredMap,
    retest,
    retestAnswers
  ]);

  // حساب خلط الخيارات الذكي بشكل محفوظ (Memoized) يحمي الخيارات الموضعية ويحافظ على كفاءة React.memo
  const shuffledChoiceCache = useMemo(() => {
    const map = new Map<string, { perm: number[]; question: UnifiedQuestion }>();
    if (!shuffleChoices) return map;
    for (const q of questions) {
      if (q.type === "essay" || !q.options_en || q.options_en.length < 2) continue;
      const seedStr = `${subjectCode}#${q.id}#opts#${choicesSeed}`;
      const perm = buildShuffledOptionPermutation(q.options_en, q.options_ar, seedStr);
      map.set(q.id, { perm, question: applyOptionPermutation(q, perm) });
    }
    return map;
  }, [questions, shuffleChoices, subjectCode, choicesSeed]);

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

  // التحليل الذكي للأداء عبر كل المحاضرات أو النماذج (مطابق لـ RM_Viewer)
  const smartInsights = useMemo(() => {
    const hasLecData =
      subjectLectures.length > 0 &&
      questions.some((q) => Boolean(q.lecture_id || (q.slide_ref && q.slide_ref.includes("-"))));

    const groupMap = new Map<
      string,
      { id: string; name: string; total: number; answered: number; correct: number; wrong: number }
    >();

    questions.forEach((q) => {
      const groupId = hasLecData ? questionLecture(q) : q.model_id;
      if (!groupId || groupId === "عام") {
        if (hasLecData) return;
      }
      const ans = answeredMap[q.id];
      if (!ans || ans.selected_answer < 0) return;

      let groupName = groupId;
      if (hasLecData) {
        const lecMeta = subjectLectures.find((l) => l.id === groupId);
        groupName = lecMeta ? `${groupId} · ${lecMeta.title_ar}` : groupId;
      } else {
        const modMeta = models.find((m) => m.id === groupId);
        groupName = modMeta ? modMeta.short_label || modMeta.title_ar || groupId : groupId;
      }

      const row = groupMap.get(groupId) || {
        id: groupId,
        name: groupName,
        total: 0,
        answered: 0,
        correct: 0,
        wrong: 0
      };
      row.answered++;
      if (ans.is_correct) row.correct++;
      else row.wrong++;
      groupMap.set(groupId, row);
    });

    const rows = Array.from(groupMap.values()).sort((a, b) => {
      const ra = a.answered > 0 ? a.correct / a.answered : 1;
      const rb = b.answered > 0 ? b.correct / b.answered : 1;
      if (ra !== rb) return ra - rb;
      return b.wrong - a.wrong;
    });

    const totalAns = rows.reduce((s, r) => s + r.answered, 0);
    const totalCorrect = rows.reduce((s, r) => s + r.correct, 0);
    const totalWrong = rows.reduce((s, r) => s + r.wrong, 0);
    const acc = totalAns > 0 ? Math.round((totalCorrect / totalAns) * 100) : 0;
    const isWeakRow = (r: { wrong: number; answered: number; correct: number }) =>
      r.wrong > 0 && (r.answered >= 3 ? r.correct / r.answered < 0.75 : true);
    const weakTargets = rows.filter((r) => r.wrong > 0).slice(0, 3);

    return { rows, totalAns, totalCorrect, totalWrong, acc, isWeakRow, weakTargets, hasLecData };
  }, [questions, answeredMap, subjectLectures, models]);

  // حفظ جلسة إعادة الاختبار في sessionStorage لحماية التقدم
  useEffect(() => {
    try {
      if (!retest || retestIds.size === 0) {
        sessionStorage.removeItem(retestStorageKey);
      } else {
        sessionStorage.setItem(
          retestStorageKey,
          JSON.stringify({
            ids: Array.from(retestIds),
            answers: retestAnswers,
            origAns: retestOrigAns
          })
        );
      }
    } catch {}
  }, [retest, retestIds, retestAnswers, retestOrigAns, retestStorageKey]);

  // بدء جلسة إعادة اختبار ذكية تحفظ لقطة من الإجابات السابقة دون إتلاف سجل الطالب
  const startRetest = (customIds?: string[]) => {
    const ids = new Set<string>();
    const origSnap: Record<string, { selected_answer: number; is_correct: boolean }> = {};

    if (customIds && customIds.length > 0) {
      customIds.forEach((id) => {
        ids.add(id);
        const a = answeredMap[id];
        if (a && a.selected_answer >= 0) origSnap[id] = a;
      });
    } else {
      modelQuestions.forEach((q) => {
        const a = answeredMap[q.id];
        if (a && !a.is_correct && a.selected_answer >= 0) {
          ids.add(q.id);
          origSnap[q.id] = a;
        }
      });
    }

    if (ids.size === 0) return;

    setRetest("wrong");
    setRetestIds(ids);
    setRetestAnswers({});
    setRetestAnswered(new Set());
    setRetestOrigAns(origSnap);
    setVisibleLimit(Math.max(40, ids.size));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reviewWeakTarget = (targetId: string) => {
    const isModel = models.some((m) => m.id === targetId);
    const targetWrongIds = questions
      .filter((q) => {
        const match = isModel ? q.model_id === targetId : questionLecture(q) === targetId;
        if (!match) return false;
        const a = answeredMap[q.id];
        return Boolean(a && !a.is_correct && a.selected_answer >= 0);
      })
      .map((q) => q.id);

    if (targetWrongIds.length === 0) return;
    if (isModel) {
      setSelectedModelId(targetId);
      setLectureFilter("all");
    } else {
      setSelectedModelId("all");
      setLectureFilter(targetId);
    }
    setFilterState("all");
    startRetest(targetWrongIds);
  };

  const stopRetest = () => {
    // الإجابات التي لم يُجب عليها الطالب داخل جلسة الإعادة بقيت محفوظة كما هي في السجل الأصلي
    setRetest(null);
    setRetestIds(new Set());
    setRetestAnswers({});
    setRetestAnswered(new Set());
    setRetestOrigAns({});
  };

  const handleAnswerWithRetest = useCallback(
    (qId: string, idx: number, ok: boolean, twinGroupId?: string) => {
      const cachedShuffle = shuffledChoiceCache.get(qId);
      const origIdx =
        cachedShuffle && idx >= 0 && idx < cachedShuffle.perm.length
          ? cachedShuffle.perm[idx]
          : idx;

      if (retest) {
        if (origIdx < 0) {
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
            [qId]: { selected_answer: origIdx, is_correct: ok }
          }));
          setRetestAnswered((prev) => {
            const next = new Set(prev);
            next.add(qId);
            return next;
          });
          onAnswerQuestion(qId, origIdx, ok, twinGroupId);
        }
      } else {
        onAnswerQuestion(qId, origIdx, ok, twinGroupId);
      }
    },
    [retest, onAnswerQuestion, shuffledChoiceCache]
  );

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

  // القفز المضمون للسؤال المستهدف: إزالة الفلاتر الحاجبة، ضبط النموذج، وتوسيع حد العرض
  useEffect(() => {
    if (!focusQuestionId) return;
    const targetQ = questions.find((q) => q.id === focusQuestionId);
    if (targetQ) {
      if (selectedModelId !== "all" && targetQ.model_id !== selectedModelId) {
        setSelectedModelId("all");
      }
      if (retest && !retestIds.has(focusQuestionId)) {
        stopRetest();
      }
      if (searchQuery) setSearchQuery("");
      if (lectureFilter !== "all" && questionLecture(targetQ) !== lectureFilter) {
        setLectureFilter("all");
      }
      if (filterState !== "all") setFilterState("all");
      if (filterBm !== "all") setFilterBm("all");
      if (manualFilter) setManualFilter("");
    }
  }, [focusQuestionId, questions]);

  useEffect(() => {
    if (!focusQuestionId) return;
    const idx = orderedQuestions.findIndex((q) => q.id === focusQuestionId);
    if (idx >= 0 && idx >= visibleLimit) {
      setVisibleLimit(idx + 12);
      return;
    }
    const timer = setTimeout(() => {
      const el = document.getElementById(`q-${focusQuestionId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("focus-glow");
        setTimeout(() => el.classList.remove("focus-glow"), 2500);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [focusQuestionId, orderedQuestions, visibleLimit]);

  const handleCloseTooltip = useCallback(() => {
    setTooltipState((s) => ({ ...s, visible: false }));
  }, []);

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
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
    setTooltipState({ visible: true, text, pos });
  };

  const handleScheduleHideTranslate = () => {
    if (hoverHideTimerRef.current) clearTimeout(hoverHideTimerRef.current);
    hoverHideTimerRef.current = setTimeout(() => {
      setTooltipState((s) => ({ ...s, visible: false }));
    }, 180);
  };

  const handleCancelHideTranslate = () => {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
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
      // حماية: عدم تنفيذ اختصارات البنك عند فتح أي نافذة منبثقة أو لايت بوكس
      if (document.querySelector('[role="dialog"], #lightboxModal')) return;

      const qCards = Array.from(document.querySelectorAll<HTMLElement>(".q-card"));
      if (qCards.length === 0) return;

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

      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        const nextCard = qCards[Math.min(qCards.length - 1, activeIdx + 1)];
        if (nextCard) nextCard.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        const prevCard = qCards[Math.max(0, activeIdx - 1)];
        if (prevCard) prevCard.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // 1-4 لاختيار الخيار دون التصادم مع مفتاح B للعلامات
      const optMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
      const optIdx = optMap[e.key];
      if (optIdx !== undefined) {
        const optBtns = activeCard.querySelectorAll<HTMLButtonElement>(".opt-btn");
        if (optBtns[optIdx]) {
          e.preventDefault();
          optBtns[optIdx].click();
          return;
        }
      }

      // E: كشف أو طي الشرح والتعليل
      if (e.key.toLowerCase() === "e") {
        const whyBtn = activeCard.querySelector<HTMLButtonElement>(".q-toggle-exp-btn, .essay-reveal");
        if (whyBtn) {
          e.preventDefault();
          whyBtn.click();
          return;
        }
      }

      // B أو F: فتح قائمة العلامات المرجعية الملونة
      if (e.key.toLowerCase() === "b" || e.key.toLowerCase() === "f") {
        const bmBtn = activeCard.querySelector<HTMLButtonElement>(".q-bm-btn, .bm-btn");
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
          أجبت عن {stats.answered} من {stats.total} سؤالاً · نسبة الدقة الإجمالية: {stats.percentage}%
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
          <div className="rt-ic">
            {retestRemaining === 0 ? <Icons.Check size={21} /> : <Icons.Rotate size={21} />}
          </div>
          <div className="rt-body">
            <div className="rt-title">
              {retestRemaining === 0
                ? "أنهيت جلسة إعادة اختبار الأخطاء"
                : "جلسة إعادة اختبار الأخطاء"}
            </div>
            <div className="rt-sub">
              {retestRemaining === 0
                ? retestSessionStats.wrong === 0
                  ? "أجبت عن جميع الأسئلة بشكل صحيح — أحسنت!"
                  : `أنهيت ${retestSessionStats.total} سؤالاً · صحيح ${retestSessionStats.correct} · لا يزال خطأ ${retestSessionStats.wrong}`
                : `أعد الإجابة على هذه الأسئلة بنفسك · أجبت ${retestSessionStats.answered} من ${retestSessionStats.total} · صحيح ${retestSessionStats.correct}`}
            </div>
            <div className="rt-bar">
              <i
                style={{
                  width: `${retestIds.size > 0 ? Math.round((retestAnswered.size / retestIds.size) * 100) : 0}%`
                }}
              />
            </div>
          </div>

          <div className="rt-actions">
            {retestSessionStats.wrong > 0 && (
              <button type="button" className="rt-btn rt-btn-primary" onClick={retryRemainingWrong}>
                <Icons.Rotate size={14} />
                <span>
                  {retestSessionStats.wrong === retestSessionStats.total && retestRemaining === 0
                    ? "أعد المحاولة من جديد"
                    : `أعد محاولة الأخطاء المتبقية (${retestSessionStats.wrong})`}
                </span>
              </button>
            )}
            <button type="button" className="rt-btn" onClick={stopRetest}>
              <Icons.Back size={14} />
              <span>إنهاء المراجعة</span>
            </button>
          </div>
        </div>
      )}

      {!retest && (
        <div className="model-insights">
          {smartInsights.totalAns < 1 ? (
            <div className="ins-empty">
              <Icons.Award size={16} />
              <span>
                {smartInsights.hasLecData
                  ? "أجب على أسئلتك الأولى ليبدأ التحليل الذكي ويوصيك بالمحاضرات التي تحتاج مراجعة."
                  : "أجب على أسئلتك الأولى ليبدأ التحليل الذكي ويوصيك بالنماذج التي تحتاج مراجعة."}
              </span>
            </div>
          ) : (
            <div className="insights-card">
              <div className="ins-head">
                <div className="ins-ic">
                  <Icons.Award size={20} />
                </div>
                <div className="ins-titles">
                  <div className="ins-title">التحليل الذكي لأدائك</div>
                  <div className="ins-sub">
                    {smartInsights.hasLecData
                      ? "مبني على إجاباتك السابقة عبر كل المحاضرات"
                      : "مبني على إجاباتك السابقة عبر كل النماذج"}
                  </div>
                </div>
                <div className="ins-overall">
                  <span className="ins-stat">
                    الدقة <b>{smartInsights.acc}%</b>
                  </span>
                  <span className="ins-stat">
                    خطأ <b style={{ color: "var(--err)" }}>{smartInsights.totalWrong}</b>
                  </span>
                  <span className="ins-stat">
                    أجبت <b>{smartInsights.totalAns}</b>
                  </span>
                </div>
              </div>

              <div className="ins-lecs">
                {smartInsights.rows.map((r) => {
                  const pct = r.answered > 0 ? Math.round((r.correct / r.answered) * 100) : 0;
                  const weak = smartInsights.isWeakRow(r);
                  return (
                    <div key={r.id} className={`ins-lec ${weak ? "is-weak" : ""}`}>
                      <div className="ins-lec-top">
                        <span className="ins-lec-name" title={r.name}>{r.name}</span>
                        <span className="ins-lec-pct">{pct}%</span>
                      </div>
                      <div className="ins-bar">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                      <div className="ins-lec-foot">
                        <span className="ins-lec-meta">صحيح {r.correct} · خطأ {r.wrong}</span>
                        <button
                          type="button"
                          className="ins-btn"
                          disabled={r.wrong === 0}
                          title={
                            r.wrong > 0
                              ? `أعد اختبار أسئلة ${r.name} التي أخطأت فيها`
                              : "لا أخطاء في هذا القسم"
                          }
                          onClick={() => reviewWeakTarget(r.id)}
                        >
                          <Icons.Rotate size={12} />
                          <span>أعد اختبار</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {smartInsights.weakTargets.length > 0 ? (
                <div className="ins-tip warn">
                  التوصية: ركّز على{" "}
                  <b>{smartInsights.weakTargets.map((r) => r.name).join("، ")}</b> — هذه أضعف
                  نقاطك من حيث نسبة الأخطاء، ابدأ بإعادة اختبارها.
                </div>
              ) : (
                <div className="ins-tip">
                  أداؤك ممتاز حتى الآن — لا توجد أخطاء مسجّلة، واصل التقدّم.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* شريط الفلاتر الأساسي مع العدادات الحية المطابق لـ RM_Viewer */}
      <div className="fchips bank-toolbar">
        {[
          { id: "all" as const, label: `الكل (${statusCounts.total})` },
          { id: "unsolved" as const, label: `لم يُحل (${statusCounts.unsolved})` },
          { id: "solved" as const, label: `محلول (${statusCounts.solved})` },
          { id: "correct" as const, label: `صحيح (${statusCounts.correct})` },
          { id: "wrong" as const, label: `خاطئ (${statusCounts.wrong})` }
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
          className={`fchip fchip-review-wrong ${statusCounts.wrong === 0 ? "is-empty" : ""}`}
          onClick={() => startRetest()}
          disabled={statusCounts.wrong === 0}
          title="ابدأ جلسة إعادة اختبار للأسئلة التي أخطأت فيها في هذا النطاق دون إتلاف إجاباتك"
        >
          <Icons.Reset size={13} />
          إعادة اختبار الأخطاء{statusCounts.wrong > 0 ? ` (${statusCounts.wrong})` : ""}
        </button>

        {/* مبدّل لغة الأسئلة خارج الإعدادات */}
        {!arabicOnly && onLanguageChange && (
          <div className="fchip-group" role="group" aria-label="لغة أسئلة البنك">
            {[
              { id: "smart" as const, label: "ذكي", title: "الإنجليزية مع الترجمة الفورية عند التمرير بالماوس أو النقر" },
              { id: "en" as const, label: "English", title: "عرض الأسئلة بالإنجليزية فقط" },
              { id: "ar" as const, label: "عربي", title: "عرض الأسئلة بالعربية فقط" },
              { id: "both" as const, label: "الاثنين", title: "عرض الإنجليزية والعربية معاً" }
            ].map((lang) => (
              <button
                key={lang.id}
                type="button"
                className={`fchip ${languageMode === lang.id ? "on" : ""}`}
                onClick={() => onLanguageChange(lang.id)}
                title={lang.title}
              >
                {lang.id === "smart" && <Icons.Translate size={13} />}
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* محدد نمط ترتيب الأسئلة */}
        <div className="fchip-group" role="group" aria-label="ترتيب الأسئلة">
          {[
            {
              id: "natural" as const,
              label: shuffleQuestions ? "طبيعي (عشوائي)" : "ترتيب طبيعي",
              title: shuffleQuestions
                ? "الترتيب العشوائي المفعل من الإعدادات"
                : "ترتيب الأسئلة الأصلي كما ورد في النموذج"
            },
            {
              id: "similarity" as const,
              label: "حسب التشابه",
              title: "تجميع الأسئلة المتشابهة والمتكررة والمرتبطة موضوعياً بجانب بعضها"
            },
            {
              id: "slides" as const,
              label: "حسب الدروس والسلايدات",
              title: "ترتيب الأسئلة تصاعدياً حسب رقم المحاضرة ورقم السلايد المرتبط بها"
            }
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`fchip ${sortMode === mode.id ? "on" : ""}`}
              onClick={() => setSortMode(mode.id)}
              title={mode.title}
            >
              {mode.id === "slides" ? (
                <Icons.Slides size={13} />
              ) : mode.id === "similarity" ? (
                <Icons.Layers size={13} />
              ) : (
                <Icons.List size={13} />
              )}
              <span>{mode.label}</span>
            </button>
          ))}
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
              ? `قسم شامل يضم كافة الأسئلة من جميع النماذج، مع دعم الترتيب حسب التشابه أو حسب تسلسل الدروس والشرائح${syncTwins ? " ومزامنة المتطابقات تلقائياً" : ""}.`
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
            const cachedShuffle = shuffledChoiceCache.get(q.id);
            const renderedQ = cachedShuffle ? cachedShuffle.question : q;
            let currentAnswer = retest ? retestAnswers[q.id] : answeredMap[q.id];

            if (cachedShuffle && currentAnswer && currentAnswer.selected_answer >= 0) {
              const shuffledPick = cachedShuffle.perm.indexOf(currentAnswer.selected_answer);
              if (shuffledPick >= 0 && shuffledPick !== currentAnswer.selected_answer) {
                currentAnswer = { ...currentAnswer, selected_answer: shuffledPick };
              }
            }

            return (
              <QuestionCard
                key={q.id}
                question={renderedQ}
                displayNumber={q.orig_q_num || idx + 1}
                userAnswer={currentAnswer}
                onAnswer={handleAnswerWithRetest}
                onJumpToSlide={onJumpToSlide}
                onShowTranslate={handleShowTranslate}
                onScheduleHideTranslate={handleScheduleHideTranslate}
                languageMode={languageMode}
                showBookmarks={showBookmarks}
                bookmarks={bookmarksMap[q.id] || []}
                bmLabels={bmLabels}
                onToggleBookmark={(col) => onToggleBookmark?.(q.id, col, q.twin_group_id)}
                onOpenBmLabelModal={onOpenBmLabelModal}
                expMode={activeExpMode}
                onOpenTwinModal={(targetQ) => setActiveTwinModalQ(targetQ)}
                twinNumber={twinNumberMap[q.id]}
                isRetestQuestion={Boolean(retest)}
                expPromptSeen={expPromptSeen}
                onDismissExpPrompt={onDismissExpPrompt}
                onOpenExpSettings={onOpenExpSettings}
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
        onClose={handleCloseTooltip}
        onMouseEnterTooltip={handleCancelHideTranslate}
        onMouseLeaveTooltip={handleScheduleHideTranslate}
      />
    </div>
  );
};

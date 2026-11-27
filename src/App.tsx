// ==============================================================================
// المنصة التعليمية الموحدة — المنسق العام (Authentic Unified Study App)
// Exact authentic layout & master CSS architecture from RM_Viewer & TOC_Slides_Viewer
// Zero Emojis Standard · High-Performance React 19 + TypeScript
// ==============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from "react";
import { DataService, type SubjectBundle } from "./lib/dataService";
import { safeJsonParse } from "./lib/textUtils";
import {
  restoreScrollPosition,
  restoreScrollToElement,
  parseLocationHash,
  buildLocationHash,
  resolveSlideReference,
  jumpDirectlyToSlide
} from "./lib/scrollRestoration";
import { Icons } from "./components/icons/SvgIcons";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { UnifiedAppHeader } from "./components/common/UnifiedAppHeader";
import { CompanionNavigation } from "./components/common/CompanionNavigation";
import { PortalModal } from "./components/common/PortalModal";
import { PwaInstallBanner } from "./components/common/PwaInstallBanner";
import { PwaInstallGuideModal } from "./components/common/PwaInstallGuideModal";
import { usePwaInstall } from "./lib/usePwaInstall";
import { BookmarkLabelModal } from "./components/common/BookmarkLabelModal";
import { GlobalSearchModal } from "./components/common/GlobalSearchModal";
import { ShortcutsCheatsheetModal } from "./components/common/ShortcutsCheatsheetModal";
import { OfflineManagerModal } from "./components/common/OfflineManagerModal";
import { ReportIssueModal } from "./components/common/ReportIssueModal";
import { RequestSubjectModal } from "./components/common/RequestSubjectModal";
import type { ReportContext } from "./lib/submissionsService";
import { SlidesViewer } from "./components/slides/SlidesViewer";
import { TheoreticalSummaryView } from "./components/summary/TheoreticalSummaryView";
import { SummaryOfSummaryView } from "./components/emergency/SummaryOfSummaryView";
import { ExplanatoryTablesView } from "./components/tables/ExplanatoryTablesView";
import { UnifiedQuestionBankView } from "./components/questions/UnifiedQuestionBankView";
import { QuestionBankExplorer } from "./components/questions/QuestionBankExplorer";
import { DefinitionsView } from "./components/definitions/DefinitionsView";
import type {
  SubjectMeta,
  ActiveView,
  ZenZoomLevel,
  UserStudyProgress,
  ExplanationMode,
  BookmarkLabels
} from "./types";

const ExamSimulator = lazy(() =>
  import("./components/questions/ExamSimulator").then((m) => ({ default: m.ExamSimulator }))
);
const InteractiveStudioHost = lazy(() =>
  import("./components/interactive/InteractiveStudioHost").then((m) => ({ default: m.InteractiveStudioHost }))
);
const ConceptStudios = lazy(() =>
  import("./components/interactive/ConceptStudios").then((m) => ({ default: m.ConceptStudios }))
);
const GlossaryView = lazy(() =>
  import("./components/glossary/GlossaryView").then((m) => ({ default: m.GlossaryView }))
);
const PatternsLabView = lazy(() =>
  import("./components/patterns/PatternsLabView").then((m) => ({ default: m.PatternsLabView }))
);
const LabAppendixView = lazy(() =>
  import("./components/lab/LabAppendixView").then((m) => ({ default: m.LabAppendixView }))
);
const AdminReviewModal = lazy(() =>
  import("./components/common/AdminReviewModal").then((m) => ({ default: m.AdminReviewModal }))
);

export const App: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const [currentSubjectCode, setCurrentSubjectCode] = useState<string>(() => {
    return localStorage.getItem("unified_active_subject") || "rm";
  });
  const [bundle, setBundle] = useState<SubjectBundle | null>(null);
  const [userProgress, setUserProgress] = useState<UserStudyProgress | null>(null);
  // استخراج الحالة الأولية من الـ URL Hash أو الجلسة المحفوظة لضمان البقاء في نفس الموضع والقسم بعد التحديث (القاعدة 11)
  const initialHash = useMemo(() => parseLocationHash(), []);
  const initialStored = useMemo(() => {
    try {
      const saved = sessionStorage.getItem(`unified_pos_${currentSubjectCode}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [currentSubjectCode]);

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (initialHash.view) return initialHash.view;
    if (initialStored?.view) return initialStored.view;
    return "slides";
  });
  const [activeLectureId, setActiveLectureId] = useState<string>(() => {
    if (initialHash.lec) return initialHash.lec;
    if (initialStored?.lec) return initialStored.lec;
    return "all";
  });
  const [tablesLectureFilter, setTablesLectureFilter] = useState<string>("all");
  const [activeLabSession, setActiveLabSession] = useState<string>("all");
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    if (initialHash.model) return initialHash.model;
    if (initialStored?.model) return initialStored.model;
    return "all";
  });
  const [targetSlideRef, setTargetSlideRef] = useState<string | null>(() => {
    return initialHash.ref || null;
  });

  const viewScrollRef = useRef<Record<string, number>>({});
  const initialScrollTargetRef = useRef<number | null>(
    typeof initialStored?.scrollY === "number" ? initialStored.scrollY : null
  );

  const [zenLevel, setZenLevel] = useState<ZenZoomLevel>(0);
  const [isPortalOpen, setIsPortalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // الثيم والنمط (مسائي/نهاري) على مستوى التطبيق لضمان تزامن اختصار M مع الهيدر
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("unified_theme") || "amber");
  const [mode, setMode] = useState<"dark" | "light">(() =>
    localStorage.getItem("unified_mode") === "light" ? "light" : "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("unified_theme", theme);
    localStorage.setItem("unified_mode", mode);
  }, [theme, mode]);

  // حالة الاتصال بالإنترنت وإشعار تحديث Service Worker والتنبيهات المؤقتة
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [swUpdateReady, setSwUpdateReady] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 4200);
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onSwUpdate = () => setSwUpdateReady(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("usp-sw-update-ready", onSwUpdate);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("usp-sw-update-ready", onSwUpdate);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // النوافذ المساعدة المتقدمة
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [reportContext, setReportContext] = useState<ReportContext | null>(null);
  const [isRequestSubjectOpen, setIsRequestSubjectOpen] = useState<boolean>(false);
  const [isAdminReviewOpen, setIsAdminReviewOpen] = useState<boolean>(() => {
    return typeof window !== "undefined" && window.location.hash.toLowerCase() === "#admin";
  });
  const adminTapRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });

  // مقياس وحجم الخط العام
  const [fontScale, setFontScale] = useState<number>(() => {
    return parseInt(localStorage.getItem("unified_font_scale") || "100", 10) || 100;
  });

  const handleChangeFontScale = (scale: number) => {
    setFontScale(scale);
    localStorage.setItem("unified_font_scale", String(scale));
    document.documentElement.style.fontSize = `${scale}%`;
  };

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
  }, [fontScale]);

  // إعدادات اللغة وعرض السلايدات
  const [languageMode, setLanguageMode] = useState<"smart" | "en" | "ar" | "both">(() => {
    return (localStorage.getItem("unified_lang") as "smart" | "en" | "ar" | "both") || "smart";
  });
  const [autoTranslateSlides, setAutoTranslateSlides] = useState<boolean>(() => {
    const saved = localStorage.getItem("unified_auto_ar");
    return saved !== null ? saved === "true" : true;
  });
  const [autoExplainSlides, setAutoExplainSlides] = useState<boolean>(() => {
    const saved = localStorage.getItem("unified_auto_ex");
    return saved !== null ? saved === "true" : true;
  });

  // إعدادات اللخبطة العشوائية (سيد عشوائي مستقل لكل من الخيارات والأسئلة يتجدد مع كل تحميل للصفحة)
  const [shuffleChoices, setShuffleChoices] = useState<boolean>(() => {
    return localStorage.getItem("unified_shuffle_choices") === "true";
  });
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(() => {
    return localStorage.getItem("unified_shuffle_questions") === "true";
  });
  const [choicesSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000_000) + 1);
  const [questionsSeed] = useState<number>(() => Math.floor(Math.random() * 1_000_000_000) + 1);
  const [syncTwins, setSyncTwins] = useState<boolean>(() => {
    return localStorage.getItem("unified_sync_twins") === "true";
  });

  // إدارة وتثبيت تطبيق الويب التقدمي (PWA)
  const {
    isInstalled: isPwaInstalled,
    isIos,
    isDesktop,
    hasNativePrompt,
    showFirstOpenBanner,
    showGuideModal,
    promptInstall: promptPwaInstall,
    openGuideModal,
    closeGuideModal,
    dismissBanner: dismissPwaBanner
  } = usePwaInstall();
  const [showBookmarks, setShowBookmarks] = useState<boolean>(() => {
    return localStorage.getItem("unified_show_bookmarks") !== "false";
  });
  const [bmLabels, setBmLabels] = useState<BookmarkLabels>(() => {
    const saved = localStorage.getItem("unified_bm_labels");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { red: "أحمر", yellow: "أصفر", green: "أخضر", blue: "أزرق" };
  });
  const [expMode, setExpMode] = useState<ExplanationMode>(() => {
    return (localStorage.getItem("unified_exp_mode") as ExplanationMode) || "always";
  });
  const [expPromptSeen, setExpPromptSeen] = useState<boolean>(() => {
    return localStorage.getItem("unified_exp_prompt_seen") === "1";
  });
  const [openSettingsRequest, setOpenSettingsRequest] = useState<{
    group: string;
    highlightId?: string;
    nonce: number;
  } | null>(null);
  const [isBmModalOpen, setIsBmModalOpen] = useState<boolean>(false);

  const handleDismissExpPrompt = useCallback(() => {
    setExpPromptSeen(true);
    localStorage.setItem("unified_exp_prompt_seen", "1");
  }, []);

  const handleOpenExpSettings = useCallback(() => {
    setExpPromptSeen(true);
    localStorage.setItem("unified_exp_prompt_seen", "1");
    setOpenSettingsRequest({ group: "qbank", highlightId: "setGroupExp", nonce: Date.now() });
  }, []);

  // حالة العودة المزدوجة للقفزات التفاعلية
  const [lastViewBeforeJump, setLastViewBeforeJump] = useState<ActiveView | null>(null);
  const [targetStudioId, setTargetStudioId] = useState<string>("automata_simulator");
  const [targetTabId, setTargetTabId] = useState<string>("sim");
  const [focusQuestionId, setFocusQuestionId] = useState<string | null>(() => initialHash.qId || null);
  const [targetPatternRuleId, setTargetPatternRuleId] = useState<string | null>(null);
  const [jumpReturn, setJumpReturn] = useState<{ fromView: ActiveView; scrollY: number; label: string; lectureId?: string } | null>(null);
  const prevSubjectCodeRef = useRef<string>(currentSubjectCode);
  const lastHandledHashRef = useRef<{ hash: string; at: number }>({ hash: "", at: 0 });

  // مزامنة حالة العرض data-view على مستوى الـ Body لإظهار أزرار السلايدات والنماذج في التوبار
  useEffect(() => {
    document.body.setAttribute("data-view", activeView);
  }, [activeView]);

  // تحديث كلاسات الـ Zen على مستوى الـ Body مع الحفاظ على كلاسات الواجهة
  useEffect(() => {
    document.body.classList.remove("zen-focus", "zen-full", "no-side");
    if (zenLevel === 1) {
      document.body.classList.add("zen-focus", "no-side");
    } else if (zenLevel === 2) {
      document.body.classList.add("zen-full", "no-side");
    }
  }, [zenLevel]);

  // مراجعة السلايدات المحفوظة
  const [seenSlides, setSeenSlides] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`unified_seen_${currentSubjectCode}`);
    return new Set(safeJsonParse<string[]>(saved, []));
  });

  useEffect(() => {
    const saved = localStorage.getItem(`unified_seen_${currentSubjectCode}`);
    setSeenSlides(new Set(safeJsonParse<string[]>(saved, [])));
  }, [currentSubjectCode]);

  const handleToggleSeenSlide = (slideRef: string) => {
    setSeenSlides((prev) => {
      const next = new Set(prev);
      if (next.has(slideRef)) next.delete(slideRef);
      else next.add(slideRef);
      localStorage.setItem(`unified_seen_${currentSubjectCode}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // التحكم بأوضاع التكبير والتركيز وفصل الخروج من ملء الشاشة عن التكبير التخطيطي (القاعدة 10)
  const handleZenChange = (newLevel: ZenZoomLevel) => {
    setZenLevel(newLevel);
    if (newLevel === 2) {
      // وضع التكبير: طلب ملء الشاشة البرمجي (F11) كإضافة مع ثبات الوضع التخطيطي حتى لو خرج المستخدم من ملء الشاشة
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else if (newLevel === 0) {
      // الوضع العادي: إنهاء ملء الشاشة إن كان مفعلاً
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // حفظ تفضيلات اللغة والسلايدات
  const handleLanguageChange = (lang: "smart" | "en" | "ar" | "both") => {
    setLanguageMode(lang);
    localStorage.setItem("unified_lang", lang);
  };

  const handleToggleAutoTranslate = () => {
    setAutoTranslateSlides((prev) => {
      const next = !prev;
      localStorage.setItem("unified_auto_ar", String(next));
      return next;
    });
  };

  const handleToggleAutoExplain = () => {
    setAutoExplainSlides((prev) => {
      const next = !prev;
      localStorage.setItem("unified_auto_ex", String(next));
      return next;
    });
  };

  const handleToggleShuffleChoices = () => {
    setShuffleChoices((prev) => {
      const next = !prev;
      localStorage.setItem("unified_shuffle_choices", String(next));
      return next;
    });
  };

  const handleToggleShuffleQuestions = () => {
    setShuffleQuestions((prev) => {
      const next = !prev;
      localStorage.setItem("unified_shuffle_questions", String(next));
      return next;
    });
  };

  const handleToggleSyncTwins = () => {
    setSyncTwins((prev) => {
      const next = !prev;
      localStorage.setItem("unified_sync_twins", String(next));
      return next;
    });
  };

  const handleToggleShowBookmarks = (show: boolean) => {
    setShowBookmarks(show);
    localStorage.setItem("unified_show_bookmarks", String(show));
  };

  const handleSaveBmLabels = (newLabels: BookmarkLabels) => {
    setBmLabels(newLabels);
    localStorage.setItem("unified_bm_labels", JSON.stringify(newLabels));
  };

  const handleChangeExpMode = (mode: ExplanationMode) => {
    setExpMode(mode);
    localStorage.setItem("unified_exp_mode", mode);
  };

  const handleToggleBookmark = useCallback(
    async (qId: string, color: string, twinGroupId?: string) => {
      const updated = await DataService.toggleBookmark(
        currentSubjectCode,
        qId,
        color,
        syncTwins ? twinGroupId : undefined
      );
      setUserProgress({ ...updated });
    },
    [currentSubjectCode, syncTwins]
  );

  const handleResetModelAnswers = useCallback(
    async (modelId: string) => {
      const updated = await DataService.resetModelAnswers(currentSubjectCode, modelId);
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
  );

  const handleResetProgress = useCallback(async () => {
    const fresh = await DataService.resetSubjectProgress(currentSubjectCode);
    setUserProgress({ ...fresh });
    try {
      localStorage.removeItem(`unified_seen_${currentSubjectCode}`);
      localStorage.removeItem(`unified_last_page_${currentSubjectCode}`);
      localStorage.removeItem(`unified_retest_${currentSubjectCode}`);
    } catch {
      // تجاهل في البيئات المقيدة
    }
    setSeenSlides(new Set());
  }, [currentSubjectCode]);

  // تحميل قائمة المقررات
  useEffect(() => {
    DataService.getSubjects()
      .then((res) => {
        setSubjects(res);
      })
      .catch(() => {});
  }, []);

  // التحقق من صلاحية المقرر المحفوظ بعد تحميل قائمة المقررات
  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((s) => s.code === currentSubjectCode)) {
      setCurrentSubjectCode(subjects[0].code);
    }
  }, [subjects, currentSubjectCode]);

  // تحميل حزمة بيانات المقرر
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setTablesLectureFilter("all");
    setActiveLabSession("all");

    if (prevSubjectCodeRef.current !== currentSubjectCode) {
      prevSubjectCodeRef.current = currentSubjectCode;
      setJumpReturn(null);
      setLastViewBeforeJump(null);
      setTargetSlideRef(null);
      setFocusQuestionId(null);
      setTargetPatternRuleId(null);
      try {
        const parsed = parseLocationHash();
        if (parsed.ref || parsed.qId) {
          const cleanHash = buildLocationHash(activeView);
          history.replaceState({ view: activeView, scroll: 0 }, "", cleanHash);
        }
      } catch (_) {}
    }

    Promise.all([
      DataService.loadSubjectBundle(currentSubjectCode, (updatedCount) => {
        if (!isCancelled && updatedCount > 0) {
          DataService.loadSubjectBundle(currentSubjectCode)
            .then((fresh) => {
              if (!isCancelled) {
                setBundle(fresh);
                showToast(`تمت مزامنة ${updatedCount} تحديثات جديدة للمقرر.`);
              }
            })
            .catch(() => {});
        }
      }),
      DataService.getUserProgress(currentSubjectCode)
    ])
      .then(([bundleRes, progressRes]) => {
        if (!isCancelled) {
          setBundle(bundleRes);
          setUserProgress(progressRes);

          if (bundleRes?.lab?.sessions?.[0]?.id) {
            setActiveLabSession(bundleRes.lab.sessions[0].id);
          }

          // التحقق من صحة المحاضرة والنموذج المستعادين
          if (activeLectureId !== "all" && bundleRes?.lectures && !bundleRes.lectures.some((l) => l.id === activeLectureId)) {
            setActiveLectureId("all");
          }
          if (selectedModelId !== "all" && bundleRes?.question_models && !bundleRes.question_models.some((m) => m.id === selectedModelId)) {
            setSelectedModelId("all");
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load subject bundle:", err);
        if (!isCancelled) {
          setLoading(false);
          showToast("تعذر تحميل بيانات المقرر. تحقق من الاتصال أو أعد المحاولة.");
        }
      });

    localStorage.setItem("unified_active_subject", currentSubjectCode);
    return () => {
      isCancelled = true;
    };
  }, [currentSubjectCode]);

  // استعادة موضع التمرير الأولي فور اكتمال تحميل البيانات ورندرة عناصر الصفحة (القاعدة 11)
  const hasRestoredInitialScroll = useRef(false);
  useEffect(() => {
    if (!loading && bundle) {
      if (!hasRestoredInitialScroll.current) {
        hasRestoredInitialScroll.current = true;
        if (targetSlideRef) {
          const resolved = resolveSlideReference(targetSlideRef, activeLectureId, bundle.slides);
          const canonical = resolved ? resolved.ref : targetSlideRef;
          jumpDirectlyToSlide(canonical);
        } else if (focusQuestionId) {
          restoreScrollToElement(`[id="q-${focusQuestionId}"]`, 100);
        } else if (initialScrollTargetRef.current !== null && initialScrollTargetRef.current > 0) {
          restoreScrollPosition(initialScrollTargetRef.current);
        }
      }
    }
  }, [loading, bundle, targetSlideRef, focusQuestionId, activeLectureId]);

  // التتبع الحي لموضع التمرير وحفظه في الجلسة لحظياً (القاعدة 11)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const sy = window.scrollY;
          viewScrollRef.current[`${currentSubjectCode}:${activeView}`] = sy;
          try {
            sessionStorage.setItem(
              `unified_pos_${currentSubjectCode}`,
              JSON.stringify({
                view: activeView,
                lec: activeLectureId,
                model: selectedModelId,
                scrollY: sy
              })
            );
            sessionStorage.setItem(`unified_scroll_${currentSubjectCode}_${activeView}`, String(sy));
          } catch (_) {}
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeView, currentSubjectCode, activeLectureId, selectedModelId]);

  // معالج أزرار الرجوع والتقدم في المتصفح وتغيير الـ Hash
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      const parsed = parseLocationHash();
      lastHandledHashRef.current = { hash: window.location.hash, at: Date.now() };
      setJumpReturn(null);
      const targetView = state?.view || parsed.view || "slides";
      let targetLec = state?.lec || parsed.lec;
      const targetModel = state?.model || parsed.model;
      const targetScroll =
        typeof state?.scroll === "number"
          ? state.scroll
          : (viewScrollRef.current[`${currentSubjectCode}:${targetView}`] || 0);

      if (parsed.ref) {
        const resolved = resolveSlideReference(parsed.ref, targetLec || activeLectureId, bundle?.slides);
        const canonical = resolved ? resolved.ref : parsed.ref;
        if (resolved && resolved.lecture_id) {
          targetLec = resolved.lecture_id;
        }
        setFocusQuestionId(null);
        setTargetPatternRuleId(null);
        setActiveView("slides");
        if (targetLec) setActiveLectureId(targetLec);
        if (targetModel) setSelectedModelId(targetModel);
        setTargetSlideRef(canonical);
        jumpDirectlyToSlide(canonical);
        return;
      }

      setTargetSlideRef(null);
      setTargetPatternRuleId(null);
      setActiveView(targetView);
      if (targetLec) setActiveLectureId(targetLec);
      if (targetModel) setSelectedModelId(targetModel);
      if (parsed.qId) {
        setFocusQuestionId(parsed.qId);
        restoreScrollToElement(`[id="q-${parsed.qId}"]`, 100);
      } else {
        setFocusQuestionId(null);
        restoreScrollPosition(targetScroll);
      }
    };

    const handleHashChange = () => {
      const currentHash = window.location.hash;
      if (currentHash.toLowerCase() === "#admin") {
        setIsAdminReviewOpen(true);
        return;
      }
      const now = Date.now();
      if (
        lastHandledHashRef.current.hash === currentHash &&
        now - lastHandledHashRef.current.at < 350
      ) {
        return;
      }
      lastHandledHashRef.current = { hash: currentHash, at: now };

      const parsed = parseLocationHash();
      if (parsed.ref) {
        const resolved = resolveSlideReference(parsed.ref, activeLectureId, bundle?.slides);
        const canonical = resolved ? resolved.ref : parsed.ref;
        if (resolved && resolved.lecture_id && resolved.lecture_id !== activeLectureId) {
          setActiveLectureId(resolved.lecture_id);
        }
        setFocusQuestionId(null);
        setTargetPatternRuleId(null);
        setActiveView("slides");
        setTargetSlideRef(canonical);
        jumpDirectlyToSlide(canonical);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [bundle?.slides, activeLectureId, currentSubjectCode]);

  // تبديل القسم مع استعادة الموضع السابق لكل قسم وتحديث التاريخ والـ URL Hash بدقة (القاعدة 11)
  const handleSelectView = useCallback((nextView: ActiveView, opts: { keepScroll?: boolean } = {}) => {
    setJumpReturn(null);
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    const currScroll = window.scrollY;
    viewScrollRef.current[`${currentSubjectCode}:${activeView}`] = currScroll;

    try {
      history.replaceState(
        {
          view: activeView,
          lec: activeLectureId,
          model: selectedModelId,
          scroll: currScroll
        },
        ""
      );
    } catch (_) {}

    setActiveView(nextView);

    const targetY = opts.keepScroll ? currScroll : (viewScrollRef.current[`${currentSubjectCode}:${nextView}`] || 0);

    try {
      const hash = buildLocationHash(
        nextView,
        nextView === "slides" ? activeLectureId : undefined,
        nextView === "questions" ? selectedModelId : undefined
      );
      history.pushState(
        {
          view: nextView,
          lec: activeLectureId,
          model: selectedModelId,
          scroll: targetY
        },
        "",
        hash
      );
    } catch (_) {}

    restoreScrollPosition(targetY);
  }, [currentSubjectCode, activeView, activeLectureId, selectedModelId]);

  const handleSelectLecture = useCallback((lecId: string) => {
    setActiveLectureId(lecId);
    setTargetSlideRef((prev) => {
      if (!prev) return null;
      const resolved = resolveSlideReference(prev, lecId, bundle?.slides || []);
      return resolved && resolved.lecture_id === lecId ? prev : null;
    });
    try {
      const hash = buildLocationHash(activeView, lecId, selectedModelId);
      history.replaceState(
        { view: activeView, lec: lecId, model: selectedModelId, scroll: window.scrollY },
        "",
        hash
      );
    } catch (_) {}
  }, [activeView, selectedModelId, bundle?.slides]);

  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    try {
      const hash = buildLocationHash(activeView, activeLectureId, modelId);
      history.replaceState(
        { view: activeView, lec: activeLectureId, model: modelId, scroll: window.scrollY },
        "",
        hash
      );
    } catch (_) {}
  }, [activeView, activeLectureId]);

  // قفزات البحث السريع إلى الجداول والملخص والتعاريف وملخص الملخص والمعجم والأنماط
  const handleJumpToTable = useCallback((tableId: string) => {
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    setTablesLectureFilter("all");
    setActiveView("tables");
    restoreScrollToElement(`#tbl-${tableId}`, 100);
  }, []);

  const handleJumpToSummaryPart = useCallback((partId: string) => {
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    setActiveLectureId("all");
    setActiveView("summary");
    restoreScrollToElement(`#part-${partId}`, 100);
  }, []);

  const handleJumpToDefinition = useCallback((defId: string) => {
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    setActiveView("definitions");
    restoreScrollToElement(`#def-${defId}`, 100);
  }, []);

  const handleJumpToEmergency = useCallback((sectionId?: string) => {
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    setActiveView("emergency");
    if (sectionId) {
      const safeId = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(sectionId) : sectionId;
      restoreScrollToElement(`#${safeId}`, 100);
    } else {
      restoreScrollPosition(0);
    }
  }, []);

  const handleJumpToGlossary = useCallback(() => {
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    setActiveView("glossary");
    restoreScrollPosition(0);
  }, []);

  const handleJumpToPattern = useCallback((ruleId?: string) => {
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(ruleId || null);
    setActiveView("patterns");
    if (!ruleId) {
      restoreScrollPosition(0);
    }
  }, []);

  // تصدير نسخة احتياطية شاملة من التقدم لجميع المواد
  const handleExportProgress = useCallback(async () => {
    try {
      const payload = await DataService.exportAllProgress();
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `study_platform_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تصدير النسخة الاحتياطية لجميع مقرراتك بنجاح.");
    } catch {
      showToast("تعذر تصدير النسخة الاحتياطية.");
    }
  }, [showToast]);

  // استيراد نسخة احتياطية من ملف JSON
  const handleImportProgress = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = safeJsonParse<unknown>(text, null);
        if (!parsed) {
          showToast("ملف النسخة الاحتياطية غير صالح أو تالف.");
          return;
        }
        const {
          importedSubjects,
          activeProgress,
          restoredSeenCount,
          restoredPreferences
        } = await DataService.importProgressBackup(parsed, currentSubjectCode);
        setUserProgress({ ...activeProgress });

        // مزامنة الشرائح المقروءة والتفضيلات المستعادة فوراً في الواجهة
        const savedSeen = localStorage.getItem(`unified_seen_${currentSubjectCode}`);
        setSeenSlides(new Set(safeJsonParse<string[]>(savedSeen, [])));

        if (restoredPreferences.unified_theme) setTheme(restoredPreferences.unified_theme);
        if (restoredPreferences.unified_mode === "light" || restoredPreferences.unified_mode === "dark") {
          setMode(restoredPreferences.unified_mode);
        }
        if (restoredPreferences.unified_font_scale) {
          const fs = parseInt(restoredPreferences.unified_font_scale, 10);
          if (Number.isFinite(fs) && fs >= 75 && fs <= 150) setFontScale(fs);
        }
        if (
          restoredPreferences.unified_lang === "smart" ||
          restoredPreferences.unified_lang === "en" ||
          restoredPreferences.unified_lang === "ar" ||
          restoredPreferences.unified_lang === "both"
        ) {
          setLanguageMode(restoredPreferences.unified_lang);
        }
        if (restoredPreferences.unified_auto_ar !== undefined) {
          setAutoTranslateSlides(restoredPreferences.unified_auto_ar === "true");
        }
        if (restoredPreferences.unified_auto_ex !== undefined) {
          setAutoExplainSlides(restoredPreferences.unified_auto_ex === "true");
        }
        if (restoredPreferences.unified_shuffle_choices !== undefined) {
          setShuffleChoices(restoredPreferences.unified_shuffle_choices === "true");
        }
        if (restoredPreferences.unified_shuffle_questions !== undefined) {
          setShuffleQuestions(restoredPreferences.unified_shuffle_questions === "true");
        }
        if (restoredPreferences.unified_sync_twins !== undefined) {
          setSyncTwins(restoredPreferences.unified_sync_twins === "true");
        }
        if (restoredPreferences.unified_show_bookmarks !== undefined) {
          setShowBookmarks(restoredPreferences.unified_show_bookmarks !== "false");
        }
        if (restoredPreferences.unified_bm_labels) {
          const parsedLabels = safeJsonParse<BookmarkLabels | null>(
            restoredPreferences.unified_bm_labels,
            null
          );
          if (parsedLabels) setBmLabels(parsedLabels);
        }
        if (
          restoredPreferences.unified_exp_mode === "always" ||
          restoredPreferences.unified_exp_mode === "wrong_only" ||
          restoredPreferences.unified_exp_mode === "manual"
        ) {
          setExpMode(restoredPreferences.unified_exp_mode);
        }

        const extras: string[] = [];
        if (restoredSeenCount > 0) extras.push(`${restoredSeenCount} شريحة مقروءة`);
        if (Object.keys(restoredPreferences).length > 0) extras.push("الإعدادات والثيم");
        const extraText = extras.length > 0 ? ` (+ ${extras.join(" و")})` : "";
        showToast(`تم استيراد التقدم بنجاح لـ ${importedSubjects.length} مقرر${extraText}.`);
      } catch {
        showToast("فشل استيراد النسخة الاحتياطية.");
      }
    },
    [currentSubjectCode, showToast]
  );

  // محرك اختصارات لوحة المفاتيح العام المطابق للعارضات الكانونية (Authentic Keyboard Shortcuts Engine)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toUpperCase();
      const isInput = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT" || (document.activeElement as HTMLElement)?.isContentEditable;

      // Escape لإغلاق النوافذ المفتوحة واللايت بوكس والبحث
      if (e.key === "Escape") {
        setIsGlobalSearchOpen(false);
        setIsShortcutsOpen(false);
        setIsOfflineModalOpen(false);
        setIsPortalOpen(false);
        setIsBmModalOpen(false);
        setReportContext(null);
        setIsRequestSubjectOpen(false);
        setIsAdminReviewOpen(false);
        if (showGuideModal) closeGuideModal();
        return;
      }

      // اختصار سري للمشرف: Ctrl+Shift+A لفتح لوحة المراجعة والموافقة
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setIsAdminReviewOpen((prev) => !prev);
        return;
      }

      // منع تسرب الاختصارات العامة عند فتح أي نافذة منبثقة أو لايت بوكس أو لوحة الإعدادات
      const hasOpenOverlay =
        isGlobalSearchOpen ||
        isShortcutsOpen ||
        isOfflineModalOpen ||
        isPortalOpen ||
        isBmModalOpen ||
        Boolean(reportContext) ||
        isRequestSubjectOpen ||
        isAdminReviewOpen ||
        showGuideModal ||
        Boolean(document.querySelector('[role="dialog"], #lightboxModal, #lb.open, #setPanel'));
      if (hasOpenOverlay) return;

      // Ctrl+K أو / للبحث الشامل
      if (((e.ctrlKey || e.metaKey) && (e.code === "KeyK" || e.key.toLowerCase() === "k")) || (e.key === "/" && !isInput)) {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
        return;
      }

      // Ctrl+B (أو Z) للتبديل الدوري لأوضاع العرض والتكبير (0: عادي -> 1: تركيز -> 2: تكبير)
      if (
        ((e.ctrlKey || e.metaKey) && (e.code === "KeyB" || e.key.toLowerCase() === "b")) ||
        (e.key.toLowerCase() === "z" && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey)
      ) {
        if (isInput) return;
        e.preventDefault();
        handleZenChange(((zenLevel + 1) % 3) as ZenZoomLevel);
        return;
      }

      // F11 لطلب ملء الشاشة البرمجي مع وضع التكبير الكامل (القاعدة 10)
      if (e.key === "F11") {
        if (zenLevel === 0) {
          handleZenChange(2);
        }
        return;
      }

      // M لتبديل نمط الإضاءة (ليلي / نهاري)
      if (e.key.toLowerCase() === "m" && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setMode((prev) => (prev === "dark" ? "light" : "dark"));
        return;
      }

      // S لفتح أو إغلاق لوحة الإعدادات
      if (e.key.toLowerCase() === "s" && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const btnSet = document.getElementById("btnSet");
        if (btnSet) btnSet.click();
        return;
      }

      // P لبوابة المقررات الدراسية
      if (e.key.toLowerCase() === "p" && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsPortalOpen((prev) => !prev);
        return;
      }

      // ? لدليل اختصارات لوحة المفاتيح
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // تمرير سلس لثلاثة أرباع الصفحة بالأسهم (ArrowDown / ArrowUp) على الحواسيب
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (window.matchMedia("(hover: hover)").matches) {
          e.preventDefault();
          window.scrollBy({
            top: (e.key === "ArrowDown" ? 1 : -1) * window.innerHeight * 0.75,
            behavior: "smooth"
          });
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zenLevel, isGlobalSearchOpen, isShortcutsOpen, isOfflineModalOpen, isPortalOpen, isBmModalOpen, reportContext, isRequestSubjectOpen, isAdminReviewOpen, showGuideModal, closeGuideModal]);

  // القفز إلى استوديو تفاعلي من الملخص
  const handleJumpToInteractive = useCallback((studioId: string, tabId?: string) => {
    const from = activeView;
    const scroll = window.scrollY;
    setJumpReturn({
      fromView: from,
      scrollY: scroll,
      label: from === "summary" ? "العودة إلى الملخص" : "العودة إلى القسم السابق"
    });
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    setLastViewBeforeJump(from);
    setTargetStudioId(studioId);
    setTargetTabId(tabId || "sim");
    setActiveView("interactive");
    restoreScrollPosition(0);
  }, [activeView]);

  // العودة من الاستوديو إلى نفس موضع القراءة قبل القفز
  const handleReturnFromInteractive = useCallback(() => {
    if (!lastViewBeforeJump) return;
    const targetY =
      jumpReturn && jumpReturn.fromView === lastViewBeforeJump ? jumpReturn.scrollY : 0;
    setTargetSlideRef(null);
    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    setActiveView(lastViewBeforeJump);
    setLastViewBeforeJump(null);
    setJumpReturn(null);
    restoreScrollPosition(targetY);
  }, [lastViewBeforeJump, jumpReturn]);

  // القفز إلى شريحة معينة
  const handleJumpToSlide = useCallback((ref: string) => {
    if ((bundle?.slides?.length || 0) === 0) return;
    const from = activeView;
    const scroll = window.scrollY;
    let label = "العودة إلى القسم السابق";
    if (from === "summary") label = "العودة إلى الملخص";
    else if (from === "emergency") label = "العودة إلى ملخص الطوارئ";
    else if (from === "tables") label = "العودة إلى الجداول";
    else if (from === "questions") label = "العودة إلى بنك الأسئلة";
    else if (from === "definitions") label = "العودة إلى بنك التعاريف";
    else if (from === "patterns") label = "العودة إلى مختبر الأنماط";
    else if (from === "lab") label = "العودة إلى الملحق العملي";

    setJumpReturn({ fromView: from, scrollY: scroll, label, lectureId: activeLectureId });

    // 1. حل وتطبيع مرجع السلايد والمحاضرة التابعة له (يدعم صيغ s15, S15, L1-S015, L1-S15)
    const resolved = resolveSlideReference(ref, activeLectureId, bundle?.slides || []);
    const canonicalRef = resolved ? resolved.ref : ref;
    const targetLecture = resolved ? resolved.lecture_id : undefined;

    // 2. مزامنة المحاضرة فوراً قبل التبديل إذا كانت الشريحة تتبع محاضرة أخرى
    if (targetLecture && targetLecture !== activeLectureId) {
      setActiveLectureId(targetLecture);
    }

    // 3. تصفير موضع التمرير السابق للشرائح لعدم استرجاع الموضع القديم الميت
    viewScrollRef.current[`${currentSubjectCode}:slides`] = 0;

    setFocusQuestionId(null);
    setTargetPatternRuleId(null);
    setTargetSlideRef(canonicalRef);
    setActiveView("slides");

    try {
      history.pushState(
        { view: "slides", ref: canonicalRef, lec: targetLecture || activeLectureId, scroll: 0 },
        "",
        `#${canonicalRef}`
      );
    } catch (_) {}

    // 4. قنص فوري مباشر متمركز على صورة الشريحة بدون أي ترانزيشن تدريجي من أعلى الصفحة
    jumpDirectlyToSlide(canonicalRef);
  }, [currentSubjectCode, activeView, bundle?.slides, activeLectureId]);

  // القفز إلى سؤال في بنك الأسئلة من المستكشف
  const handleJumpToQuestion = useCallback((questionId: string) => {
    const from = activeView;
    const scroll = window.scrollY;
    setJumpReturn({
      fromView: from,
      scrollY: scroll,
      label:
        from === "patterns"
          ? "العودة إلى مختبر الأنماط"
          : from === "questions"
            ? "العودة إلى البنك"
            : "العودة إلى المستكشف"
    });
    setTargetSlideRef(null);
    setTargetPatternRuleId(null);
    setFocusQuestionId(questionId);
    setActiveView("questions");
    try {
      history.pushState(
        { view: "questions", qId: questionId, scroll: window.scrollY },
        "",
        `#q-${questionId}`
      );
    } catch (_) {}
    restoreScrollToElement(`[id="q-${questionId}"]`, 100);
  }, [activeView]);

  // حفظ الإجابة (مع مزامنة التوائم اختيارياً عند تفعيلها من الإعدادات)
  const handleAnswerQuestion = useCallback(
    async (qId: string, ansIdx: number, isOk: boolean, twinGroupId?: string) => {
      const updated = await DataService.saveAnswer(
        currentSubjectCode,
        qId,
        ansIdx,
        isOk,
        syncTwins ? twinGroupId : undefined
      );
      setUserProgress({ ...updated });
    },
    [currentSubjectCode, syncTwins]
  );

  // تبديل حفظ جدول في المفضلة
  const handleToggleMemorizeTable = useCallback(
    async (tableId: string) => {
      const updated = await DataService.toggleMemorizedTable(currentSubjectCode, tableId);
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
  );

  // إتقان تعريف مصطلح
  const handleToggleMasteredDefinition = useCallback(
    async (definitionId: string) => {
      const updated = await DataService.toggleMasteredDefinition(currentSubjectCode, definitionId);
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
  );

  // تعليم قسم من ملخص الملخص كمراجَع
  const handleToggleReviewedSection = useCallback(
    async (sectionId: string) => {
      const updated = await DataService.toggleReviewedSection(currentSubjectCode, sectionId);
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
  );

  // تعليم جزء من الملخص النظري كمقروء
  const handleToggleReviewedPart = useCallback(
    async (partId: string) => {
      const updated = await DataService.toggleReviewedPart(currentSubjectCode, partId);
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
  );

  // تسجيل نتيجة امتحان
  const handleRecordExamResult = useCallback(
    async (result: { total: number; score: number; timeSpentSec: number; mode: string }) => {
      const updated = await DataService.recordExamResult(currentSubjectCode, result);
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
  );

  // القفز لموضع البلاغ من لوحة المشرف السرية
  const handleJumpToReportedItem = useCallback(
    (subjectCode: string, viewType: string, itemRef?: string) => {
      if (subjectCode && subjectCode !== currentSubjectCode) {
        setCurrentSubjectCode(subjectCode);
      }
      if (viewType === "slides" && itemRef) {
        setActiveLectureId("all");
        setActiveView("slides");
        setTargetSlideRef(itemRef);
        jumpDirectlyToSlide(itemRef);
      } else if (viewType === "questions" && itemRef) {
        setSelectedModelId("all");
        setFocusQuestionId(itemRef);
        setActiveView("questions");
      } else if (
        ["slides", "summary", "emergency", "tables", "questions", "explorer", "exam", "definitions", "glossary", "patterns", "lab", "interactive"].includes(viewType)
      ) {
        setActiveView(viewType as ActiveView);
      }
    },
    [currentSubjectCode]
  );

  // فتح لوحة المشرف السرية عبر 5 نقرات متتالية على اسم المطوّر في التذييل
  const handleOwnerCreditTap = useCallback(() => {
    const now = Date.now();
    if (now - adminTapRef.current.lastAt > 2000) {
      adminTapRef.current = { count: 1, lastAt: now };
    } else {
      adminTapRef.current = { count: adminTapRef.current.count + 1, lastAt: now };
    }
    if (adminTapRef.current.count >= 5) {
      adminTapRef.current = { count: 0, lastAt: 0 };
      setIsAdminReviewOpen(true);
    }
  }, []);

  const currentSubjectMeta =
    bundle?.meta ||
    subjects.find((s) => s.code === currentSubjectCode) || {
      code: currentSubjectCode,
      name_ar: currentSubjectCode.toUpperCase(),
      name_en: currentSubjectCode.toUpperCase(),
      term: 1,
      professor_name: "",
      accent_color: "#f5b13d"
    };

  const isArabicOnly = Boolean(currentSubjectMeta.arabic_only);
  const effectiveLanguageMode = isArabicOnly ? "ar" : languageMode;
  const hasQuestions = (bundle?.questions?.length || 0) > 0;
  const summaryTitle = bundle?.summary?.title_ar || "";
  const emergencyTitle = bundle?.emergency?.title_ar || "";
  const availableViews = useMemo<Record<ActiveView, boolean>>(() => {
    const isPlaceholder = (title: string) =>
      !title || title.includes("{المادة}") || title.includes("التجريبي");
    return {
      dashboard: false,
      slides: (bundle?.slides?.length || 0) > 0,
      summary: (bundle?.summary?.parts?.length || 0) > 0 && !isPlaceholder(summaryTitle),
      emergency: (bundle?.emergency?.sections?.length || 0) > 0 && !isPlaceholder(emergencyTitle),
      tables: (bundle?.tables?.length || 0) > 0,
      questions: hasQuestions,
      explorer: hasQuestions,
      exam: hasQuestions,
      interactive: ["toc", "rm", "sec", "se", "pm", "phy"].includes(currentSubjectCode),
      definitions: Boolean(bundle?.definitions?.items?.length),
      glossary: Boolean(bundle?.glossary) && !isArabicOnly,
      patterns: Boolean(bundle?.patterns?.rules?.length),
      lab: Boolean(bundle?.lab?.slides?.length)
    };
  }, [bundle, summaryTitle, emergencyTitle, hasQuestions, currentSubjectCode, isArabicOnly]);

  useEffect(() => {
    if (!bundle) return;
    if (availableViews[activeView]) return;
    const order: ActiveView[] = [
      "questions",
      "summary",
      "emergency",
      "tables",
      "slides",
      "definitions",
      "glossary",
      "patterns",
      "interactive",
      "lab",
      "explorer",
      "exam"
    ];
    const next = order.find((view) => availableViews[view]);
    if (next) {
      setActiveView(next);
      try {
        const hash = buildLocationHash(
          next,
          next === "slides" ? activeLectureId : undefined,
          next === "questions" ? selectedModelId : undefined
        );
        history.replaceState(
          { view: next, lec: activeLectureId, model: selectedModelId, scroll: 0 },
          "",
          hash
        );
      } catch (_) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, currentSubjectCode]);

  const hasAnyAvailableView = Object.values(availableViews).some(Boolean);
  const totalQuestionsCount = bundle?.questions?.length || 0;
  const answeredQuestionsCount = Object.values(userProgress?.answered_questions || {}).filter(
    (a) => Boolean(a && typeof a.selected_answer === "number" && a.selected_answer >= 0)
  ).length;
  const progressPct =
    totalQuestionsCount > 0
      ? Math.min(100, Math.max(0, (answeredQuestionsCount / totalQuestionsCount) * 100))
      : 0;

  return (
    <div className="app-shell">
      {/* التوبار الحركي الممتد المطابق للقالب الأصلي */}
      <UnifiedAppHeader
        currentSubject={currentSubjectMeta}
        activeView={activeView}
        onSelectView={handleSelectView}
        onOpenPortal={() => setIsPortalOpen(true)}
        zenLevel={zenLevel}
        onZenChange={handleZenChange}
        languageMode={effectiveLanguageMode}
        onLanguageChange={handleLanguageChange}
        autoTranslateSlides={!isArabicOnly && autoTranslateSlides}
        onToggleAutoTranslate={handleToggleAutoTranslate}
        autoExplainSlides={autoExplainSlides}
        onToggleAutoExplain={handleToggleAutoExplain}
        availableViews={availableViews}
        shuffleChoices={shuffleChoices}
        onToggleShuffleChoices={handleToggleShuffleChoices}
        shuffleQuestions={shuffleQuestions}
        onToggleShuffleQuestions={handleToggleShuffleQuestions}
        syncTwins={syncTwins}
        onToggleSyncTwins={handleToggleSyncTwins}
        mode={mode}
        onChangeMode={setMode}
        theme={theme}
        onChangeTheme={setTheme}
        isPwaInstalled={isPwaInstalled}
        onPromptPwaInstall={promptPwaInstall}
        isIos={isIos}
        isDesktop={isDesktop}
        showBookmarks={showBookmarks}
        onToggleShowBookmarks={handleToggleShowBookmarks}
        onOpenBmLabelModal={() => setIsBmModalOpen(true)}
        expMode={expMode}
        onChangeExpMode={handleChangeExpMode}
        progressPct={progressPct}
        onResetProgress={handleResetProgress}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
        fontScale={fontScale}
        onChangeFontScale={handleChangeFontScale}
        onExportProgress={handleExportProgress}
        onImportProgress={handleImportProgress}
        openSettingsRequest={openSettingsRequest}
      />

      {/* التخطيط الكانوني الأصيل (.layout) */}
      <div className="layout">
        {/* السايدبار المكتبي (.side) */}
        <CompanionNavigation
          activeView={activeView}
          onSelectView={handleSelectView}
          lectures={bundle?.lectures || []}
          activeLectureId={activeView === "tables" ? tablesLectureFilter : activeLectureId}
          onSelectLecture={activeView === "tables" ? setTablesLectureFilter : handleSelectLecture}
          models={bundle?.question_models || []}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModel}
          availableViews={availableViews}
          summaryParts={bundle?.summary?.parts || []}
          emergencySections={bundle?.emergency?.sections || []}
          patternRules={bundle?.patterns?.rules || []}
          labSessions={bundle?.lab?.sessions || []}
          activeLabSession={activeLabSession}
          onSelectLabSession={setActiveLabSession}
          pageLayout={currentSubjectMeta.page_layout}
          tables={bundle?.tables || []}
          reviewedParts={userProgress?.reviewed_parts || []}
          reviewedSections={userProgress?.reviewed_sections || []}
          answeredQuestions={userProgress?.answered_questions || {}}
          questions={bundle?.questions || []}
          counts={{
            lectures: bundle?.lectures?.length || 0,
            tables: bundle?.tables?.length || 0,
            questions: bundle?.questions?.length || 0
          }}
        />

        {/* المتن الرئيسي (.main) */}
        <main className="main" id="mainContent">
          {!isOnline && (
            <div className="usp-offline-pill" role="status" aria-live="polite">
              <Icons.WifiOff size={15} />
              <span>أنت تتصفح حالياً دون اتصال بالإنترنت — يتم التحميل من الكاش المحلي السريع.</span>
            </div>
          )}

          {loading ? (
            <div className="pending-box" style={{ margin: "40px auto", maxWidth: 600 }}>
              <div className="pb-ic">
                <svg className="svg-ic usp-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
              <div className="pb-t">جارٍ تجهيز بيانات وتحديثات المقرر...</div>
              <div className="pb-s">المزامنة التلقائية مع السحابة والكاش المحلي السريع</div>
            </div>
          ) : !hasAnyAvailableView ? (
            <div className="pending-box" style={{ margin: "40px auto", maxWidth: 600 }}>
              <div className="pb-ic"><Icons.BookOpen size={34} /></div>
              <div className="pb-t">مقرر «{currentSubjectMeta.name_ar}» جاهز لإضافة المحتوى</div>
              <div className="pb-s">
                لم يتم ربط حزمة بيانات (bundle.json) لهذا المقرر بعد. يمكنك اختيار مقرر آخر من بوابة المقررات أو إضافة ملفات المادة لاحقاً.
              </div>
              <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setIsPortalOpen(true)}>
                فتح بوابة المقررات
              </button>
            </div>
          ) : (
            <ErrorBoundary resetKey={`${currentSubjectCode}-${activeView}`}>
              <Suspense
                fallback={
                  <div className="pending-box" style={{ margin: "40px auto", maxWidth: 520 }}>
                    <div className="pb-t">جارٍ تحميل القسم...</div>
                  </div>
                }
              >
                {activeView === "slides" && (
                  <SlidesViewer
                    key={currentSubjectCode}
                    subjectCode={currentSubjectCode}
                    pageLayout={currentSubjectMeta.page_layout}
                    lectures={bundle?.lectures || []}
                    slides={bundle?.slides || []}
                    targetSlideRef={targetSlideRef}
                    onTargetSlideHandled={() => setTargetSlideRef(null)}
                    activeLectureId={activeLectureId}
                    onSelectLecture={handleSelectLecture}
                    autoTranslate={!isArabicOnly && autoTranslateSlides}
                    autoExplain={autoExplainSlides}
                    onToggleAutoTranslate={handleToggleAutoTranslate}
                    onToggleAutoExplain={handleToggleAutoExplain}
                    seenSlides={seenSlides}
                    onToggleSeenSlide={handleToggleSeenSlide}
                    arabicOnly={isArabicOnly}
                    onReportSlide={(slide) =>
                      setReportContext({
                        subjectCode: currentSubjectMeta.code,
                        subjectName: currentSubjectMeta.name_ar,
                        viewType: "slides",
                        itemRef: slide.ref,
                        itemLabel: slide.title || slide.ref,
                        defaultIssueType: "translation"
                      })
                    }
                  />
                )}

                {activeView === "summary" && (
                  <TheoreticalSummaryView
                    key={currentSubjectCode}
                    data={bundle?.summary}
                    reviewedParts={userProgress?.reviewed_parts || []}
                    onToggleReviewed={handleToggleReviewedPart}
                    activeLectureId={activeLectureId}
                    onSelectLecture={handleSelectLecture}
                    onJumpToInteractive={handleJumpToInteractive}
                    onJumpToSlide={handleJumpToSlide}
                  />
                )}

                {activeView === "emergency" && (
                  <SummaryOfSummaryView
                    key={currentSubjectCode}
                    data={bundle?.emergency}
                    reviewedSections={userProgress?.reviewed_sections || []}
                    onToggleReviewed={handleToggleReviewedSection}
                    onJumpToSlide={handleJumpToSlide}
                  />
                )}

                {activeView === "tables" && (
                  <ExplanatoryTablesView
                    key={currentSubjectCode}
                    tables={bundle?.tables || []}
                    memorizedTableIds={userProgress?.memorized_tables || []}
                    onToggleMemorize={handleToggleMemorizeTable}
                    onJumpToSlide={handleJumpToSlide}
                    activeLectureId={tablesLectureFilter}
                    onSelectLecture={setTablesLectureFilter}
                  />
                )}

                {activeView === "questions" && (
                  <UnifiedQuestionBankView
                    key={currentSubjectCode}
                    subjectCode={currentSubjectCode}
                    questions={bundle?.questions || []}
                    models={bundle?.question_models || []}
                    lectures={bundle?.lectures || []}
                    selectedModelId={selectedModelId}
                    onSelectModel={handleSelectModel}
                    userProgress={userProgress || { subject_code: currentSubjectCode, memorized_tables: [], answered_questions: {}, bookmarks: {}, exam_history: [], updated_at: "" }}
                    onAnswerQuestion={handleAnswerQuestion}
                    onJumpToSlide={handleJumpToSlide}
                    onJumpToQuestion={handleJumpToQuestion}
                    focusQuestionId={focusQuestionId}
                    onFocusQuestionHandled={() => setFocusQuestionId(null)}
                    languageMode={effectiveLanguageMode}
                    onLanguageChange={handleLanguageChange}
                    arabicOnly={isArabicOnly}
                    showBookmarks={showBookmarks}
                    bmLabels={bmLabels}
                    onToggleBookmark={handleToggleBookmark}
                    onOpenBmLabelModal={() => setIsBmModalOpen(true)}
                    expMode={expMode}
                    onChangeExpMode={handleChangeExpMode}
                    expPromptSeen={expPromptSeen}
                    onDismissExpPrompt={handleDismissExpPrompt}
                    onOpenExpSettings={handleOpenExpSettings}
                    onReportQuestion={(q) =>
                      setReportContext({
                        subjectCode: currentSubjectMeta.code,
                        subjectName: currentSubjectMeta.name_ar,
                        viewType: "questions",
                        itemRef: q.id,
                        itemLabel: `س${q.orig_q_num || ""}${q.slide_ref ? ` · ${q.slide_ref}` : ""}`,
                        defaultIssueType: "answer"
                      })
                    }
                    shuffleChoices={shuffleChoices}
                    shuffleQuestions={shuffleQuestions}
                    choicesSeed={choicesSeed}
                    questionsSeed={questionsSeed}
                    syncTwins={syncTwins}
                    onResetModelAnswers={handleResetModelAnswers}
                  />
                )}

                {activeView === "explorer" && (
                  <QuestionBankExplorer
                    key={currentSubjectCode}
                    questions={bundle?.questions || []}
                    onJumpToQuestion={handleJumpToQuestion}
                    arabicOnly={isArabicOnly}
                  />
                )}

                {activeView === "exam" && (
                  <ExamSimulator
                    key={currentSubjectCode}
                    questions={bundle?.questions || []}
                    slides={bundle?.slides || []}
                    models={bundle?.question_models || []}
                    lectures={bundle?.lectures || []}
                    examHistory={userProgress?.exam_history || []}
                    onRecordResult={handleRecordExamResult}
                    onJumpToSlide={handleJumpToSlide}
                    languageMode={effectiveLanguageMode}
                    arabicOnly={isArabicOnly}
                    pageLayout={currentSubjectMeta.page_layout}
                    shuffleChoices={shuffleChoices}
                    expMode={expMode}
                    expPromptSeen={expPromptSeen}
                    onDismissExpPrompt={handleDismissExpPrompt}
                    onOpenExpSettings={handleOpenExpSettings}
                  />
                )}

                {activeView === "definitions" && (
                  <DefinitionsView
                    key={currentSubjectCode}
                    data={bundle?.definitions}
                    masteredIds={userProgress?.mastered_definitions || []}
                    onToggleMastered={handleToggleMasteredDefinition}
                    onJumpToSlide={handleJumpToSlide}
                    arabicOnly={isArabicOnly}
                  />
                )}

                {activeView === "glossary" && (
                  <GlossaryView
                    key={currentSubjectCode}
                    data={bundle?.glossary}
                    subjectName={currentSubjectMeta.name_ar}
                  />
                )}

                {activeView === "patterns" && (
                  <PatternsLabView
                    key={currentSubjectCode}
                    data={bundle?.patterns}
                    subjectCode={currentSubjectCode}
                    onJumpToQuestion={handleJumpToQuestion}
                    targetRuleId={targetPatternRuleId}
                    onTargetRuleHandled={() => setTargetPatternRuleId(null)}
                  />
                )}

                {activeView === "lab" && (
                  <LabAppendixView
                    key={currentSubjectCode}
                    data={bundle?.lab}
                    subjectName={currentSubjectMeta.name_ar}
                    activeSession={activeLabSession}
                    onSelectSession={setActiveLabSession}
                  />
                )}

                {activeView === "interactive" &&
                  (["sec", "se", "pm", "phy"].includes(currentSubjectCode) ? (
                    <ConceptStudios
                      key={currentSubjectCode}
                      subjectCode={currentSubjectCode}
                      initialStudioId={targetStudioId}
                      initialTabId={targetTabId}
                      onReturnToSummary={lastViewBeforeJump ? handleReturnFromInteractive : undefined}
                      onJumpToSlide={handleJumpToSlide}
                    />
                  ) : (
                    <InteractiveStudioHost
                      key={currentSubjectCode}
                      subjectCode={currentSubjectCode}
                      initialStudioId={targetStudioId}
                      initialTabId={targetTabId}
                      onReturnToSummary={lastViewBeforeJump ? handleReturnFromInteractive : undefined}
                    />
                  ))}
              </Suspense>
            </ErrorBoundary>
          )}

          {/* التذييل المعتمد (.footer) مع أزرار الإبلاغ وطلب إضافة مادة بشكل هادئ ومرتب */}
          <footer className="footer">
            <div className="footer-credit">
              <span>Study Viewer · المنصة الأكاديمية الموحدة</span>
              <span>—</span>
              <span onClick={handleOwnerCreditTap} style={{ cursor: "default" }}>
                إعداد وتطوير: <b>عبدالرحمن المخلافي</b>
              </span>
            </div>
            <div className="footer-actions">
              <button
                type="button"
                className="footer-action-btn is-report"
                onClick={() =>
                  setReportContext({
                    subjectCode: currentSubjectMeta.code,
                    subjectName: currentSubjectMeta.name_ar,
                    viewType: activeView,
                    itemRef: activeLectureId !== "all" ? activeLectureId : "",
                    itemLabel: "",
                    defaultIssueType: activeView === "questions" ? "answer" : "explanation"
                  })
                }
              >
                <Icons.Flag size={13} />
                <span>الإبلاغ عن خطأ في الصفحة</span>
              </button>
              <button
                type="button"
                className="footer-action-btn"
                onClick={() => setIsRequestSubjectOpen(true)}
              >
                <Icons.Plus size={13} />
                <span>طلب إضافة مادة أو محتوى (تيليجرام)</span>
              </button>
            </div>
          </footer>
        </main>
      </div>

      {/* إشعارات التحديث والتنبيهات المؤقتة */}
      {(swUpdateReady || toastMessage) && (
        <div className="usp-toast-stack" role="status" aria-live="polite">
          {swUpdateReady && (
            <div className="usp-toast is-update">
              <span>يتوفر تحديث جديد للمنصة ببيانات وتحسينات أحدث.</span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => window.location.reload()}
              >
                تحديث الآن
              </button>
              <button
                type="button"
                className="btn btn-icon btn-sm"
                onClick={() => setSwUpdateReady(false)}
                aria-label="إغلاق الإشعار"
              >
                <Icons.Cross size={14} />
              </button>
            </div>
          )}
          {toastMessage && (
            <div className="usp-toast">
              <span>{toastMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* زر الرجوع العائم الأصيل (#jumpReturnBar) */}
      {jumpReturn && (
        <button
          type="button"
          id="jumpReturnBar"
          onClick={() => {
            const { fromView, scrollY, lectureId } = jumpReturn;
            setJumpReturn(null);
            setTargetSlideRef(null);
            setFocusQuestionId(null);
            setTargetPatternRuleId(null);
            if (lectureId !== undefined) setActiveLectureId(lectureId);
            setActiveView(fromView);
            restoreScrollPosition(scrollY);
          }}
          title="الرجوع إلى الموضع السابق قبل الانتقال"
        >
          <svg className="svg-ic" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span>{jumpReturn.label}</span>
        </button>
      )}

      {/* نافذة تخصيص تسميات ألوان العلامات */}
      <BookmarkLabelModal
        isOpen={isBmModalOpen}
        onClose={() => setIsBmModalOpen(false)}
        labels={bmLabels}
        onSave={handleSaveBmLabels}
      />

      {/* باحث ومستكشف المحتوى الشامل في كافة الأقسام (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        bundle={bundle}
        onJumpToSlide={handleJumpToSlide}
        onJumpToQuestion={handleJumpToQuestion}
        onJumpToTable={handleJumpToTable}
        onJumpToSummaryPart={handleJumpToSummaryPart}
        onJumpToDefinition={handleJumpToDefinition}
        onJumpToEmergency={handleJumpToEmergency}
        onJumpToGlossary={handleJumpToGlossary}
        onJumpToPattern={handleJumpToPattern}
      />

      {/* نافذة دليل اختصارات لوحة المفاتيح والتحكم السريع */}
      <ShortcutsCheatsheetModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* مدير ومحمل الحزمة الأوفلاين المقاوم للشبكات */}
      <OfflineManagerModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        currentSubjectCode={currentSubjectCode}
        bundle={bundle}
      />

      {/* بوابة اختيار المقررات والفصول الدراسية */}
      <PortalModal
        isOpen={isPortalOpen}
        onClose={() => setIsPortalOpen(false)}
        subjects={subjects}
        currentSubjectCode={currentSubjectCode}
        onSelectSubject={(code) => setCurrentSubjectCode(code)}
        onRequestSubject={() => setIsRequestSubjectOpen(true)}
      />

      {/* نافذة الإبلاغ عن خطأ في الترجمة أو الشرح أو الأسئلة */}
      <ReportIssueModal
        isOpen={Boolean(reportContext)}
        onClose={() => setReportContext(null)}
        context={reportContext}
        onSuccessToast={showToast}
      />

      {/* نافذة طلب إضافة مادة جديدة أو محتوى عبر رابط تيليجرام */}
      <RequestSubjectModal
        isOpen={isRequestSubjectOpen}
        onClose={() => setIsRequestSubjectOpen(false)}
        subjects={subjects}
        currentSubjectCode={currentSubjectCode}
        onSuccessToast={showToast}
      />

      {/* لوحة المراجعة والموافقة السرية للمشرف (تُحمّل عند الطلب فقط) */}
      {isAdminReviewOpen && (
        <Suspense fallback={null}>
          <AdminReviewModal
            isOpen={isAdminReviewOpen}
            onClose={() => {
              setIsAdminReviewOpen(false);
              if (window.location.hash.toLowerCase() === "#admin") {
                try {
                  history.replaceState(null, "", window.location.pathname);
                } catch {}
              }
            }}
            onJumpToReportedItem={handleJumpToReportedItem}
          />
        </Suspense>
      )}

      {/* بانر تثبيت تطبيق المنصة (PWA) عند أول فتح */}
      <PwaInstallBanner
        isOpen={showFirstOpenBanner}
        onInstall={promptPwaInstall}
        onDismiss={dismissPwaBanner}
        onOpenGuide={openGuideModal}
        isIos={isIos}
        isDesktop={isDesktop}
      />

      {/* نافذة دليل تثبيت تطبيق المنصة (PWA) للابتوب والجوال */}
      <PwaInstallGuideModal
        isOpen={showGuideModal}
        onClose={closeGuideModal}
        isDesktop={isDesktop}
        isIos={isIos}
        hasNativePrompt={hasNativePrompt}
        onPromptNative={promptPwaInstall}
      />
    </div>
  );
};



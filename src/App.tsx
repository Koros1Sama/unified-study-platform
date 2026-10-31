// ==============================================================================
// المنصة التعليمية الموحدة — المنسق العام (Authentic Unified Study App)
// Exact authentic layout & master CSS architecture from RM_Viewer & TOC_Slides_Viewer
// Zero Emojis Standard · High-Performance React 19 + TypeScript
// ==============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DataService, type SubjectBundle } from "./lib/dataService";
import {
  restoreScrollPosition,
  restoreScrollToElement,
  parseLocationHash,
  buildLocationHash,
  resolveSlideReference,
  jumpDirectlyToSlide
} from "./lib/scrollRestoration";
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
import { SlidesViewer } from "./components/slides/SlidesViewer";
import { TheoreticalSummaryView } from "./components/summary/TheoreticalSummaryView";
import { SummaryOfSummaryView } from "./components/emergency/SummaryOfSummaryView";
import { ExplanatoryTablesView } from "./components/tables/ExplanatoryTablesView";
import { UnifiedQuestionBankView } from "./components/questions/UnifiedQuestionBankView";
import { QuestionBankExplorer } from "./components/questions/QuestionBankExplorer";
import { ExamSimulator } from "./components/questions/ExamSimulator";
import { InteractiveStudioHost } from "./components/interactive/InteractiveStudioHost";
import { ConceptStudios } from "./components/interactive/ConceptStudios";
import { DefinitionsView } from "./components/definitions/DefinitionsView";
import { GlossaryView } from "./components/glossary/GlossaryView";
import { PatternsLabView } from "./components/patterns/PatternsLabView";
import { LabAppendixView } from "./components/lab/LabAppendixView";
import type {
  SubjectMeta,
  ActiveView,
  ZenZoomLevel,
  UserStudyProgress,
  ExplanationMode,
  BookmarkLabels
} from "./types";

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

  // النوافذ المساعدة المتقدمة
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);

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

  // إعدادات اللخبطة العشوائية والعلامات الملونة والشرح
  const [shuffleChoices, setShuffleChoices] = useState<boolean>(() => {
    return localStorage.getItem("unified_shuffle_choices") === "true";
  });
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(() => {
    return localStorage.getItem("unified_shuffle_questions") === "true";
  });
  // توليد بذرة عشوائية جديدة تلقائياً مع كل إعادة تشغيل للصفحة لتحقيق الخلط المتجدد
  const [shuffleSeed, setShuffleSeed] = useState<number>(() => {
    return Math.floor(Math.random() * 1000000) + 1;
  });

  const handleReshuffle = useCallback(() => {
    setShuffleSeed(Math.floor(Math.random() * 1000000) + 1);
  }, []);

  // إدارة وتثبيت تطبيق الويب التقدمي (PWA)
  const {
    canInstall: canInstallPwa,
    isInstalled: isPwaInstalled,
    isIos,
    isDesktop,
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
  const [isBmModalOpen, setIsBmModalOpen] = useState<boolean>(false);

  // حالة العودة المزدوجة للقفزات التفاعلية
  const [lastViewBeforeJump, setLastViewBeforeJump] = useState<ActiveView | null>(null);
  const [targetStudioId, setTargetStudioId] = useState<string>("automata_simulator");
  const [targetTabId, setTargetTabId] = useState<string>("sim");
  const [focusQuestionId, setFocusQuestionId] = useState<string | null>(() => initialHash.qId || null);
  const [jumpReturn, setJumpReturn] = useState<{ fromView: ActiveView; scrollY: number; label: string; lectureId?: string } | null>(null);

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
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    const saved = localStorage.getItem(`unified_seen_${currentSubjectCode}`);
    setSeenSlides(saved ? new Set(JSON.parse(saved)) : new Set());
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

  const handleChangeShuffleSeed = (newSeed: number) => {
    const s = Math.max(1, newSeed);
    setShuffleSeed(s);
    localStorage.setItem("unified_seed", String(s));
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
        twinGroupId
      );
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
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
  }, [currentSubjectCode]);

  // تحميل قائمة المقررات
  useEffect(() => {
    DataService.getSubjects().then((res) => {
      setSubjects(res);
    });
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

    Promise.all([
      DataService.loadSubjectBundle(currentSubjectCode),
      DataService.getUserProgress(currentSubjectCode)
    ]).then(([bundleRes, progressRes]) => {
      if (!isCancelled) {
        setBundle(bundleRes);
        setUserProgress(progressRes);

        // التحقق من صحة المحاضرة والنموذج المستعادين
        if (activeLectureId !== "all" && bundleRes?.lectures && !bundleRes.lectures.some((l) => l.id === activeLectureId)) {
          setActiveLectureId("all");
        }
        if (selectedModelId !== "all" && bundleRes?.question_models && !bundleRes.question_models.some((m) => m.id === selectedModelId)) {
          setSelectedModelId("all");
        }
        setLoading(false);
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
          viewScrollRef.current[activeView] = sy;
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
      const targetView = state?.view || parsed.view || "slides";
      let targetLec = state?.lec || parsed.lec;
      const targetModel = state?.model || parsed.model;
      const targetScroll =
        typeof state?.scroll === "number"
          ? state.scroll
          : (viewScrollRef.current[targetView] || 0);

      if (parsed.ref) {
        const resolved = resolveSlideReference(parsed.ref, targetLec || activeLectureId, bundle?.slides);
        const canonical = resolved ? resolved.ref : parsed.ref;
        if (resolved && resolved.lecture_id) {
          targetLec = resolved.lecture_id;
        }
        setActiveView("slides");
        if (targetLec) setActiveLectureId(targetLec);
        if (targetModel) setSelectedModelId(targetModel);
        setTargetSlideRef(canonical);
        jumpDirectlyToSlide(canonical);
        return;
      }

      setActiveView(targetView);
      if (targetLec) setActiveLectureId(targetLec);
      if (targetModel) setSelectedModelId(targetModel);
      if (parsed.qId) {
        setFocusQuestionId(parsed.qId);
        restoreScrollToElement(`[id="q-${parsed.qId}"]`, 100);
      } else {
        restoreScrollPosition(targetScroll);
      }
    };

    const handleHashChange = () => {
      const parsed = parseLocationHash();
      if (parsed.ref) {
        const resolved = resolveSlideReference(parsed.ref, activeLectureId, bundle?.slides);
        const canonical = resolved ? resolved.ref : parsed.ref;
        if (resolved && resolved.lecture_id && resolved.lecture_id !== activeLectureId) {
          setActiveLectureId(resolved.lecture_id);
        }
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
  }, [bundle?.slides, activeLectureId]);

  // تبديل القسم مع استعادة الموضع السابق لكل قسم وتحديث التاريخ والـ URL Hash بدقة (القاعدة 11)
  const handleSelectView = useCallback((nextView: ActiveView, opts: { keepScroll?: boolean } = {}) => {
    setJumpReturn(null);
    const currScroll = window.scrollY;
    viewScrollRef.current[activeView] = currScroll;

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

    const targetY = opts.keepScroll ? currScroll : (viewScrollRef.current[nextView] || 0);

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
  }, [activeView, activeLectureId, selectedModelId]);

  const handleSelectLecture = useCallback((lecId: string) => {
    setActiveLectureId(lecId);
    try {
      const currentParsed = parseLocationHash();
      const hash = currentParsed.ref
        ? `#${currentParsed.ref}`
        : buildLocationHash(activeView, lecId, selectedModelId);
      history.replaceState(
        { view: activeView, lec: lecId, model: selectedModelId, scroll: window.scrollY },
        "",
        hash
      );
    } catch (_) {}
  }, [activeView, selectedModelId]);

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

  // قفزات البحث السريع إلى الجداول والملخص والتعاريف
  const handleJumpToTable = useCallback((tableId: string) => {
    setActiveView("tables");
    restoreScrollToElement(`#tbl-${tableId}`, 100);
  }, []);

  const handleJumpToSummaryPart = useCallback((partId: string) => {
    setActiveView("summary");
    restoreScrollToElement(`#part-${partId}`, 100);
  }, []);

  const handleJumpToDefinition = useCallback((defId: string) => {
    setActiveView("definitions");
    restoreScrollToElement(`#def-${defId}`, 100);
  }, []);

  // تصدير نسخة احتياطية من التقدم
  const handleExportProgress = useCallback(() => {
    if (!userProgress) return;
    const jsonStr = JSON.stringify(userProgress, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study_progress_${currentSubjectCode}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [userProgress, currentSubjectCode]);

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
        return;
      }

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
        const curMode = document.documentElement.getAttribute("data-mode") || "dark";
        const nextMode = curMode === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-mode", nextMode);
        localStorage.setItem("unified_mode", nextMode);
        window.dispatchEvent(new Event("storage"));
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
        // حماية: عدم التمرير إذا كان اللايت بوكس أو أي نافذة منبثقة مفتوحة
        const hasOpenModal = isGlobalSearchOpen || isShortcutsOpen || isOfflineModalOpen || isPortalOpen || isBmModalOpen;
        const hasOpenLb = !!document.getElementById("lb")?.classList.contains("open") || !!document.querySelector(".lb-wrap");
        if (!hasOpenModal && !hasOpenLb && window.matchMedia("(hover: hover)").matches) {
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
  }, [zenLevel, isGlobalSearchOpen, isShortcutsOpen, isOfflineModalOpen, isPortalOpen, isBmModalOpen]);

  // القفز إلى استوديو تفاعلي من الملخص
  const handleJumpToInteractive = useCallback((studioId: string, tabId?: string) => {
    const from = activeView;
    const scroll = window.scrollY;
    setJumpReturn({
      fromView: from,
      scrollY: scroll,
      label: from === "summary" ? "العودة إلى الملخص" : "العودة إلى القسم السابق"
    });
    setLastViewBeforeJump(from);
    setTargetStudioId(studioId);
    if (tabId) setTargetTabId(tabId);
    setActiveView("interactive");
    restoreScrollPosition(0);
  }, [activeView]);

  // العودة من الاستوديو إلى نفس موضع القراءة قبل القفز
  const handleReturnFromInteractive = useCallback(() => {
    if (!lastViewBeforeJump) return;
    const targetY =
      jumpReturn && jumpReturn.fromView === lastViewBeforeJump ? jumpReturn.scrollY : 0;
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
    viewScrollRef.current["slides"] = 0;

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
  }, [activeView, bundle?.slides, activeLectureId]);

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

  // حفظ الإجابة ومزامنة التوائم اللحظية
  const handleAnswerQuestion = useCallback(
    async (qId: string, ansIdx: number, isOk: boolean, twinGroupId?: string) => {
      const updated = await DataService.saveAnswer(
        currentSubjectCode,
        qId,
        ansIdx,
        isOk,
        twinGroupId
      );
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
  );

  // تبديل حفظ جدول في المفضلة
  const handleToggleMemorizeTable = useCallback(
    async (tableId: string) => {
      const updated = await DataService.toggleMemorizedTable(currentSubjectCode, tableId);
      setUserProgress({ ...updated });
    },
    [currentSubjectCode]
  );

  // تعليم سؤال للمراجعة السريعة
  const handleToggleFlag = useCallback(
    async (questionId: string) => {
      const updated = await DataService.toggleFlaggedQuestion(currentSubjectCode, questionId);
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

  // إضافة مادة جديدة
  const handleAddSubject = useCallback((subject: SubjectMeta) => {
    setSubjects((prev) => [subject, ...prev]);
    setCurrentSubjectCode(subject.code);
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

  const hasQuestions = (bundle?.questions?.length || 0) > 0;
  const summaryTitle = bundle?.summary?.title_ar || "";
  const emergencyTitle = bundle?.emergency?.title_ar || "";
  const isPlaceholderModule = (title: string) =>
    !title || title.includes("{المادة}") || title.includes("التجريبي");
  const availableViews: Record<ActiveView, boolean> = {
    dashboard: false,
    slides: (bundle?.slides?.length || 0) > 0,
    summary: (bundle?.summary?.parts?.length || 0) > 0 && !isPlaceholderModule(summaryTitle),
    emergency: (bundle?.emergency?.sections?.length || 0) > 0 && !isPlaceholderModule(emergencyTitle),
    tables: (bundle?.tables?.length || 0) > 0,
    questions: hasQuestions,
    explorer: hasQuestions,
    exam: hasQuestions,
    interactive: ["toc", "rm", "sec", "se"].includes(currentSubjectCode),
    definitions: Boolean(bundle?.definitions?.items?.length),
    glossary: Boolean(bundle?.glossary),
    patterns: Boolean(bundle?.patterns?.rules?.length),
    lab: Boolean(bundle?.lab?.slides?.length)
  };

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
    if (next) setActiveView(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, currentSubjectCode]);

  const totalQuestionsCount = bundle?.questions?.length || 0;
  const answeredQuestionsCount = Object.values(userProgress?.answered_questions || {}).filter(
    (a) => a.selected_answer >= 0
  ).length;
  const progressPct = totalQuestionsCount > 0 ? (answeredQuestionsCount / totalQuestionsCount) * 100 : 0;

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
        languageMode={languageMode}
        onLanguageChange={handleLanguageChange}
        autoTranslateSlides={autoTranslateSlides}
        onToggleAutoTranslate={handleToggleAutoTranslate}
        autoExplainSlides={autoExplainSlides}
        onToggleAutoExplain={handleToggleAutoExplain}
        availableViews={availableViews}
        shuffleChoices={shuffleChoices}
        onToggleShuffleChoices={handleToggleShuffleChoices}
        shuffleQuestions={shuffleQuestions}
        onToggleShuffleQuestions={handleToggleShuffleQuestions}
        shuffleSeed={shuffleSeed}
        onChangeShuffleSeed={handleChangeShuffleSeed}
        canInstallPwa={canInstallPwa}
        isPwaInstalled={isPwaInstalled}
        onPromptPwaInstall={promptPwaInstall}
        onReshuffle={handleReshuffle}
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
      />

      {/* التخطيط الكانوني الأصيل (.layout) */}
      <div className="layout">
        {/* السايدبار المكتبي (.side) */}
        <CompanionNavigation
          activeView={activeView}
          onSelectView={handleSelectView}
          lectures={bundle?.lectures || []}
          activeLectureId={activeLectureId}
          onSelectLecture={handleSelectLecture}
          models={bundle?.question_models || []}
          selectedModelId={selectedModelId}
          onSelectModel={handleSelectModel}
          availableViews={availableViews}
          counts={{
            lectures: bundle?.lectures?.length || 0,
            tables: bundle?.tables?.length || 0,
            questions: bundle?.questions?.length || 0
          }}
        />

        {/* المتن الرئيسي (.main) */}
        <main className="main" id="mainContent">
          {loading ? (
            <div className="pending-box" style={{ margin: "40px auto", maxWidth: 600 }}>
              <div className="pb-ic">
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
              <div className="pb-t">جارٍ تجهيز بيانات وتحديثات المقرر...</div>
              <div className="pb-s">المزامنة التلقائية مع السحابة والكاش المحلي السريع</div>
            </div>
          ) : (
            <>
              {activeView === "slides" && (
                <SlidesViewer
                  lectures={bundle?.lectures || []}
                  slides={bundle?.slides || []}
                  targetSlideRef={targetSlideRef}
                  activeLectureId={activeLectureId}
                  onSelectLecture={handleSelectLecture}
                  autoTranslate={autoTranslateSlides}
                  autoExplain={autoExplainSlides}
                  onToggleAutoTranslate={handleToggleAutoTranslate}
                  onToggleAutoExplain={handleToggleAutoExplain}
                  seenSlides={seenSlides}
                  onToggleSeenSlide={handleToggleSeenSlide}
                />
              )}

              {activeView === "summary" && (
                <TheoreticalSummaryView
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
                  data={bundle?.emergency}
                  reviewedSections={userProgress?.reviewed_sections || []}
                  onToggleReviewed={handleToggleReviewedSection}
                  onJumpToSlide={handleJumpToSlide}
                />
              )}

              {activeView === "tables" && (
                <ExplanatoryTablesView
                  tables={bundle?.tables || []}
                  memorizedTableIds={userProgress?.memorized_tables || []}
                  onToggleMemorize={handleToggleMemorizeTable}
                  onJumpToSlide={handleJumpToSlide}
                  activeLectureId={activeLectureId}
                />
              )}

              {activeView === "questions" && (
                <UnifiedQuestionBankView
                  subjectCode={currentSubjectCode}
                  questions={bundle?.questions || []}
                  models={bundle?.question_models || []}
                  selectedModelId={selectedModelId}
                  onSelectModel={handleSelectModel}
                  userProgress={userProgress || { subject_code: currentSubjectCode, memorized_tables: [], answered_questions: {}, bookmarks: {}, exam_history: [], updated_at: "" }}
                  onAnswerQuestion={handleAnswerQuestion}
                  onToggleFlag={handleToggleFlag}
                  onJumpToSlide={handleJumpToSlide}
                  onJumpToQuestion={handleJumpToQuestion}
                  focusQuestionId={focusQuestionId}
                  languageMode={languageMode}
                  showBookmarks={showBookmarks}
                  bmLabels={bmLabels}
                  onToggleBookmark={handleToggleBookmark}
                  onOpenBmLabelModal={() => setIsBmModalOpen(true)}
                  expMode={expMode}
                  shuffleChoices={shuffleChoices}
                  shuffleQuestions={shuffleQuestions}
                  shuffleSeed={shuffleSeed}
                  onResetModelAnswers={handleResetModelAnswers}
                  onReshuffle={handleReshuffle}
                />
              )}

              {activeView === "explorer" && (
                <QuestionBankExplorer
                  questions={bundle?.questions || []}
                  onJumpToQuestion={handleJumpToQuestion}
                />
              )}

              {activeView === "exam" && (
                <ExamSimulator
                  questions={bundle?.questions || []}
                  models={bundle?.question_models || []}
                  examHistory={userProgress?.exam_history || []}
                  onRecordResult={handleRecordExamResult}
                  onJumpToSlide={handleJumpToSlide}
                />
              )}

              {activeView === "definitions" && (
                <DefinitionsView
                  data={bundle?.definitions}
                  masteredIds={userProgress?.mastered_definitions || []}
                  onToggleMastered={handleToggleMasteredDefinition}
                  onJumpToSlide={handleJumpToSlide}
                />
              )}

              {activeView === "glossary" && (
                <GlossaryView data={bundle?.glossary} subjectName={currentSubjectMeta.name_ar} />
              )}

              {activeView === "patterns" && (
                <PatternsLabView
                  data={bundle?.patterns}
                  subjectCode={currentSubjectCode}
                  onJumpToQuestion={handleJumpToQuestion}
                />
              )}

              {activeView === "lab" && (
                <LabAppendixView data={bundle?.lab} subjectName={currentSubjectMeta.name_ar} />
              )}

              {activeView === "interactive" &&
                (["sec", "se"].includes(currentSubjectCode) ? (
                  <ConceptStudios
                    subjectCode={currentSubjectCode}
                    initialStudioId={targetStudioId}
                    initialTabId={targetTabId}
                    onReturnToSummary={lastViewBeforeJump ? handleReturnFromInteractive : undefined}
                  />
                ) : (
                  <InteractiveStudioHost
                    subjectCode={currentSubjectCode}
                    initialStudioId={targetStudioId}
                    initialTabId={targetTabId}
                    onReturnToSummary={lastViewBeforeJump ? handleReturnFromInteractive : undefined}
                  />
                ))}
            </>
          )}

          {/* التذييل المعتمد (.footer) */}
          <footer className="footer">
            <div className="footer-credit">
              <span>Study Viewer · المنصة الأكاديمية الموحدة</span>
              <span>—</span>
              <span>إعداد وتطوير: <b>عبدالرحمن المخلافي</b></span>
            </div>
          </footer>
        </main>
      </div>

      {/* زر الرجوع العائم الأصيل (#jumpReturnBar) */}
      {jumpReturn && (
        <div
          id="jumpReturnBar"
          onClick={() => {
            const { fromView, scrollY, lectureId } = jumpReturn;
            setJumpReturn(null);
            if (lectureId !== undefined) setActiveLectureId(lectureId);
            setActiveView(fromView);
            restoreScrollPosition(scrollY);
          }}
          role="button"
          tabIndex={0}
          title="الرجوع إلى الموضع السابق قبل الانتقال"
        >
          <svg className="svg-ic" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span>{jumpReturn.label}</span>
        </div>
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
        onAddSubject={handleAddSubject}
      />

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
        onPromptNative={promptPwaInstall}
      />
    </div>
  );
};



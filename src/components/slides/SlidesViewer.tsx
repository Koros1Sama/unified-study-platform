// ==============================================================================
// المنصة التعليمية الموحدة — عارض السلايدات وقارئ الكتب المرجعية العمودية
// Adaptive Dual Engine: Landscape Slides + World-Class Portrait Textbook Reader
// Split Sticky Book+Notes · Continuous Book · 2-Up Spread · Paper Comfort Filter
// Quick Page Jumper · Resume Reading · Progressive Load-More · Zero Emojis
// ==============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LightboxModal } from "./LightboxModal";
import { Icons } from "../icons/SvgIcons";
import { resolveSlideReference, jumpDirectlyToSlide } from "../../lib/scrollRestoration";
import { resolveAssetUrl } from "../../lib/dataService";
import { matchesNormalizedTerms } from "../../lib/textUtils";
import type { BookLayoutMode, BookPaperFilter, Lecture, SlideItem } from "../../types";

interface SlidesViewerProps {
  subjectCode?: string;
  lectures: Lecture[];
  slides: SlideItem[];
  targetSlideRef?: string | null;
  activeLectureId?: string;
  onSelectLecture?: (id: string) => void;
  autoTranslate?: boolean;
  autoExplain?: boolean;
  onToggleAutoTranslate?: () => void;
  onToggleAutoExplain?: () => void;
  seenSlides?: Set<string>;
  onToggleSeenSlide?: (slideRef: string) => void;
  arabicOnly?: boolean;
  pageLayout?: "slides" | "book";
}

const INITIAL_VISIBLE_COUNT = 30;
const LOAD_MORE_STEP = 30;

export const SlidesViewer: React.FC<SlidesViewerProps> = ({
  subjectCode = "default",
  lectures,
  slides,
  targetSlideRef,
  activeLectureId: controlledLectureId,
  onSelectLecture,
  autoTranslate = true,
  autoExplain = true,
  onToggleAutoTranslate,
  onToggleAutoExplain,
  seenSlides = new Set(),
  onToggleSeenSlide,
  arabicOnly = false,
  pageLayout
}) => {
  const [internalLectureId, setInternalLectureId] = useState<string>(() => lectures[0]?.id || "L1");
  const activeLectureId = controlledLectureId ?? internalLectureId;
  const selectLecture = useCallback(
    (id: string) => {
      if (controlledLectureId === undefined) setInternalLectureId(id);
      onSelectLecture?.(id);
    },
    [controlledLectureId, onSelectLecture]
  );

  // اكتشاف تلقائي لصفحات الكتب العمودية من أبعاد الصورة الأولى أو من حقل page_layout
  const [detectedPortrait, setDetectedPortrait] = useState<boolean>(pageLayout === "book");
  const isBookMode = pageLayout === "book" || detectedPortrait;

  const [bookLayout, setBookLayout] = useState<BookLayoutMode>(() => {
    const saved = localStorage.getItem("unified_book_layout") as BookLayoutMode | null;
    if (saved === "split" || saved === "continuous" || saved === "spread") return saved;
    return "split";
  });

  const [paperFilter, setPaperFilter] = useState<BookPaperFilter>(() => {
    const saved = localStorage.getItem("unified_book_paper") as BookPaperFilter | null;
    if (saved === "original" || saved === "warm" || saved === "night") return saved;
    return "original";
  });

  const [pageJumpInput, setPageJumpInput] = useState("");
  const [activeNoteTab, setActiveNoteTab] = useState<Record<string, "both" | "ar" | "ex">>({});
  const [spreadExpanded, setSpreadExpanded] = useState<Record<string, boolean>>({});
  const [lastReadRef, setLastReadRef] = useState<string | null>(() =>
    localStorage.getItem(`unified_last_page_${subjectCode}`)
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [localAr, setLocalAr] = useState<Record<string, boolean>>({});
  const [localEx, setLocalEx] = useState<Record<string, boolean>>({});
  const [seenFilter, setSeenFilter] = useState<"all" | "unseen" | "seen">("all");
  const [slideSearchQuery, setSlideSearchQuery] = useState<string>("");
  const [slideSearchScope, setSlideSearchScope] = useState<"all" | "lecture">("all");
  const [isSlideSearchOpen, setIsSlideSearchOpen] = useState(false);
  const [copiedSlideRef, setCopiedSlideRef] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_COUNT);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const unitLabel = isBookMode ? "صفحة" : "شريحة";
  const unitsPlural = isBookMode ? "صفحات الكتاب" : "السلايدات";

  const handleBookLayoutChange = (next: BookLayoutMode) => {
    setBookLayout(next);
    localStorage.setItem("unified_book_layout", next);
  };

  const handlePaperFilterChange = (next: BookPaperFilter) => {
    setPaperFilter(next);
    localStorage.setItem("unified_book_paper", next);
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (pageLayout !== undefined || detectedPortrait) return;
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > img.naturalWidth * 1.08) {
      setDetectedPortrait(true);
    }
  };

  const rememberLastPage = useCallback(
    (ref: string) => {
      setLastReadRef(ref);
      try {
        localStorage.setItem(`unified_last_page_${subjectCode}`, ref);
      } catch {
        // تجاهل امتلاء localStorage
      }
    },
    [subjectCode]
  );

  const handleCopySlideLink = (ref: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${ref}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedSlideRef(ref);
        setTimeout(() => setCopiedSlideRef(null), 2000);
      });
    }
  };

  useEffect(() => {
    if (!targetSlideRef) return;
    const target = resolveSlideReference(targetSlideRef, activeLectureId, slides);
    if (target && target.lecture_id && target.lecture_id !== activeLectureId) {
      selectLecture(target.lecture_id);
    }
  }, [targetSlideRef, slides, activeLectureId, selectLecture]);

  const activeLecture = lectures.find((l) => l.id === activeLectureId) || lectures[0] || {
    id: activeLectureId,
    title_ar: isBookMode ? "الفصل الحالي" : "المحاضرة الحالية",
    slides_count: 0
  };

  const baseSlides = useMemo(
    () => (activeLectureId === "all" ? slides : slides.filter((s) => s.lecture_id === activeLectureId)),
    [slides, activeLectureId]
  );

  const isSearching = Boolean(slideSearchQuery.trim());
  const searchPool = isSearching && slideSearchScope === "all" ? slides : baseSlides;

  const slideMatchesQuery = useCallback(
    (s: SlideItem) =>
      matchesNormalizedTerms(
        [s.ref, s.title || "", s.content_en || "", s.content_ar || "", s.notes_ar || ""].join(" "),
        slideSearchQuery
      ),
    [slideSearchQuery]
  );

  const allMatchesCount = useMemo(
    () => (isSearching ? slides.filter(slideMatchesQuery).length : 0),
    [isSearching, slides, slideMatchesQuery]
  );

  const lecMatchesCount = useMemo(
    () => (isSearching ? baseSlides.filter(slideMatchesQuery).length : 0),
    [isSearching, baseSlides, slideMatchesQuery]
  );

  const currentSlides = useMemo(
    () =>
      searchPool.filter((s) => {
        if (seenFilter === "seen" && !seenSlides.has(s.ref)) return false;
        if (seenFilter === "unseen" && seenSlides.has(s.ref)) return false;
        if (isSearching && !slideMatchesQuery(s)) return false;
        return true;
      }),
    [searchPool, seenFilter, seenSlides, isSearching, slideMatchesQuery]
  );

  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE_COUNT);
  }, [activeLectureId, slideSearchQuery, seenFilter, slideSearchScope]);

  useEffect(() => {
    if (targetSlideRef) {
      if (slideSearchQuery) setSlideSearchQuery("");
      if (seenFilter !== "all") setSeenFilter("all");
    }
  }, [targetSlideRef, slideSearchQuery, seenFilter]);

  useEffect(() => {
    if (!targetSlideRef) return;
    const resolved = resolveSlideReference(targetSlideRef, activeLectureId, slides);
    const targetRef = resolved ? resolved.ref : targetSlideRef;
    const idx = currentSlides.findIndex((s) => s.ref === targetRef);
    if (idx >= 0 && idx >= visibleLimit) {
      setVisibleLimit(idx + 15);
    }
    rememberLastPage(targetRef);
    jumpDirectlyToSlide(targetRef);
  }, [targetSlideRef, currentSlides, visibleLimit, activeLectureId, slides, rememberLastPage]);

  // تحميل تدريجي تلقائي سلس عند اقتراب المستخدم من نهاية القائمة
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleLimit >= currentSlides.length) return;
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleLimit((prev) => Math.min(currentSlides.length, prev + LOAD_MORE_STEP));
        }
      },
      { rootMargin: "420px 0px" }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [visibleLimit, currentSlides.length]);

  const renderedSlides = currentSlides.slice(0, visibleLimit);
  const remainingCount = Math.max(0, currentSlides.length - renderedSlides.length);

  const handleOpenSlide = (slide: SlideItem) => {
    const idx = currentSlides.findIndex((s) => s.ref === slide.ref);
    if (idx >= 0) {
      rememberLastPage(slide.ref);
      setCurrentSlideIndex(idx);
      setLightboxOpen(true);
    }
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    const activeSlide = currentSlides[currentSlideIndex];
    if (activeSlide) {
      rememberLastPage(activeSlide.ref);
      if (currentSlideIndex >= visibleLimit) {
        setVisibleLimit(currentSlideIndex + 15);
      }
      jumpDirectlyToSlide(activeSlide.ref, () => {
        try {
          history.replaceState(
            { view: "slides", ref: activeSlide.ref, lec: activeLectureId, scroll: window.scrollY },
            "",
            `#${activeSlide.ref}`
          );
        } catch {
          // تجاهل في البيئات المقيدة
        }
      });
    }
  };

  const handleJumpToPageNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(pageJumpInput.trim(), 10);
    if (!num || num < 1 || currentSlides.length === 0) return;
    const clampedIdx = Math.min(currentSlides.length - 1, Math.max(0, num - 1));
    const target = currentSlides[clampedIdx];
    if (!target) return;
    if (clampedIdx >= visibleLimit) {
      setVisibleLimit(clampedIdx + 12);
    }
    rememberLastPage(target.ref);
    jumpDirectlyToSlide(target.ref);
    setPageJumpInput("");
  };

  const handleResumeLastPage = () => {
    if (!lastReadRef) return;
    const target = resolveSlideReference(lastReadRef, activeLectureId, slides);
    if (!target) return;
    if (activeLectureId !== "all" && target.lecture_id !== activeLectureId) {
      selectLecture(target.lecture_id);
    }
    const pool = activeLectureId === "all" ? slides : slides.filter((s) => s.lecture_id === target.lecture_id);
    const idx = pool.findIndex((s) => s.ref === target.ref);
    if (idx >= visibleLimit) {
      setVisibleLimit(idx + 15);
    }
    jumpDirectlyToSlide(target.ref);
  };

  const isArShown = (ref: string) => (localAr[ref] !== undefined ? localAr[ref] : autoTranslate);
  const isExShown = (ref: string) => (localEx[ref] !== undefined ? localEx[ref] : autoExplain);

  const toggleCardAr = (ref: string) => {
    setLocalAr((prev) => ({
      ...prev,
      [ref]: prev[ref] !== undefined ? !prev[ref] : !autoTranslate
    }));
  };

  const toggleCardEx = (ref: string) => {
    setLocalEx((prev) => ({
      ...prev,
      [ref]: prev[ref] !== undefined ? !prev[ref] : !autoExplain
    }));
  };

  const seenInScopeCount = useMemo(
    () => baseSlides.filter((s) => seenSlides.has(s.ref)).length,
    [baseSlides, seenSlides]
  );
  const readingPct = baseSlides.length > 0 ? Math.round((seenInScopeCount / baseSlides.length) * 100) : 0;

  const paperFilterClass =
    paperFilter === "warm"
      ? "book-paper-warm"
      : paperFilter === "night"
      ? "book-paper-night"
      : "";

  // تجميع الصفحات في أزواج لوضع «صفحتان متقابلتان»
  const spreadPairs = useMemo(() => {
    if (!isBookMode || bookLayout !== "spread") return [];
    const pairs: Array<[SlideItem, SlideItem | null]> = [];
    for (let i = 0; i < renderedSlides.length; i += 2) {
      pairs.push([renderedSlides[i], renderedSlides[i + 1] || null]);
    }
    return pairs;
  }, [isBookMode, bookLayout, renderedSlides]);

  const renderPagePanels = (slide: SlideItem, compactTabs = false) => {
    const showAr = isArShown(slide.ref);
    const showEx = isExShown(slide.ref);
    const noteTab = activeNoteTab[slide.ref] || "both";
    const visibleAr = !arabicOnly && showAr && (!compactTabs || noteTab === "both" || noteTab === "ar");
    const visibleEx = showEx && (!compactTabs || noteTab === "both" || noteTab === "ex");

    if (!visibleAr && !visibleEx) {
      return (
        <div className="book-notes-collapsed">
          <span>تم طي الترجمة والشرح — استخدم أزرار الشريط العلوي للعرض</span>
        </div>
      );
    }

    return (
      <>
        {compactTabs && !arabicOnly && showAr && showEx && (
          <div className="book-note-tabs" role="tablist" aria-label="تبويبات الشرح">
            {[
              { id: "both" as const, label: "الكل" },
              { id: "ar" as const, label: "الترجمة" },
              { id: "ex" as const, label: "الشرح" }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={noteTab === t.id}
                className={`book-note-tab ${noteTab === t.id ? "active" : ""}`}
                onClick={() => setActiveNoteTab((prev) => ({ ...prev, [slide.ref]: t.id }))}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {visibleAr && (
          <div className="ar-panel show">
            <div className="ex-head" style={{ color: "var(--acc)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Icons.Translate size={14} />
              <span>الترجمة العربية</span>
            </div>
            {slide.content_ar ? (
              <div className="ar-body" style={{ marginTop: "8px", fontSize: "0.88rem", lineHeight: 1.8, color: "var(--ink)" }}>
                {slide.content_ar.split("\n").filter(Boolean).map((line, idx) => (
                  <p key={idx} style={{ marginBottom: "6px" }}>{line}</p>
                ))}
              </div>
            ) : (
              <div className="ph" style={{ color: "var(--ink-m)", fontSize: "0.8rem", fontStyle: "italic", marginTop: "4px" }}>
                لا توجد ترجمة نصية لهذه {isBookMode ? "الصفحة" : "الشريحة"}
              </div>
            )}
          </div>
        )}

        {visibleEx && (
          <div className="ex-panel show">
            <div className="ex-head" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Icons.Tip size={14} />
              <span>الشرح التعليمي والوقفة الامتحانية</span>
            </div>
            {slide.notes_ar ? (
              <div className="ex-body" style={{ marginTop: "8px", fontSize: "0.88rem", lineHeight: 1.85, color: "var(--ink)" }}>
                {slide.notes_ar.split("\n").filter(Boolean).map((line, idx) => (
                  <p key={idx} style={{ marginBottom: "6px" }}>{line}</p>
                ))}
              </div>
            ) : slide.content_en ? (
              <div className="ex-body" style={{ marginTop: "8px", fontSize: "0.88rem", lineHeight: 1.7, color: "var(--ink)" }}>
                <p style={{ direction: "ltr", textAlign: "left", color: "var(--ink-m)" }}>{slide.content_en}</p>
              </div>
            ) : (
              <div className="ph" style={{ color: "var(--ink-m)", fontSize: "0.8rem", fontStyle: "italic", marginTop: "4px" }}>
                الشرح قيد الإعداد
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderCardHeader = (slide: SlideItem, pageNumInList: number) => {
    const isSeen = seenSlides.has(slide.ref);
    const showAr = isArShown(slide.ref);
    const showEx = isExShown(slide.ref);

    return (
      <div className="sc-head">
        <span className="sc-ref" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span>{isBookMode ? `ص ${pageNumInList} · ${slide.ref}` : slide.ref}</span>
          {isSearching && slideSearchScope === "all" && slide.lecture_id && (
            <span style={{ fontSize: "0.66rem", padding: "1px 6px", borderRadius: "var(--r-pill)", background: "color-mix(in srgb, var(--acc) 18%, transparent)", color: "var(--acc)", fontWeight: 800 }}>
              {slide.lecture_id}
            </span>
          )}
        </span>
        <span className="sc-title" title={slide.title || slide.content_en || slide.ref}>
          {slide.title || slide.content_en || `${unitLabel} ${slide.slide_num}`}
        </span>
        <div className="sc-actions">
          {!arabicOnly && (
            <button
              type="button"
              className={`mini ar-btn ${showAr ? "on" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleCardAr(slide.ref);
              }}
              title="إظهار أو طي الترجمة العربية"
            >
              <Icons.Translate size={12} />
              <span>ترجمة</span>
            </button>
          )}
          <button
            type="button"
            className={`mini ex-btn ${showEx ? "on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleCardEx(slide.ref);
            }}
            title="إظهار أو طي الشرح التعليمي"
          >
            <Icons.Tip size={12} />
            <span>شرح</span>
          </button>
          {onToggleSeenSlide && (
            <button
              type="button"
              className={`mini seen-btn ${isSeen ? "on" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                rememberLastPage(slide.ref);
                onToggleSeenSlide(slide.ref);
              }}
              title={isSeen ? "تمت القراءة (انقر للإلغاء)" : "تحديد كمقروء"}
            >
              <Icons.Check size={12} />
              <span>{isBookMode ? "قرأت" : "راجعت"}</span>
            </button>
          )}
          <button
            type="button"
            className="mini share-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCopySlideLink(slide.ref);
            }}
            title={`نسخ رابط مباشر لهذه ${isBookMode ? "الصفحة" : "الشريحة"}`}
          >
            <Icons.Share size={12} />
            <span>{copiedSlideRef === slide.ref ? "تم النسخ" : "رابط"}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="slidesView" className={isBookMode ? "book-reader-view" : undefined}>
      {/* الترويسة */}
      <div className="headline">
        <div className="kicker">
          <span className="dot"></span>
          <span>
            {isBookMode ? "قارئ الكتاب المرجعي · " : ""}
            {activeLectureId === "all" ? "الكل" : `${activeLecture.id} · ${activeLecture.title_ar}`}
          </span>
        </div>
        <h1>
          {activeLectureId === "all"
            ? isBookMode
              ? "الكتاب المرجعي الكامل"
              : "جميع شرائح المقرر"
            : activeLecture.title_ar}
        </h1>
        <p className="sub">
          {activeLectureId === "all"
            ? isBookMode
              ? `عرض كامل صفحات الكتاب (${slides.length} صفحة عمودية) مع قارئ ثنائي اللوحة وفلتر راحة العين`
              : `عرض كامل شرائح المادة (${slides.length} شريحة)`
            : isBookMode
            ? `تصفح صفحات وشروح الفصل ${activeLecture.id} (${currentSlides.length} صفحة)`
            : `تصفح شرائح وشروح المحاضرة ${activeLecture.id} (${currentSlides.length} شريحة)`}
        </p>
      </div>

      {/* شريط قارئ الكتاب المرجعي المتقدم (يظهر تلقائياً للمناهج ذات الصفحات العمودية) */}
      {isBookMode && (
        <div className="book-studio-bar">
          <div className="book-bar-row">
            {/* أوضاع تخطيط القراءة الثلاثة */}
            <div className="fchip-group" role="group" aria-label="وضع عرض الكتاب">
              <button
                type="button"
                className={`fchip ${bookLayout === "split" ? "on" : ""}`}
                onClick={() => handleBookLayoutChange("split")}
                title="عرض الصفحة العمودية بجانب الترجمة والشرح (مثالي للحاسوب)"
              >
                <Icons.Columns size={13} />
                <span>الكتاب + الشرح</span>
              </button>
              <button
                type="button"
                className={`fchip ${bookLayout === "continuous" ? "on" : ""}`}
                onClick={() => handleBookLayoutChange("continuous")}
                title="قراءة عمودية متصلة للصفحات بحجم كبير مع طي الشرح أسفلها"
              >
                <Icons.SinglePage size={13} />
                <span>قراءة متصلة</span>
              </button>
              <button
                type="button"
                className={`fchip desktop-only ${bookLayout === "spread" ? "on" : ""}`}
                onClick={() => handleBookLayoutChange("spread")}
                title="عرض صفحتين متقابلتين ككتاب مفتوح على الشاشات العريضة"
              >
                <Icons.BookOpen size={13} />
                <span>صفحتان</span>
              </button>
            </div>

            {/* فلتر راحة العين لورق الكتاب */}
            <div className="fchip-group" role="group" aria-label="راحة العين لورق الكتاب">
              <button
                type="button"
                className={`fchip ${paperFilter === "original" ? "on" : ""}`}
                onClick={() => handlePaperFilterChange("original")}
                title="الورق الأبيض الأصلي للكتاب"
              >
                <span>أصلي</span>
              </button>
              <button
                type="button"
                className={`fchip ${paperFilter === "warm" ? "on" : ""}`}
                onClick={() => handlePaperFilterChange("warm")}
                title="ورق دافئ مريح للقراءة الطويلة (Sepia)"
              >
                <Icons.Sun size={12} />
                <span>ورق دافئ</span>
              </button>
              <button
                type="button"
                className={`fchip ${paperFilter === "night" ? "on" : ""}`}
                onClick={() => handlePaperFilterChange("night")}
                title="الوضع الليلي الذكي لعكس بياض الورق دون تشويه ألوان المخططات"
              >
                <Icons.Moon size={12} />
                <span>ليلي ذكي</span>
              </button>
            </div>

            {/* القفز السريع لرقم الصفحة */}
            <form className="book-page-jumper" onSubmit={handleJumpToPageNumber}>
              <label htmlFor="bookPageJump">صفحة</label>
              <input
                id="bookPageJump"
                type="number"
                min={1}
                max={Math.max(1, currentSlides.length)}
                value={pageJumpInput}
                onChange={(e) => setPageJumpInput(e.target.value)}
                placeholder={`1-${currentSlides.length}`}
                aria-label="رقم الصفحة للانتقال السريع"
              />
              <span className="book-page-total">/ {currentSlides.length}</span>
              <button type="submit" className="mini" title="انتقال فوري للصفحة">
                انتقال
              </button>
            </form>

            {lastReadRef && (
              <button
                type="button"
                className="fchip"
                onClick={handleResumeLastPage}
                title={`العودة لآخر صفحة قرأتها (${lastReadRef})`}
              >
                <Icons.Jump size={12} />
                <span>متابعة ({lastReadRef})</span>
              </button>
            )}
          </div>

          {/* شريط تقدم قراءة الكتاب */}
          <div className="book-progress-strip">
            <span className="book-progress-txt">
              أنجزت <b>{seenInScopeCount}</b> من {baseSlides.length} صفحة ({readingPct}%)
            </span>
            <div className="book-progress-track">
              <i style={{ width: `${readingPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* شريط تصفية وبحث السلايدات/الصفحات */}
      <div className="fchips" style={{ marginBottom: "14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          className={`fchip ${seenFilter === "all" ? "on" : ""}`}
          onClick={() => setSeenFilter("all")}
        >
          كل {unitsPlural} ({baseSlides.length})
        </button>
        <button
          type="button"
          className={`fchip ${seenFilter === "unseen" ? "on" : ""}`}
          onClick={() => setSeenFilter("unseen")}
        >
          المتبقية ({baseSlides.length - seenInScopeCount})
        </button>
        <button
          type="button"
          className={`fchip ${seenFilter === "seen" ? "on" : ""}`}
          onClick={() => setSeenFilter("seen")}
        >
          <Icons.Check size={12} />
          {isBookMode ? "المقروءة" : "المراجعة"} ({seenInScopeCount})
        </button>

        <button
          type="button"
          className={`fchip ${isSlideSearchOpen || slideSearchQuery ? "on" : ""}`}
          onClick={() => setIsSlideSearchOpen(!isSlideSearchOpen)}
          title={`بحث وتصفية في ${unitsPlural}`}
        >
          <Icons.Search size={12} />
          <span>بحث</span>
          {slideSearchQuery && <span style={{ opacity: 0.85, marginInlineStart: 4 }}>({currentSlides.length})</span>}
        </button>

        {!arabicOnly && onToggleAutoTranslate && (
          <button
            type="button"
            className={`fchip ${autoTranslate ? "on" : ""}`}
            onClick={onToggleAutoTranslate}
            title="تبديل إظهار الترجمة العربية"
          >
            <Icons.Translate size={12} />
            <span>ترجمة الكل</span>
          </button>
        )}

        {onToggleAutoExplain && (
          <button
            type="button"
            className={`fchip ${autoExplain ? "on" : ""}`}
            onClick={onToggleAutoExplain}
            title="تبديل إظهار الشروح والوقفات الامتحانية"
          >
            <Icons.Tip size={12} />
            <span>شرح الكل</span>
          </button>
        )}
      </div>

      {/* شريط البحث الحي */}
      {(isSlideSearchOpen || slideSearchQuery) && (
        <div className="unified-search-box">
          <Icons.Search size={16} style={{ color: "var(--acc)", flexShrink: 0 }} />
          <input
            type="search"
            placeholder={
              isBookMode
                ? "ابحث في عناوين صفحات الكتاب، النصوص، أو الشروح..."
                : "ابحث في عناوين السلايدات أو النصوص أو الشروح..."
            }
            value={slideSearchQuery}
            onChange={(e) => setSlideSearchQuery(e.target.value)}
            autoFocus
            aria-label={`البحث في ${unitsPlural}`}
          />

          {isSearching && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "var(--sf2)", padding: "2px 4px", borderRadius: "999px", border: "1px solid var(--ln-s)" }}>
              <button
                type="button"
                onClick={() => setSlideSearchScope("all")}
                style={{
                  border: "none",
                  background: slideSearchScope === "all" ? "var(--acc)" : "transparent",
                  color: slideSearchScope === "all" ? "#000" : "var(--ink-m)",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  cursor: "pointer"
                }}
              >
                كامل المقرر ({allMatchesCount})
              </button>
              <button
                type="button"
                onClick={() => setSlideSearchScope("lecture")}
                style={{
                  border: "none",
                  background: slideSearchScope === "lecture" ? "var(--acc)" : "transparent",
                  color: slideSearchScope === "lecture" ? "#000" : "var(--ink-m)",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  cursor: "pointer"
                }}
              >
                {activeLecture.id} ({lecMatchesCount})
              </button>
            </div>
          )}

          {slideSearchQuery && (
            <button
              type="button"
              onClick={() => setSlideSearchQuery("")}
              style={{ background: "none", border: "none", color: "var(--ink-m)", cursor: "pointer", padding: "4px", display: "flex" }}
              title="مسح البحث"
              aria-label="مسح البحث"
            >
              <Icons.Cross size={14} />
            </button>
          )}
        </div>
      )}

      {/* شريط الفصول/المحاضرات الانسيابي */}
      <div
        className="lec-scroll-strip"
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          paddingBottom: "8px",
          marginBottom: "18px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <button
          type="button"
          className={`fchip ${activeLectureId === "all" ? "on" : ""}`}
          style={{ flexShrink: 0 }}
          onClick={() => selectLecture("all")}
        >
          الكل ({slides.length})
        </button>
        {lectures.map((lec) => (
          <button
            key={lec.id}
            type="button"
            className={`fchip ${activeLectureId === lec.id ? "on" : ""}`}
            style={{ flexShrink: 0 }}
            onClick={() => selectLecture(lec.id)}
          >
            {lec.id}: {lec.title_ar}
            {lec.slides_count > 0 && <span style={{ opacity: 0.75, marginInlineStart: 4 }}>({lec.slides_count})</span>}
          </button>
        ))}
      </div>

      {currentSlides.length === 0 ? (
        <div className="pending-box">
          <div className="pb-ic">
            {isBookMode ? <Icons.BookOpen size={34} /> : <Icons.Slides size={34} />}
          </div>
          <div className="pb-t">
            {isBookMode ? "لا توجد صفحات مطابقة حالياً" : "لا توجد شرائح متوفرة حالياً لهذه المحاضرة"}
          </div>
        </div>
      ) : isBookMode && bookLayout === "spread" ? (
        /* وضع صفحتين متقابلتين (Open Book Spread) */
        <div id="cards" className="book-spread-list">
          {spreadPairs.map(([leftSlide, rightSlide], pairIdx) => {
            const pairKey = `${leftSlide.ref}_${rightSlide?.ref || "end"}`;
            const isDrawerOpen = Boolean(spreadExpanded[pairKey]);
            return (
              <div key={pairKey} className="book-spread-unit">
                <div className="book-spread-grid">
                  {[leftSlide, rightSlide].map((sl, slotIdx) => {
                    if (!sl) {
                      return <div key="empty" className="book-spread-empty" aria-hidden="true" />;
                    }
                    const pageIdx = pairIdx * 2 + slotIdx + 1;
                    const isTargeted = targetSlideRef === sl.ref;
                    const isSeen = seenSlides.has(sl.ref);
                    return (
                      <article
                        key={sl.ref}
                        id={`slide-${sl.ref}`}
                        data-ref={sl.ref}
                        className={`slide-card book-card-spread-page reveal in ${isSeen ? "seen" : ""} ${isTargeted ? "flash targeted" : ""}`}
                      >
                        <div className="book-spread-meta">
                          <span className="sc-ref">ص {pageIdx} · {sl.ref}</span>
                          <span className="sc-title" title={sl.title || sl.ref}>{sl.title || sl.ref}</span>
                          {onToggleSeenSlide && (
                            <button
                              type="button"
                              className={`mini seen-btn ${isSeen ? "on" : ""}`}
                              onClick={() => {
                                rememberLastPage(sl.ref);
                                onToggleSeenSlide(sl.ref);
                              }}
                            >
                              <Icons.Check size={12} />
                            </button>
                          )}
                        </div>
                        <div className="sc-imgwrap book-page-wrap" onClick={() => handleOpenSlide(sl)}>
                          <img
                            src={resolveAssetUrl(sl.image_url)}
                            alt={sl.ref}
                            className={paperFilterClass}
                            loading="lazy"
                            decoding="async"
                          />
                          <button
                            type="button"
                            className="zoom-btn"
                            title="تكبير الصفحة في اللايت بوكس"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSlide(sl);
                            }}
                          >
                            <Icons.Maximize size={13} />
                            <span>تكبير</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="book-spread-footer">
                  <button
                    type="button"
                    className={`fchip ${isDrawerOpen ? "on" : ""}`}
                    onClick={() =>
                      setSpreadExpanded((prev) => ({ ...prev, [pairKey]: !prev[pairKey] }))
                    }
                  >
                    <Icons.Translate size={13} />
                    <span>
                      {isDrawerOpen
                        ? "إخفاء ترجمة وشرح الصفحتين"
                        : `عرض ترجمة وشرح (${leftSlide.ref}${rightSlide ? ` و ${rightSlide.ref}` : ""})`}
                    </span>
                  </button>
                </div>

                {isDrawerOpen && (
                  <div className="book-spread-notes">
                    {[leftSlide, rightSlide].filter(Boolean).map((sl) => (
                      <div key={sl!.ref} className="book-spread-note-col">
                        <div className="book-spread-note-ref">{sl!.ref} — {sl!.title}</div>
                        {renderPagePanels(sl!, true)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* العرض الرئيسي: سلايدات أفقية OR كتاب عمودي (Split بجانب الشرح / Continuous متصلة) */
        <div
          id="cards"
          className={
            isBookMode
              ? bookLayout === "split"
                ? "book-cards-split"
                : "book-cards-continuous"
              : undefined
          }
        >
          {renderedSlides.map((slide, idx) => {
            const isTargeted = targetSlideRef === slide.ref;
            const isSeen = seenSlides.has(slide.ref);
            const showAr = isArShown(slide.ref);
            const showEx = isExShown(slide.ref);
            const isSplitBook = isBookMode && bookLayout === "split";
            const hasAnyPanel = (!arabicOnly && showAr) || showEx;

            return (
              <article
                key={slide.ref}
                id={`slide-${slide.ref}`}
                data-ref={slide.ref}
                className={`slide-card reveal in ${isSeen ? "seen" : ""} ${isTargeted ? "flash targeted" : ""} ${
                  isBookMode ? `book-card book-layout-${bookLayout}` : ""
                } ${isSplitBook && !hasAnyPanel ? "book-notes-hidden" : ""}`}
              >
                {renderCardHeader(slide, idx + 1)}

                <div className={isSplitBook ? "book-split-grid" : undefined}>
                  <div
                    className={`sc-imgwrap ${isBookMode ? "book-page-wrap" : ""}`}
                    onClick={() => handleOpenSlide(slide)}
                  >
                    {slide.image_url ? (
                      <img
                        src={resolveAssetUrl(slide.image_url)}
                        alt={slide.ref}
                        className={isBookMode ? paperFilterClass : undefined}
                        loading="lazy"
                        decoding="async"
                        onLoad={handleImgLoad}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        dir="ltr"
                        style={{
                          height: "100%",
                          minHeight: 190,
                          padding: "16px 18px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          background: "linear-gradient(145deg, color-mix(in srgb, var(--acc) 9%, var(--sf2)), var(--sf2))",
                          color: "var(--ink)",
                          textAlign: "left",
                          borderBottom: "1px solid var(--ln-s)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "var(--fm)", fontSize: "0.78rem", fontWeight: 800, color: "var(--acc)" }}>
                            {slide.ref}
                          </span>
                          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "var(--r-pill)", background: "var(--sf)", color: "var(--ink-m)", border: "1px solid var(--ln)" }}>
                            Reference Excerpt
                          </span>
                        </div>
                        <div style={{ fontSize: "0.94rem", fontWeight: 700, color: "var(--ink)", marginTop: 8, marginBottom: 6 }}>
                          {slide.title || slide.ref}
                        </div>
                        {slide.content_en && (
                          <div style={{ fontSize: "0.82rem", lineHeight: 1.55, color: "var(--ink-m)", fontFamily: "var(--fm)", whiteSpace: "pre-wrap" }}>
                            {slide.content_en}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      className="zoom-btn"
                      title={`تكبير ${isBookMode ? "الصفحة" : "الصورة"} في اللايت بوكس`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSlide(slide);
                      }}
                    >
                      <Icons.Maximize size={13} />
                      <span>تكبير</span>
                    </button>
                  </div>

                  {/* متن الشريحة/الصفحة: الترجمة والشرح */}
                  {(!isSplitBook || hasAnyPanel) && (
                    <div className={`sc-body ${isSplitBook ? "book-notes-pane" : ""}`}>
                      {renderPagePanels(slide, isSplitBook)}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* تحميل المزيد التلقائي واليدوي (إصلاح انقطاع الـ 30 شريحة/صفحة) */}
      {remainingCount > 0 && (
        <div ref={sentinelRef} className="bank-more" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setVisibleLimit((n) => n + LOAD_MORE_STEP)}
          >
            <span>
              عرض المزيد من {unitsPlural} ({remainingCount} {unitLabel} متبقية)
            </span>
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{ marginInlineStart: 8 }}
            onClick={() => setVisibleLimit(currentSlides.length)}
          >
            <span>عرض الكل ({currentSlides.length})</span>
          </button>
        </div>
      )}

      {/* نافذة اللايت بوكس المكبرة */}
      <LightboxModal
        isOpen={lightboxOpen}
        slides={currentSlides}
        currentIndex={currentSlideIndex}
        onClose={handleCloseLightbox}
        onNavigate={(idx) => {
          setCurrentSlideIndex(idx);
          if (currentSlides[idx]) rememberLastPage(currentSlides[idx].ref);
        }}
        isBookMode={isBookMode}
        paperFilter={paperFilter}
        onChangePaperFilter={handlePaperFilterChange}
        arabicOnly={arabicOnly}
      />
    </div>
  );
};

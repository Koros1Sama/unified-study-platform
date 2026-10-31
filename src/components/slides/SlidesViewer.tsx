// ==============================================================================
// المنصة التعليمية الموحدة — عارض السلايدات والمحاضرات الأصيل (Authentic Slides)
// Matches RM_Viewer and TOC_Slides_Viewer `.headline`, `.fchips`, `#cards`, `.slide-card`
// Canonical classes: .sc-head, .sc-ref, .sc-title, .sc-actions, .sc-imgwrap, .ar-panel, .ex-panel
// Zero Emojis Standard
// ==============================================================================

import React, { useState, useEffect } from "react";
import { LightboxModal } from "./LightboxModal";
import { Icons } from "../icons/SvgIcons";
import { resolveSlideReference, jumpDirectlyToSlide } from "../../lib/scrollRestoration";
import { resolveAssetUrl } from "../../lib/dataService";
import type { Lecture, SlideItem } from "../../types";

interface SlidesViewerProps {
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
}

export const SlidesViewer: React.FC<SlidesViewerProps> = ({
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
  onToggleSeenSlide
}) => {
  const [internalLectureId, setInternalLectureId] = useState<string>(() => lectures[0]?.id || "L1");
  const activeLectureId = controlledLectureId ?? internalLectureId;
  const selectLecture = (id: string) => {
    if (controlledLectureId === undefined) setInternalLectureId(id);
    if (onSelectLecture) onSelectLecture(id);
  };

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // تجاوز محلي لكل شريحة عند النقر على أزرار البطاقة
  const [localAr, setLocalAr] = useState<Record<string, boolean>>({});
  const [localEx, setLocalEx] = useState<Record<string, boolean>>({});

  // تصفية السلايدات والبحث الحي عبر كامل المقرر أو المحاضرة الحالية
  const [seenFilter, setSeenFilter] = useState<"all" | "unseen" | "seen">("all");
  const [slideSearchQuery, setSlideSearchQuery] = useState<string>("");
  const [slideSearchScope, setSlideSearchScope] = useState<"all" | "lecture">("all");
  const [isSlideSearchOpen, setIsSlideSearchOpen] = useState(false);
  const [copiedSlideRef, setCopiedSlideRef] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(30);

  const handleCopySlideLink = (ref: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${ref}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedSlideRef(ref);
        setTimeout(() => setCopiedSlideRef(null), 2000);
      });
    }
  };

  // مزامنة المحاضرة التلقائية عند استهداف شريحة معينة
  useEffect(() => {
    if (!targetSlideRef) return;
    const target = resolveSlideReference(targetSlideRef, activeLectureId, slides);
    if (target && target.lecture_id && target.lecture_id !== activeLectureId) {
      selectLecture(target.lecture_id);
    }
  }, [targetSlideRef, slides, activeLectureId, selectLecture]);

  const activeLecture = lectures.find((l) => l.id === activeLectureId) || lectures[0] || {
    id: activeLectureId,
    title_ar: "المحاضرة الحالية",
    slides_count: 0
  };

  const baseSlides = activeLectureId === "all"
    ? slides
    : slides.filter((s) => s.lecture_id === activeLectureId);

  const isSearching = !!slideSearchQuery.trim();
  const searchPool = (isSearching && slideSearchScope === "all") ? slides : baseSlides;

  // إحصائيات المطابقة للبحث عبر كامل المقرر وعبر المحاضرة الحالية
  const allMatchesCount = isSearching
    ? slides.filter((s) => {
        const q = slideSearchQuery.trim().toLowerCase();
        return [s.ref, s.title || "", s.content_en || "", s.content_ar || "", s.notes_ar || ""].join(" ").toLowerCase().includes(q);
      }).length
    : 0;

  const lecMatchesCount = isSearching
    ? baseSlides.filter((s) => {
        const q = slideSearchQuery.trim().toLowerCase();
        return [s.ref, s.title || "", s.content_en || "", s.content_ar || "", s.notes_ar || ""].join(" ").toLowerCase().includes(q);
      }).length
    : 0;

  const currentSlides = searchPool.filter((s) => {
    if (seenFilter === "seen" && !seenSlides.has(s.ref)) return false;
    if (seenFilter === "unseen" && seenSlides.has(s.ref)) return false;
    if (isSearching) {
      const q = slideSearchQuery.trim().toLowerCase();
      const text = [s.ref, s.title || "", s.content_en || "", s.content_ar || "", s.notes_ar || ""].join(" ").toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  // إعادة ضبط حد العرض التدريجي عند تغيير المحاضرة أو الفلتر أو البحث لتحسين الأداء الفائق
  useEffect(() => {
    setVisibleLimit(30);
  }, [activeLectureId, slideSearchQuery, seenFilter, slideSearchScope]);

  // إعادة ضبط الفلتر والبحث تلقائياً عند استهداف شريحة محددة لضمان عدم حجبها
  useEffect(() => {
    if (targetSlideRef) {
      if (slideSearchQuery) setSlideSearchQuery("");
      if (seenFilter !== "all") setSeenFilter("all");
    }
  }, [targetSlideRef]);

  // توسيع حد العرض تلقائياً وقنص السلايد مباشرة متمركزاً
  useEffect(() => {
    if (targetSlideRef) {
      const resolved = resolveSlideReference(targetSlideRef, activeLectureId, slides);
      const targetRef = resolved ? resolved.ref : targetSlideRef;
      const idx = currentSlides.findIndex((s) => s.ref === targetRef);
      if (idx >= 0 && idx >= visibleLimit) {
        setVisibleLimit(idx + 15);
      }
      jumpDirectlyToSlide(targetRef);
    }
  }, [targetSlideRef, currentSlides, visibleLimit, activeLectureId, slides]);

  const renderedSlides = currentSlides.slice(0, visibleLimit);

  const handleOpenSlide = (slide: SlideItem) => {
    const idx = currentSlides.findIndex((s) => s.ref === slide.ref);
    if (idx >= 0) {
      setCurrentSlideIndex(idx);
      setLightboxOpen(true);
    }
  };

  // إغلاق اللايت بوكس مع حفظ واستعادة الموضع الدقيق للشريحة النشطة الحالية (القاعدة 11)
  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    const activeSlide = currentSlides[currentSlideIndex];
    if (activeSlide) {
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
        } catch (_) {}
      });
    }
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

  return (
    <div id="slidesView">
      {/* الترويسة الأصيلة (.headline) */}
      <div className="headline">
        <div className="kicker">
          <span className="dot"></span>
          <span>{activeLecture.id} · {activeLecture.title_ar}</span>
        </div>
        <h1>{activeLecture.title_ar}</h1>
        <p className="sub">
          {activeLectureId === "all"
            ? `عرض كامل شرائح المادة (${slides.length} شريحة)`
            : `تصفح شرائح وشروح المحاضرة ${activeLecture.id} (${currentSlides.length} شريحة)`}
        </p>
      </div>

      {/* شريط تصفية وبحث السلايدات وترجمة/شرح الكل */}
      <div className="fchips" style={{ marginBottom: "14px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          className={`fchip ${seenFilter === "all" ? "on" : ""}`}
          onClick={() => setSeenFilter("all")}
        >
          كل السلايدات ({baseSlides.length})
        </button>
        <button
          type="button"
          className={`fchip ${seenFilter === "unseen" ? "on" : ""}`}
          onClick={() => setSeenFilter("unseen")}
        >
          المتبقية ({baseSlides.filter((s) => !seenSlides.has(s.ref)).length})
        </button>
        <button
          type="button"
          className={`fchip ${seenFilter === "seen" ? "on" : ""}`}
          onClick={() => setSeenFilter("seen")}
        >
          <Icons.Check size={12} />
          المراجعة ({baseSlides.filter((s) => seenSlides.has(s.ref)).length})
        </button>

        <button
          type="button"
          className={`fchip ${isSlideSearchOpen || slideSearchQuery ? "on" : ""}`}
          onClick={() => setIsSlideSearchOpen(!isSlideSearchOpen)}
          title="بحث وتصفية في السلايدات الحالية"
        >
          <Icons.Search size={12} />
          <span>بحث</span>
          {slideSearchQuery && <span style={{ opacity: 0.85, marginInlineStart: 4 }}>({currentSlides.length})</span>}
        </button>

        {onToggleAutoTranslate && (
          <button
            type="button"
            className={`fchip ${autoTranslate ? "on" : ""}`}
            onClick={onToggleAutoTranslate}
            title="تبديل إظهار الترجمة العربية لكافة السلايدات"
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
            title="تبديل إظهار الشروح والوقفات الامتحانية لكافة السلايدات"
          >
            <Icons.Tip size={12} />
            <span>شرح الكل</span>
          </button>
        )}
      </div>

      {/* شريط البحث الموحد الأنيق للسلايدات مع نطاق البحث في كامل المقرر أو المحاضرة */}
      {(isSlideSearchOpen || slideSearchQuery) && (
        <div className="unified-search-box">
          <Icons.Search size={16} style={{ color: "var(--acc)", flexShrink: 0 }} />
          <input
            type="search"
            placeholder="ابحث في عناوين السلايدات أو النصوص أو الشروح..."
            value={slideSearchQuery}
            onChange={(e) => setSlideSearchQuery(e.target.value)}
            autoFocus
            aria-label="البحث في السلايدات"
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
                title="البحث في كافة شرائح المقرر دون التقيد بالمحاضرة الحالية"
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
                title={`البحث في المحاضرة المحددة فقط (${activeLecture.id})`}
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

      {/* شريط المحاضرات الانسيابي الأفقي بسحب ناعم بدون تكدس (Single-row Swipeable Strip) */}
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
            <Icons.Slides size={34} />
          </div>
          <div className="pb-t">لا توجد شرائح متوفرة حالياً لهذه المحاضرة</div>
        </div>
      ) : (
        /* شبكة السلايدات الأصيلة (#cards) */
        <div id="cards">
          {renderedSlides.map((slide) => {
            const isTargeted = targetSlideRef === slide.ref;
            const isSeen = seenSlides.has(slide.ref);
            const showAr = isArShown(slide.ref);
            const showEx = isExShown(slide.ref);

            return (
              <article
                key={slide.ref}
                id={`slide-${slide.ref}`}
                data-ref={slide.ref}
                className={`slide-card reveal in ${isSeen ? "seen" : ""} ${isTargeted ? "flash targeted" : ""}`}
              >
                {/* رأس بطاقة السلايد */}
                <div className="sc-head">
                  <span className="sc-ref" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>{slide.ref}</span>
                    {isSearching && slideSearchScope === "all" && slide.lecture_id && (
                      <span style={{ fontSize: "0.66rem", padding: "1px 6px", borderRadius: "var(--r-pill)", background: "color-mix(in srgb, var(--acc) 18%, transparent)", color: "var(--acc)", fontWeight: 800 }}>
                        {slide.lecture_id}
                      </span>
                    )}
                  </span>
                  <span className="sc-title" title={slide.title || slide.content_en || slide.ref}>
                    {slide.title || slide.content_en || `شريحة ${slide.slide_num}`}
                  </span>
                  <div className="sc-actions">
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
                          onToggleSeenSlide(slide.ref);
                        }}
                        title={isSeen ? "تمت المراجعة (انقر للإلغاء)" : "تحديد كمراجعة"}
                      >
                        <Icons.Check size={12} />
                        <span>راجعت</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="mini share-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopySlideLink(slide.ref);
                      }}
                      title="نسخ رابط مباشر لهذه الشريحة"
                    >
                      <Icons.Share size={12} />
                      <span>{copiedSlideRef === slide.ref ? "تم النسخ" : "رابط"}</span>
                    </button>
                  </div>
                </div>

                {/* صورة الشريحة محتواة بنسبة 16 / 9 مع زر التكبير */}
                <div
                  className="sc-imgwrap"
                  onClick={() => handleOpenSlide(slide)}
                >
                  {slide.image_url ? (
                    <img
                      src={resolveAssetUrl(slide.image_url)}
                      alt={slide.ref}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div style={{ height: "100%", minHeight: 180, display: "grid", placeItems: "center", background: "var(--sf2)", color: "var(--ink-m)", fontFamily: "var(--fm)", fontSize: "1.1rem" }}>
                      <span>{slide.ref}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="zoom-btn"
                    title="تكبير الصورة في اللايت بوكس"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSlide(slide);
                    }}
                  >
                    <Icons.Maximize size={13} />
                    <span>تكبير</span>
                  </button>
                </div>

                {/* متن الشريحة: الترجمة والشرح */}
                <div className="sc-body">
                  {/* لوحة الترجمة العربية */}
                  <div className={`ar-panel ${showAr ? "show" : ""}`}>
                    <div className="ex-head" style={{ color: "var(--acc)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Icons.Translate size={14} />
                      <span>الترجمة العربية</span>
                    </div>
                    {slide.content_ar ? (
                      <div className="ar-body" style={{ marginTop: "8px", fontSize: "0.88rem", lineHeight: 1.7, color: "var(--ink)" }}>
                        {slide.content_ar.split("\n").filter(Boolean).map((line, idx) => (
                          <p key={idx} style={{ marginBottom: "6px" }}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="ph" style={{ color: "var(--ink-m)", fontSize: "0.8rem", fontStyle: "italic", marginTop: "4px" }}>
                        لا توجد ترجمة نصية لهذه الشريحة
                      </div>
                    )}
                  </div>

                  {/* لوحة الشرح التعليمي والوقفة الامتحانية */}
                  <div className={`ex-panel ${showEx ? "show" : ""}`}>
                    <div className="ex-head" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Icons.Tip size={14} />
                      <span>الشرح التعليمي والوقفة الامتحانية</span>
                    </div>
                    {slide.notes_ar ? (
                      <div className="ex-body" style={{ marginTop: "8px", fontSize: "0.88rem", lineHeight: 1.7, color: "var(--ink)" }}>
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
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* نافذة اللايت بوكس المنبثقة بالزوم اليدوي الدائم */}
      <LightboxModal
        isOpen={lightboxOpen}
        slides={currentSlides}
        currentIndex={currentSlideIndex}
        onClose={handleCloseLightbox}
        onNavigate={setCurrentSlideIndex}
      />
    </div>
  );
};

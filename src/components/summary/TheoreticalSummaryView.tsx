// ==============================================================================
// المنصة التعليمية الموحدة — الملخص النظري الشامل (Authentic Summary)
// Supports p · list · table · warn · tip · formula blocks, per-block interactive
// links, slide refs, full-text search and review progress. Zero Emojis.
// ==============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import { useFitTables } from "../../lib/useFitTables";
import { matchesNormalizedTerms, sanitizeStudyHtml } from "../../lib/textUtils";
import type { InteractiveLink, SummaryBlock, TheoreticalSummaryData } from "../../types";

interface TheoreticalSummaryViewProps {
  data?: TheoreticalSummaryData;
  reviewedParts?: string[];
  onToggleReviewed?: (partId: string) => void;
  activeLectureId?: string;
  onSelectLecture?: (lectureId: string) => void;
  onJumpToInteractive: (studioId: string, tabId?: string) => void;
  onJumpToSlide: (ref: string) => void;
}

const SLIDE_REF_PATTERN = /\b(?:L\d+[-_])?S\d{1,3}\b/gi;

function renderWithRefs(text: string, onJumpToSlide: (ref: string) => void) {
  if (!text) return null;
  const parts = String(text).split(SLIDE_REF_PATTERN);
  const refs = String(text).match(SLIDE_REF_PATTERN) || [];
  if (refs.length === 0) return text;
  return parts.map((part, index) => (
    <React.Fragment key={index}>
      {part}
      {refs[index] && (
        <button
          type="button"
          className="ref-chip inline-slide-ref"
          onClick={() => onJumpToSlide(refs[index])}
        >
          {refs[index]}
        </button>
      )}
    </React.Fragment>
  ));
}

function asInteractiveList(value?: InteractiveLink | InteractiveLink[]): InteractiveLink[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function blockText(block: SummaryBlock): string {
  return [
    block.kind || "",
    block.head || "",
    block.title || "",
    block.body || "",
    ...(block.items || []),
    ...((block.rows || []).flatMap((row) => row)),
    ...(block.refs || []),
    block.callout || ""
  ]
    .join(" ")
    .toLowerCase();
}

export const TheoreticalSummaryView: React.FC<TheoreticalSummaryViewProps> = ({
  data,
  reviewedParts = [],
  onToggleReviewed,
  activeLectureId,
  onSelectLecture,
  onJumpToInteractive,
  onJumpToSlide
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activePart, setActivePart] = useState<string>(
    activeLectureId && activeLectureId !== "all" ? activeLectureId : "all"
  );

  const parts = data?.parts || [];

  // الشرح والملخص النظري متواصل بالكامل (للهاتف والحاسوب) — التصفية تتم فقط عند الكتابة في مربع البحث
  const filteredParts = useMemo(() => {
    const hasQuery = Boolean(query.trim());
    if (!hasQuery) return parts;
    return parts
      .map((part) => {
        const blocks = part.blocks.filter((block) =>
          matchesNormalizedTerms([part.title, part.lec, blockText(block)].join(" "), query)
        );
        return { ...part, blocks };
      })
      .filter((part) => part.blocks.length > 0);
  }, [parts, query]);

  const scrollToSummaryPart = (lecId: string) => {
    setActivePart(lecId);
    onSelectLecture?.(lecId);
    if (lecId === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (query.trim()) setQuery("");
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`part-${lecId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.remove("focus-glow");
        void el.offsetWidth;
        el.classList.add("focus-glow");
        window.setTimeout(() => el.classList.remove("focus-glow"), 1400);
      }
    });
  };

  useEffect(() => {
    setActivePart(activeLectureId && activeLectureId !== "all" ? activeLectureId : "all");
  }, [activeLectureId]);

  // تتبع الفصل الظاهر حالياً أثناء التمرير المتواصل (Scroll-Spy)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || filteredParts.length === 0) return;
    const sections = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>("section.part[id^='part-']") || []
    );
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          const lec = visible[0].target.id.replace(/^part-/, "");
          if (lec) setActivePart(lec);
        }
      },
      { rootMargin: "-15% 0px -65% 0px", threshold: 0.01 }
    );
    sections.forEach((sec) => io.observe(sec));
    return () => io.disconnect();
  }, [filteredParts]);

  useFitTables(containerRef, [filteredParts]);

  if (!data || parts.length === 0) {
    return (
      <div className="pending-box" style={{ margin: "40px auto", maxWidth: 600 }}>
        <div className="pb-ic"><Icons.Summary size={34} /></div>
        <div className="pb-t">الملخص النظري غير متوفر حالياً لهذه المادة</div>
        <div className="pb-s">سيتم إدراجه فور اعتماده رسمياً من مدرس المقرر</div>
      </div>
    );
  }

  const reviewedCount = parts.filter((part) => reviewedParts.includes(part.lec)).length;
  const progressPct = Math.round((reviewedCount / parts.length) * 100);

  const renderBlock = (blk: SummaryBlock, bIdx: number) => {
    const interactiveLinks = asInteractiveList(blk.interactive);
    const kind = blk.kind || "p";

    return (
      <div key={bIdx} className={`blk ${kind}`}>
        {(blk.head || blk.title) && <h3 className="blk-title">{blk.head || blk.title}</h3>}

        {kind === "table" && blk.table_head && blk.rows ? (
          <div className="tbl-wrap">
            <div className="tbl-scale">
              <table className="tbl summary-tbl">
                <thead>
                  <tr>
                    {blk.table_head.map((head, hIdx) => (
                      <th key={hIdx}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blk.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} data-label={blk.table_head?.[cIdx] || ""}>
                          {renderWithRefs(String(cell), onJumpToSlide)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : kind === "list" && blk.items && blk.items.length > 0 ? (
          <ul className="blk-list">
            {blk.items.map((item, iIdx) => (
              <li key={iIdx}>{renderWithRefs(item, onJumpToSlide)}</li>
            ))}
          </ul>
        ) : kind === "formula" ? (
          <div className="f" dir="ltr">{blk.body}</div>
        ) : kind === "warn" || kind === "tip" ? (
          <div className="wt">
            {kind === "warn" ? <Icons.Warning size={15} /> : <Icons.Tip size={15} />}
            <div>{renderWithRefs(blk.body, onJumpToSlide)}</div>
          </div>
        ) : (
          blk.body && (
            <div
              className="blk-text"
              dangerouslySetInnerHTML={{ __html: sanitizeStudyHtml(String(blk.body).replace(/\n/g, "<br/>")) }}
            />
          )
        )}

        {blk.callout && <div className="blk-callout">{blk.callout}</div>}

        {(interactiveLinks.length > 0 || (blk.refs && blk.refs.length > 0)) && (
          <div className="blk-links">
            {interactiveLinks.map((link, lIdx) => (
              <button
                key={`int-${lIdx}`}
                type="button"
                className="ref-chip int-chip"
                onClick={() => onJumpToInteractive(link.id, link.tab)}
                title="الانتقال إلى المحاكي التفاعلي المرتبط"
              >
                <Icons.Interactive size={13} />
                <span>{link.label || "الشرح التفاعلي"}</span>
              </button>
            ))}
            {Array.from(new Set(blk.refs || [])).map((sRef) => (
              <button
                key={sRef}
                type="button"
                className="ref-chip"
                onClick={() => onJumpToSlide(sRef)}
                title={`معاينة شريحة ${sRef}`}
              >
                <Icons.Slides size={12} />
                <span>{sRef}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="summaryView" ref={containerRef}>
      <div className="headline">
        <div className="kicker">
          <span className="dot" />
          <span>الملخص النظري الشامل</span>
        </div>
        <h1>{data.title_ar}</h1>
        {data.sub_ar && <p className="sub">{data.sub_ar}</p>}
      </div>

      <div className="em-progress">
        <div className="em-progress-text">
          <span>أجزاء الملخص المنجزة</span>
          <b>{reviewedCount} / {parts.length}</b>
        </div>
        <div className="em-progress-bar"><span style={{ width: `${progressPct}%` }} /></div>
      </div>

      <div className="def-toolbar">
        <div className="def-search">
          <Icons.Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الملخص النظري، الجداول، القوائم والملاحظات..."
            aria-label="بحث الملخص"
          />
          {query && (
            <button type="button" className="def-search-clear" onClick={() => setQuery("")} aria-label="مسح البحث">
              <Icons.Cross size={15} />
            </button>
          )}
        </div>
        <span className="def-result-count">
          الأجزاء المعروضة: <b>{filteredParts.length}</b> من {parts.length}
        </span>
      </div>

      <div className="fchips summary-chips summary-jump-strip" aria-label="الانتقال السريع بين الفصول">
        <button
          type="button"
          className={`fchip ${activePart === "all" ? "on" : ""}`}
          onClick={() => scrollToSummaryPart("all")}
        >
          البداية ({parts.length})
        </button>
        {parts.map((part) => (
          <button
            key={part.lec}
            type="button"
            className={`fchip ${activePart === part.lec ? "on" : ""}`}
            onClick={() => scrollToSummaryPart(part.lec)}
            title={part.title}
          >
            {part.lec} {reviewedParts.includes(part.lec) ? "· تمت" : ""}
          </button>
        ))}
      </div>

      <div className="summary-parts">
        {filteredParts.map((p, idx) => {
          const isReviewed = reviewedParts.includes(p.lec);
          return (
            <section key={p.lec || idx} className="part" id={`part-${p.lec}`}>
              <div className="part-head">
                <span className="lec-badge">{p.lec}</span>
                <h2 className="part-title">{p.title}</h2>

                {p.interactive && (
                  <button
                    type="button"
                    className="ref-chip int-chip"
                    onClick={() => onJumpToInteractive(p.interactive!.id, p.interactive!.tab)}
                    title="الانتقال إلى المحاكي التفاعلي المرتبط"
                  >
                    <Icons.Interactive size={14} />
                    <span>{p.interactive.label || "الشرح التفاعلي"}</span>
                  </button>
                )}

                {onToggleReviewed && (
                  <button
                    type="button"
                    className={`read-btn ${isReviewed ? "on" : ""}`}
                    onClick={() => onToggleReviewed(p.lec)}
                    title={isReviewed ? "إلغاء تعليم الجزء" : "تعليم الجزء كمقروء"}
                  >
                    <Icons.Check size={13} />
                    <span>{isReviewed ? "تمت المراجعة" : "علّم كمقروء"}</span>
                  </button>
                )}
              </div>

              <div className="part-body">
                {p.blocks.map(renderBlock)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};


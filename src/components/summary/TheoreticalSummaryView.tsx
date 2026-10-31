// ==============================================================================
// المنصة التعليمية الموحدة — الملخص النظري الشامل (Authentic Summary)
// Supports p · list · table · warn · tip · formula blocks, per-block interactive
// links, slide refs, full-text search and review progress. Zero Emojis.
// ==============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Icons } from "../icons/SvgIcons";
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
  const [query, setQuery] = useState("");
  const [activePart, setActivePart] = useState<string>(
    activeLectureId && activeLectureId !== "all" ? activeLectureId : "all"
  );

  useEffect(() => {
    setActivePart(activeLectureId && activeLectureId !== "all" ? activeLectureId : "all");
  }, [activeLectureId]);

  const parts = data?.parts || [];

  const filteredParts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts
      .filter((part) => activePart === "all" || part.lec === activePart)
      .map((part) => {
        if (!q) return part;
        const blocks = part.blocks.filter((block) =>
          [part.title, part.lec, blockText(block)].join(" ").toLowerCase().includes(q)
        );
        return { ...part, blocks };
      })
      .filter((part) => !q || part.blocks.length > 0);
  }, [parts, query, activePart]);

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
              dangerouslySetInnerHTML={{ __html: String(blk.body).replace(/\n/g, "<br/>") }}
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
    <div id="summaryView">
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

      <div className="fchips summary-chips">
        <button
          type="button"
          className={`fchip ${activePart === "all" ? "on" : ""}`}
          onClick={() => {
            setActivePart("all");
            onSelectLecture?.("all");
          }}
        >
          كل المحاضرات
        </button>
        {parts.map((part) => (
          <button
            key={part.lec}
            type="button"
            className={`fchip ${activePart === part.lec ? "on" : ""}`}
            onClick={() => {
              setActivePart(part.lec);
              onSelectLecture?.(part.lec);
            }}
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


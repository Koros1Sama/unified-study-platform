// ==============================================================================
// المنصة التعليمية الموحدة — قسم «ملخص الملخص» (80/20 Cram System)
// Union renderer: capsules · table · traps_grid · shortcuts · cram widget ·
// cards · tf_list · timeline. Search, doctor tips, review marks. Zero Emojis.
// ==============================================================================

import React, { useMemo, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import { CramInteractiveWidget } from "./CramInteractiveWidget";
import type {
  SummaryOfSummaryData,
  SummaryOfSummarySection,
  TfTrapItem
} from "../../types";

interface SummaryOfSummaryViewProps {
  data?: SummaryOfSummaryData;
  reviewedSections?: string[];
  onToggleReviewed?: (sectionId: string) => void;
  onJumpToSlide: (ref: string) => void;
}

const SLIDE_REF_PATTERN = /\b(?:L\d+[-_])?S\d{1,3}\b/gi;

/** يحوّل أي إشارة شريحة داخل نص الخلية إلى زر قفز حقيقي. */
function renderWithSlideRefs(text: string, onJumpToSlide: (ref: string) => void) {
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
          className="ref-chip em-inline-ref"
          onClick={() => onJumpToSlide(refs[index])}
          title={`الانتقال إلى شريحة ${refs[index]}`}
        >
          {refs[index]}
        </button>
      )}
    </React.Fragment>
  ));
}

function sectionSearchBlob(section: SummaryOfSummarySection): string {
  const values: string[] = [section.title, section.nav_title, section.badge || "", section.desc || ""];
  const push = (value: unknown) => {
    if (typeof value === "string") values.push(value);
    else if (Array.isArray(value)) value.forEach(push);
    else if (value && typeof value === "object") Object.values(value).forEach(push);
  };
  push(section);
  return values.join(" ").toLowerCase();
}

export const SummaryOfSummaryView: React.FC<SummaryOfSummaryViewProps> = ({
  data,
  reviewedSections = [],
  onToggleReviewed,
  onJumpToSlide
}) => {
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showTips, setShowTips] = useState(true);

  const sections = data?.sections || [];

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections.filter((section) => {
      if (selectedSectionFilter !== "all" && section.id !== selectedSectionFilter) return false;
      if (!q) return true;
      return sectionSearchBlob(section).includes(q);
    });
  }, [sections, selectedSectionFilter, query]);

  if (!data || sections.length === 0) {
    return (
      <div className="pending-box" style={{ margin: "40px auto", maxWidth: 600 }}>
        <div className="pb-ic">
          <Icons.Emergency size={34} />
        </div>
        <div className="pb-t">قسم ملخص الملخص (80/20) غير متوفر حالياً لهذه المادة</div>
        <div className="pb-s">سيتم إعداده قبل الاختبار النهائي لترجيح الـ 20% الأكثر أهمية</div>
      </div>
    );
  }

  const reviewedCount = sections.filter((section) => reviewedSections.includes(section.id)).length;
  const progressPct = Math.round((reviewedCount / sections.length) * 100);

  return (
    <div id="emergencyView">
      <div className="headline">
        <div className="kicker">
          <span className="dot" />
          <span>الزبدة قبل الاختبار بساعة · مراجعة الـ 80/20 الذهبية</span>
        </div>
        <h1 id="emTitle">
          <svg
            className="svg-ic"
            style={{ width: 24, height: 24, marginLeft: 8, verticalAlign: -4 }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {data.title_ar || "ملخص الملخص — خارطة الإنقاذ الطارئ 80/20"}
        </h1>
        {data.sub_ar && <p id="emSub" className="sub">{data.sub_ar}</p>}
      </div>

      {data.doctor_tips && data.doctor_tips.length > 0 && (
        <div className="em-doctips">
          <button
            type="button"
            className="em-doctips-head"
            onClick={() => setShowTips(!showTips)}
            aria-expanded={showTips}
          >
            <Icons.Tip size={16} />
            <span>توجيهات أستاذ المقرر قبل الامتحان ({data.doctor_tips.length})</span>
            <Icons.ChevronDown size={16} className={showTips ? "rot" : ""} />
          </button>
          {showTips && (
            <ul className="em-doctips-list">
              {data.doctor_tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="em-progress">
        <div className="em-progress-text">
          <span>تقدم المراجعة الطارئة</span>
          <b>{reviewedCount} / {sections.length}</b>
        </div>
        <div className="em-progress-bar">
          <span style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="def-toolbar em-toolbar">
        <div className="def-search">
          <Icons.Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الكبسولات، الجداول، الفخاخ، الحل بالعين، وتوجيهات الأستاذ..."
            aria-label="بحث في ملخص الملخص"
          />
          {query && (
            <button type="button" className="def-search-clear" onClick={() => setQuery("")} aria-label="مسح البحث">
              <Icons.Cross size={15} />
            </button>
          )}
        </div>
        <span className="def-result-count">
          الأقسام: <b>{filteredSections.length}</b> من {sections.length}
        </span>
      </div>

      <div className="fchips" id="emergencyChips">
        <button
          type="button"
          className={`fchip ${selectedSectionFilter === "all" ? "on" : ""}`}
          onClick={() => setSelectedSectionFilter("all")}
        >
          الكل (جميع الأجزاء)
        </button>
        {sections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            className={`fchip ${selectedSectionFilter === sec.id ? "on" : ""}`}
            onClick={() => setSelectedSectionFilter(sec.id)}
          >
            {sec.nav_title || sec.title}
          </button>
        ))}
      </div>

      <div id="emergencyParts" className="emergency-parts">
        {filteredSections.length === 0 && (
          <div className="pending-box">
            <div className="pb-ic"><Icons.Search size={30} /></div>
            <div className="pb-t">لا توجد أقسام تطابق بحثك</div>
          </div>
        )}

        {filteredSections.map((sec) => {
          const isReviewed = reviewedSections.includes(sec.id);
          return (
            <section key={sec.id} id={sec.id} className={`em-card ${isReviewed ? "is-reviewed" : ""}`}>
              <div className="em-head">
                <h2 className="em-title">{sec.title}</h2>
                {sec.badge && <span className="em-badge">{sec.badge}</span>}
                {onToggleReviewed && (
                  <button
                    type="button"
                    className={`read-btn em-read-btn ${isReviewed ? "on" : ""}`}
                    onClick={() => onToggleReviewed(sec.id)}
                    title={isReviewed ? "إلغاء تعليم القسم كمراجَع" : "تعليم القسم كمراجَع"}
                  >
                    <Icons.Check size={13} />
                    <span>{isReviewed ? "تمت المراجعة" : "علّم كمراجَع"}</span>
                  </button>
                )}
              </div>

              {sec.desc && <p className="em-desc">{sec.desc}</p>}

              {sec.type === "capsules" && sec.capsules && (
                <div className="em-capsules-list">
                  {sec.capsules.map((cap) => (
                    <div key={cap.id} className="em-capsule" id={cap.id}>
                      <div className="em-cap-head">
                        <div className="em-cap-head-main">
                          <span className="em-cap-lec">{cap.lec}</span>
                          <h3 className="em-cap-title">{cap.title}</h3>
                        </div>
                        {cap.refs && cap.refs.length > 0 && (
                          <div className="em-cap-refs">
                            {Array.from(new Set(cap.refs)).map((r) => (
                              <button
                                key={r}
                                type="button"
                                className="ref-chip"
                                onClick={() => onJumpToSlide(r)}
                                title={`الانتقال إلى شريحة ${r}`}
                              >
                                <span>{`→ ${r}`}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="em-cap-body">
                        {(cap.groups || []).map((grp, gIdx) => (
                          <div key={gIdx} className="em-grp">
                            {grp.subtitle && <h4 className="em-grp-title">{grp.subtitle}</h4>}
                            <div className={`em-grp-grid ${grp.layout || "cols-2"}`}>
                              {(grp.items || []).map((item, itIdx) => (
                                <div key={itIdx} className="em-subcard">
                                  {item.head && <div className="em-sub-head">{item.head}</div>}
                                  {item.math && <div className="em-sub-math" dir="ltr">{item.math}</div>}
                                  {item.body && (
                                    <div
                                      className="em-sub-body"
                                      dangerouslySetInnerHTML={{ __html: item.body }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sec.type === "table" && sec.head && sec.rows && (
                <>
                  <div className="em-table-wrap">
                    <table className="em-table">
                      <thead>
                        <tr>
                          {sec.head.map((h, hIdx) => (
                            <th key={hIdx}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sec.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => {
                              const content = String(cell);
                              const isCode = /^[A-Za-z0-9_^{}()[\]|*+?.,<>=·\s-]+$/.test(content) && /[A-Za-z]/.test(content) && cIdx > 0;
                              return (
                                <td key={cIdx}>
                                  {isCode ? (
                                    <code className="m-ltr" dir="ltr">{content}</code>
                                  ) : (
                                    renderWithSlideRefs(content, onJumpToSlide)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sec.callout && (
                    <div className="em-callout">
                      <div className="em-callout-title">{sec.callout.title}</div>
                      <div className="em-callout-math" dir="ltr">{sec.callout.math}</div>
                      <div className="em-callout-body">{sec.callout.body}</div>
                    </div>
                  )}
                </>
              )}

              {sec.type === "traps_grid" && sec.traps && (
                <div className="em-traps-grid">
                  {sec.traps.map((trp, tIdx) => (
                    <div key={tIdx} className="em-trap-card">
                      <div className="em-trap-head">
                        <span className="em-trap-num">{trp.num}</span>
                        <h3 className="em-trap-title">{trp.title}</h3>
                      </div>
                      {trp.math && <div className="em-trap-math" dir="ltr">{trp.math}</div>}
                      <ul className="em-trap-list">
                        {(trp.points || []).map((pt, pIdx) => (
                          <li key={pIdx} dangerouslySetInnerHTML={{ __html: pt }} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {sec.type === "shortcuts" && sec.shortcuts && (
                <div className="em-shortcuts-list">
                  {sec.shortcuts.map((sc, sIdx) => (
                    <div key={sIdx} className="em-sc-card">
                      <div className="em-sc-head">
                        <span className="em-sc-badge">{sc.num}</span>
                        <h3 className="em-sc-prob">{sc.problem}</h3>
                      </div>
                      <div className="em-sc-rule">{sc.rule}</div>
                      {sc.example_math && (
                        <div className="em-sc-ex-bar">
                          <span className="em-sc-ex-lbl">{sc.example_title || "المثال:"}</span>
                          <span className="em-sc-ex-math" dir="ltr">{sc.example_math}</span>
                        </div>
                      )}
                      <ol className="em-sc-steps">
                        {(sc.steps || []).map((st, stepIdx) => (
                          <li key={stepIdx} dangerouslySetInnerHTML={{ __html: st }} />
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}

              {sec.type === "cards" && sec.cards && (
                <div className="em-cards-grid">
                  {sec.cards.map((card, cIdx) => (
                    <div key={cIdx} className="em-rule-card">
                      <div className="em-rule-head">
                        {card.num && <span className="em-rule-num">{card.num}</span>}
                        <h3 className="em-rule-title">{card.title}</h3>
                      </div>
                      {card.math && <div className="em-sub-math" dir="ltr">{card.math}</div>}
                      <div className="em-rule-body">{card.body}</div>
                    </div>
                  ))}
                </div>
              )}

              {sec.type === "tf_list" && sec.items && (
                <div className="em-tf-list">
                  {sec.items.map((item: TfTrapItem) => (
                    <div
                      key={item.n}
                      className={`em-tf-item ${item.is_true ? "is-true" : "is-false"}`}
                    >
                      <div className="em-tf-header">
                        <span className="em-tf-num">{item.n}</span>
                        <span className={`em-tf-verdict ${item.is_true ? "true" : "false"}`}>
                          {item.verdict || (item.is_true ? "صواب" : "خطأ")}
                        </span>
                        {item.ref && (
                          <button
                            type="button"
                            className="ref-chip em-ref-link"
                            onClick={() => onJumpToSlide(item.ref!)}
                          >
                            {item.ref}
                          </button>
                        )}
                      </div>
                      <div className="em-tf-statement">{item.statement}</div>
                      <div className="em-tf-trap"><strong>الفخ: </strong>{item.trap}</div>
                      <div className="em-tf-rule"><strong>القاعدة: </strong>{item.rule}</div>
                    </div>
                  ))}
                </div>
              )}

              {sec.type === "timeline" && sec.steps && (
                <div className="em-timeline">
                  {sec.steps.map((step, stIdx) => (
                    <div key={stIdx} className="em-step">
                      <div className="em-step-head">
                        <span className="em-step-time">{step.time}</span>
                        <span className="em-step-target">{step.target}</span>
                      </div>
                      <div className="em-step-detail">{step.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              {sec.type === "interactive_cram_widget" && (
                <CramInteractiveWidget
                  models={sec.models || []}
                  questions={sec.questions || []}
                />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};


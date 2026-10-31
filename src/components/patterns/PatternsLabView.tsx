// ==============================================================================
// المنصة التعليمية الموحدة — مختبر أنماط الحل وحسم الاختيارات (Pattern Lab)
// Extracted from RM_Viewer algo_patterns: rules, triggers, accuracy, cases,
// and out-of-pattern exceptions. Zero Emojis.
// ==============================================================================

import React, { useMemo, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import type { QuestionPatternsData, PatternCase } from "../../types";

interface PatternsLabViewProps {
  data?: QuestionPatternsData;
  subjectCode: string;
  onJumpToQuestion?: (id: string) => void;
}

function parseAccuracy(value?: string): number | null {
  if (!value) return null;
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Math.min(100, Number(match[1])) : null;
}

export const PatternsLabView: React.FC<PatternsLabViewProps> = ({
  data,
  subjectCode,
  onJumpToQuestion
}) => {
  const [query, setQuery] = useState("");
  const [openRule, setOpenRule] = useState<string | null>(data?.rules?.[0]?.id || null);
  const [showExceptions, setShowExceptions] = useState<Record<string, boolean>>({});

  const rules = data?.rules || [];
  const totalCases = useMemo(
    () => rules.reduce((sum, rule) => sum + (rule.cases?.length || 0), 0),
    [rules]
  );
  const totalExceptions = useMemo(
    () => rules.reduce((sum, rule) => sum + (rule.exceptions?.length || 0), 0),
    [rules]
  );

  const filterCases = (cases?: PatternCase[]) => {
    if (!cases) return [];
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((item) =>
      [item.q, item.q_ar, item.ans, item.ans_ar, item.note, item.trigger_word, item.m]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  };

  if (rules.length === 0) {
    return (
      <div className="pending-box" style={{ margin: "40px auto", maxWidth: 620 }}>
        <div className="pb-ic"><Icons.Patterns size={34} /></div>
        <div className="pb-t">مختبر أنماط الحل غير متوفر لهذه المادة</div>
        <div className="pb-s">
          يُبنى هذا القسم من تحليل إحصائي كامل لبنك الأسئلة الرسمي، ويتوفر حالياً لمنهجية البحث العلمي.
        </div>
      </div>
    );
  }

  return (
    <div id="patternsView" className="pat-view">
      <div className="headline">
        <div className="kicker">
          <span className="dot" />
          <span>قواعد الحسم السريع المستخرجة من البنك الرسمي</span>
        </div>
        <h1>{data?.title_ar || "مختبر أنماط الحل"}</h1>
        <p className="sub">
          {data?.sub_ar || "قواعد إحصائية مع نسبة دقة كل قاعدة واستثناءاتها، لتحسم الاختيار في ثوانٍ."}
        </p>
      </div>

      <div className="pat-hero-stats">
        <div className="def-stat"><b>{rules.length}</b><span>قاعدة حسم</span></div>
        <div className="def-stat"><b>{totalCases}</b><span>حالة موثقة</span></div>
        <div className="def-stat"><b>{totalExceptions}</b><span>استثناء محفوظ</span></div>
        <div className="def-stat"><b>{totalCases + totalExceptions}</b><span>نقطة مراجعة</span></div>
      </div>

      <div className="def-toolbar">
        <div className="def-search">
          <Icons.Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في الحالات، الكلمات المحفزة، أمثلة النمط..."
            aria-label="بحث الأنماط"
          />
          {query && (
            <button type="button" className="def-search-clear" onClick={() => setQuery("")} aria-label="مسح البحث">
              <Icons.Cross size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="pat-rules">
        {rules.map((rule) => {
          const accuracy = parseAccuracy(rule.accuracy);
          const cases = filterCases(rule.cases);
          const exceptions = filterCases(rule.exceptions);
          const isOpen = openRule === rule.id;
          const isExceptionOpen = Boolean(showExceptions[rule.id]);

          return (
            <section key={rule.id} className={`pat-rule ${isOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="pat-rule-head"
                onClick={() => setOpenRule(isOpen ? null : rule.id)}
                aria-expanded={isOpen}
              >
                <span className="pat-rule-num">{rule.id.toUpperCase()}</span>
                <span className="pat-rule-headText">
                  <span className="pat-rule-title">{rule.title}</span>
                  {rule.subtitle && <span className="pat-rule-sub">{rule.subtitle}</span>}
                </span>
                <span className="pat-rule-meta">
                  {typeof rule.total === "number" && <span className="pat-chip">{rule.total} حالة</span>}
                  {accuracy !== null && (
                    <span className="pat-acc-wrap" title={`دقة القاعدة: ${rule.accuracy}`}>
                      <span className="pat-acc-bar">
                        <span style={{ width: `${accuracy}%` }} />
                      </span>
                      <b>{rule.accuracy}</b>
                    </span>
                  )}
                  <Icons.ChevronDown size={18} className={isOpen ? "rot" : ""} />
                </span>
              </button>

              {isOpen && (
                <div className="pat-rule-body">
                  <div className="pat-rule-text">{rule.rule}</div>

                  {rule.trigger && (
                    <div className="pat-trigger">
                      <Icons.Target size={14} />
                      <span>الكلمات المحفزة: </span>
                      <code className="m-ltr">{rule.trigger}</code>
                    </div>
                  )}

                  {cases.length > 0 && (
                    <div className="pat-case-block">
                      <div className="pat-case-title">
                        <Icons.List size={14} />
                        <span>حالات النمط المطابقة ({cases.length})</span>
                      </div>
                      <div className="pat-table-wrap">
                        <table className="tbl pat-table">
                          <thead>
                            <tr>
                              <th>النموذج</th>
                              <th>#</th>
                              <th>نص السؤال</th>
                              <th>الإجابة</th>
                              <th>ملاحظة الحسم</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cases.map((item, idx) => (
                              <tr key={`${rule.id}-case-${idx}`}>
                                <td><span className="pat-model">{item.m.toUpperCase()}</span></td>
                                <td>
                                  {onJumpToQuestion ? (
                                    <button
                                      type="button"
                                      className="ref-chip"
                                      onClick={() => onJumpToQuestion(`${subjectCode}:${item.m}:${item.n}`)}
                                    >
                                      {item.n}
                                    </button>
                                  ) : (
                                    item.n
                                  )}
                                </td>
                                <td className="pat-q">
                                  <div dir="ltr">{item.q}</div>
                                  {item.q_ar && <div className="pat-q-ar">{item.q_ar}</div>}
                                </td>
                                <td>
                                  <span className="pat-ans">{item.ans}</span>
                                  {item.ans_letter && <span className="pat-letter">{item.ans_letter}</span>}
                                </td>
                                <td className="pat-note">{item.note || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {exceptions.length > 0 && (
                    <div className="pat-case-block pat-exceptions">
                      <button
                        type="button"
                        className="pat-exc-toggle"
                        onClick={() =>
                          setShowExceptions((prev) => ({ ...prev, [rule.id]: !prev[rule.id] }))
                        }
                      >
                        <Icons.Warning size={14} />
                        <span>
                          {isExceptionOpen ? "إخفاء الاستثناءات" : "عرض الاستثناءات التي تخالف القاعدة"}
                          {" "}({exceptions.length})
                        </span>
                      </button>

                      {isExceptionOpen && (
                        <div className="pat-table-wrap">
                          <table className="tbl pat-table">
                            <thead>
                              <tr>
                                <th>النموذج</th>
                                <th>#</th>
                                <th>نص السؤال</th>
                                <th>إجابة البنك</th>
                                <th>التنبيه</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exceptions.map((item, idx) => (
                                <tr key={`${rule.id}-exc-${idx}`}>
                                  <td><span className="pat-model">{item.m.toUpperCase()}</span></td>
                                  <td>{item.n}</td>
                                  <td className="pat-q">
                                    <div dir="ltr">{item.q}</div>
                                    {item.q_ar && <div className="pat-q-ar">{item.q_ar}</div>}
                                  </td>
                                  <td><span className="pat-ans">{item.ans}</span></td>
                                  <td className="pat-note">{item.note || "استثناء موثق"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

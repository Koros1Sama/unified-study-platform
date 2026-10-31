// ==============================================================================
// المنصة التعليمية الموحدة — مستكشف وباحث بنك الأسئلة المتقدم (Algo Explorer)
// High-Contrast Highlighter · 3 Search Scopes · Dual View Modes · Zero Emojis
// ==============================================================================

import React, { useEffect, useState, useMemo } from "react";
import { Icons } from "../icons/SvgIcons";
import type { UnifiedQuestion } from "../../types";

interface QuestionBankExplorerProps {
  questions: UnifiedQuestion[];
  onJumpToQuestion: (questionId: string) => void;
}

export function highlightSearchText(text: string, term: string): React.ReactNode {
  if (!term.trim() || !text) return text;

  // تقسيم كلمات البحث
  const terms = term.trim().split(/\s+/).filter(Boolean);
  const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(regex);
  const termSet = new Set(terms.map((t) => t.toLowerCase()));

  return parts.map((part, i) =>
    termSet.has(part.toLowerCase()) ? (
      <mark key={i} className="hl-search">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const QuestionBankExplorer: React.FC<QuestionBankExplorerProps> = ({
  questions,
  onJumpToQuestion
}) => {
  const [activeTab, setActiveTab] = useState<"explorer" | "rules">("explorer");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchScope, setSearchScope] = useState<"all" | "q" | "opts">("all");
  const [viewMode, setViewMode] = useState<"full" | "compact">("compact");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [resultLimit, setResultLimit] = useState<number>(60);

  const modelOptions = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.model_id))).sort();
  }, [questions]);

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim() && selectedModel === "all") {
      return questions;
    }

    const term = searchTerm.toLowerCase().trim();
    return questions.filter((q) => {
      if (selectedModel !== "all" && q.model_id !== selectedModel) return false;
      if (!term) return true;

      const qEn = q.question_en.toLowerCase();
      const qAr = q.question_ar ? q.question_ar.toLowerCase() : "";
      const optsEn = q.options_en.join(" ").toLowerCase();
      const optsAr = q.options_ar.join(" ").toLowerCase();

      if (searchScope === "q") {
        return qEn.includes(term) || qAr.includes(term);
      }
      if (searchScope === "opts") {
        return optsEn.includes(term) || optsAr.includes(term);
      }
      return qEn.includes(term) || qAr.includes(term) || optsEn.includes(term) || optsAr.includes(term);
    });
  }, [questions, searchTerm, searchScope, selectedModel]);

  useEffect(() => {
    setResultLimit(60);
  }, [searchTerm, searchScope, selectedModel, viewMode]);

  const visibleResults = useMemo(
    () => filteredResults.slice(0, resultLimit),
    [filteredResults, resultLimit]
  );

  return (
    <div>
      {/* الترويسة وأزرار التبويب المزدوج */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icons.Explorer size={22} />
              <span>مستكشف وباحث بنك الأسئلة المتقدم (Algo Explorer)</span>
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--ink-m)", marginTop: "2px" }}>
              بحث أكاديمي دقيق عبر {questions.length} سؤالاً مع التظليل عالي التباين
            </p>
          </div>

          <div style={{ display: "inline-flex", background: "var(--sf2)", padding: "3px", borderRadius: "var(--r-pill)", border: "1px solid var(--ln)" }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "explorer" ? "btn-primary" : ""}`}
              style={{ borderRadius: "var(--r-pill)", border: "none" }}
              onClick={() => setActiveTab("explorer")}
            >
              مستكشف الأسئلة
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "rules" ? "btn-primary" : ""}`}
              style={{ borderRadius: "var(--r-pill)", border: "none" }}
              onClick={() => setActiveTab("rules")}
            >
              دليل وقواعد الخوارزمية
            </button>
          </div>
        </div>

        {activeTab === "explorer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* حقل البحث ونطاقاته */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, position: "relative", minWidth: "260px" }}>
                <input
                  type="text"
                  placeholder="ابحث بالإنجليزية أو العربية (كلمات مفتاحية، مفاهيم، خيارات)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 42px 10px 16px",
                    borderRadius: "var(--r-pill)",
                    border: "1px solid var(--ln)",
                    background: "var(--sf2)",
                    color: "var(--ink)",
                    fontSize: "0.92rem",
                    outline: "none",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                    transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--acc)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--acc) 18%, transparent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--ln)";
                    e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";
                  }}
                />
                <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--ink-m)" }}>
                  <Icons.Search size={18} />
                </span>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-m)", cursor: "pointer" }}
                  >
                    <Icons.Cross size={16} />
                  </button>
                )}
              </div>

              {/* نطاق البحث: الكل / السؤال / الخيارات */}
              <div style={{ display: "inline-flex", background: "var(--sf2)", padding: "3px", borderRadius: "var(--r-pill)", border: "1px solid var(--ln)" }}>
                {[
                  { id: "all" as const, label: "كامل السؤال والخيارات" },
                  { id: "q" as const, label: "نص السؤال فقط" },
                  { id: "opts" as const, label: "الخيارات فقط" }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`btn btn-sm ${searchScope === s.id ? "btn-primary" : ""}`}
                    style={{ borderRadius: "var(--r-pill)", border: "none", padding: "4px 10px" }}
                    onClick={() => setSearchScope(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* شريط الإحصائيات وأوضاع العرض */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid var(--ln-s)", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.86rem", color: "var(--ink-m)" }}>
                <span>
                  النتائج المطابقة: <strong style={{ color: "var(--acc)" }}>{filteredResults.length}</strong>
                </span>

                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "var(--r-pill)",
                    border: "1px solid var(--ln)",
                    background: "var(--sf2)",
                    color: "var(--ink)",
                    fontSize: "0.84rem",
                    outline: "none",
                    cursor: "pointer",
                    WebkitAppearance: "none",
                    appearance: "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                  }}
                >
                  <option value="all">جميع النماذج</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* أزرار التبديل بين الوضع المدمج والكامل */}
              <div style={{ display: "inline-flex", background: "var(--sf2)", padding: "3px", borderRadius: "var(--r-pill)", border: "1px solid var(--ln)" }}>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === "compact" ? "btn-primary" : ""}`}
                  style={{ borderRadius: "var(--r-pill)", border: "none", padding: "4px 12px" }}
                  onClick={() => setViewMode("compact")}
                  title="الوضع المدمج السريع"
                >
                  <Icons.Grid size={15} />
                  <span>مدمج</span>
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === "full" ? "btn-primary" : ""}`}
                  style={{ borderRadius: "var(--r-pill)", border: "none", padding: "4px 12px" }}
                  onClick={() => setViewMode("full")}
                  title="الوضع الكامل بالتفاصيل"
                >
                  <Icons.List size={15} />
                  <span>كامل</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* تبويب دليل وقواعد الخوارزمية */}
      {activeTab === "rules" && (
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--acc)", marginBottom: "12px" }}>
            قواعد وخوارزمية حل أسئلة الاختيار من متعدد
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.92rem", lineHeight: 1.6 }}>
            <div style={{ background: "var(--sf2)", padding: "14px", borderRadius: "var(--r-l)", border: "1px solid var(--ln)" }}>
              <h4 style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>1. استراتيجية الكلمات المحفزة (Triggers):</h4>
              <p style={{ color: "var(--ink-m)" }}>
                ابحث دائماً عن الكلمات الدالة في نص السؤال (مثل: "finite", "infinite", "deterministic", "memoryless"). هذه الكلمات تحسم الخيار الصحيح خلال 5 ثوانٍ وتلغي المشتتات مباشرة.
              </p>
            </div>
            <div style={{ background: "var(--sf2)", padding: "14px", borderRadius: "var(--r-l)", border: "1px solid var(--ln)" }}>
              <h4 style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>2. تفنيد المشتتات ثنائي الأبعاد:</h4>
              <p style={{ color: "var(--ink-m)" }}>
                لا تكتفِ بمعرفة الإجابة الصحيحة؛ تحقق من علة خطأ كل خيار آخر (why wrong) ومتى يكون هو الصحيح (when correct). هذا يضمن لك تغطية 4 أسئلة محتملة من سؤال واحد.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* عرض نتائج مستكشف الأسئلة */}
      {activeTab === "explorer" && (
        <div>
          {filteredResults.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--ink-m)" }}>
              <p>لم يتم العثور على أي سؤال يطابق عبارة البحث.</p>
            </div>
          ) : viewMode === "compact" ? (
            /* الوضع المدمج (Compact Grid) */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
              {visibleResults.map((q) => (
                <div
                  key={q.id}
                  style={{
                    background: "var(--sf)",
                    border: "1px solid var(--ln)",
                    borderRadius: "var(--r-m)",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ fontSize: "0.76rem", fontWeight: 800, padding: "1px 6px", borderRadius: "var(--r-pill)", background: "var(--acc)", color: "#000" }}>
                        #{q.orig_q_num}
                      </span>
                      <span style={{ fontSize: "0.72rem", padding: "1px 6px", borderRadius: "var(--r-pill)", background: "var(--sf2)", color: "var(--ink-m)", border: "1px solid var(--ln)" }}>
                        {q.model_id.toUpperCase()}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="ref-chip"
                      onClick={() => onJumpToQuestion(q.id)}
                      title="القفز إلى السؤال في البنك"
                    >
                      <Icons.Jump size={12} />
                      <span>انتقال</span>
                    </button>
                  </div>

                  <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--ink)", direction: "ltr", textAlign: "left", lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {highlightSearchText(q.question_en, searchTerm)}
                  </div>

                  {q.question_ar && (
                    <div style={{ fontSize: "0.8rem", color: "var(--ink-m)", lineClamp: 1, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {highlightSearchText(q.question_ar, searchTerm)}
                    </div>
                  )}

                  <div style={{ marginTop: "auto", fontSize: "0.78rem", color: "var(--ok)", background: "var(--ok-g)", padding: "4px 10px", borderRadius: "var(--r-pill)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Icons.Check size={12} />
                    {q.type === "essay" ? (
                      <span>سؤال مقالي — الإجابة النموذجية متاحة في البنك</span>
                    ) : (
                      <span>الصحيح ({String.fromCharCode(65 + q.correct_answer)}): {q.options_en[q.correct_answer]}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* الوضع الكامل (Full View) */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {visibleResults.map((q) => (
                <div
                  key={q.id}
                  className="card"
                  style={{ margin: 0, padding: "16px", border: "1px solid var(--ln)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, padding: "2px 8px", borderRadius: "var(--r-pill)", background: "var(--acc)", color: "#000" }}>
                        #{q.orig_q_num}
                      </span>
                      <span style={{ fontSize: "0.76rem", padding: "2px 6px", borderRadius: "var(--r-pill)", background: "var(--sf2)", color: "var(--ink-m)", border: "1px solid var(--ln)" }}>
                        {q.model_id.toUpperCase()}
                      </span>
                      {q.slide_ref && (
                        <span style={{ fontSize: "0.75rem", color: "var(--acc)" }}>
                          {q.slide_ref}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="ref-chip"
                      onClick={() => onJumpToQuestion(q.id)}
                    >
                      <Icons.Jump size={13} />
                      <span>القفز للبنك</span>
                    </button>
                  </div>

                  <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--ink)", direction: "ltr", textAlign: "left", marginBottom: "4px" }}>
                    {highlightSearchText(q.question_en, searchTerm)}
                  </div>
                  {q.question_ar && (
                    <div style={{ fontSize: "0.88rem", color: "var(--ink-m)", marginBottom: "12px" }}>
                      {highlightSearchText(q.question_ar, searchTerm)}
                    </div>
                  )}

                  {q.type !== "essay" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px", marginBottom: "10px" }}>
                    {q.options_en.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correct_answer;
                      return (
                        <div
                          key={oIdx}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "var(--r-m)",
                            background: isCorrect ? "var(--ok-g)" : "var(--sf2)",
                            border: `1px solid ${isCorrect ? "var(--ok)" : "var(--ln)"}`,
                            color: isCorrect ? "var(--ok)" : "var(--ink)",
                            fontSize: "0.85rem",
                            direction: "ltr",
                            textAlign: "left"
                          }}
                        >
                          <strong>{String.fromCharCode(65 + oIdx)}.</strong> {highlightSearchText(opt, searchTerm)}
                        </div>
                      );
                    })}
                  </div>
                  ) : null}

                  <div style={{ fontSize: "0.84rem", color: "var(--ink-m)", borderTop: "1px solid var(--ln-s)", paddingTop: "8px" }}>
                    <strong style={{ color: "var(--ok)" }}>{q.type === "essay" ? "الإجابة النموذجية: " : "التعليل: "}</strong>
                    <span>{q.type === "essay" ? (q.essay_answer_ar || q.essay_answer_en || q.why_correct) : q.why_correct}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {filteredResults.length > visibleResults.length && (
            <div className="bank-more">
              <button type="button" className="btn btn-sm" onClick={() => setResultLimit((n) => n + 60)}>
                عرض المزيد من النتائج ({filteredResults.length - visibleResults.length} متبقٍ)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// المنصة التعليمية الموحدة — باحث ومستكشف المحتوى الشامل (Universal Search / Ctrl+K)
// Instant Multi-Module Search · Questions · Slides · Tables · Summary · Definitions
// Keyboard Navigation · Matched Highlighting · Multi-Frame Jump Navigation
// Zero Emojis Standard · 100% SVG Vector Line-Art
// ==============================================================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "../icons/SvgIcons";
import { highlightSearchText, matchesNormalizedTerms } from "../../lib/textUtils";
import type { SubjectBundle } from "../../lib/dataService";

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: SubjectBundle | null;
  onJumpToSlide: (ref: string) => void;
  onJumpToQuestion: (questionId: string) => void;
  onJumpToTable?: (tableId: string) => void;
  onJumpToSummaryPart?: (partId: string) => void;
  onJumpToDefinition?: (defId: string) => void;
  onJumpToEmergency?: () => void;
  onJumpToGlossary?: () => void;
  onJumpToPattern?: () => void;
}

type SearchCategory =
  | "all"
  | "questions"
  | "slides"
  | "tables"
  | "summary"
  | "definitions"
  | "emergency"
  | "glossary"
  | "patterns";

interface SearchResultItem {
  id: string;
  category: Exclude<SearchCategory, "all">;
  categoryLabel: string;
  title: string;
  subtitle: string;
  snippet?: string;
  badge?: string;
  onSelect: () => void;
}

export const highlightText = highlightSearchText;

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  bundle,
  onJumpToSlide,
  onJumpToQuestion,
  onJumpToTable,
  onJumpToSummaryPart,
  onJumpToDefinition,
  onJumpToEmergency,
  onJumpToGlossary,
  onJumpToPattern
}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setCategory("all");
    }
  }, [isOpen]);

  const results = useMemo<SearchResultItem[]>(() => {
    if (!query.trim() || !bundle) return [];

    const matchesAllTerms = (target: string) => matchesNormalizedTerms(target, query);

    const items: SearchResultItem[] = [];

    // 1. بحث في بنك الأسئلة
    if (category === "all" || category === "questions") {
      (bundle.questions || []).forEach((qItem) => {
        const fullText = [
          qItem.question_en,
          qItem.question_ar,
          ...qItem.options_en,
          ...qItem.options_ar,
          qItem.why_correct || "",
          qItem.exam_tip || "",
          qItem.slide_ref || ""
        ].join(" ");

        if (matchesAllTerms(fullText)) {
          items.push({
            id: `q-${qItem.id}`,
            category: "questions",
            categoryLabel: "بنك الأسئلة",
            title: qItem.question_ar || qItem.question_en,
            subtitle: qItem.question_en ? qItem.question_en : `سؤال رقم ${qItem.orig_q_num || qItem.id}`,
            snippet: qItem.exam_tip ? `تكتيك الحل: ${qItem.exam_tip}` : qItem.why_correct,
            badge: qItem.slide_ref || `سؤال ${qItem.orig_q_num || ""}`,
            onSelect: () => {
              onJumpToQuestion(qItem.id);
              onClose();
            }
          });
        }
      });
    }

    // 2. بحث في السلايدات / صفحات الكتاب
    if (category === "all" || category === "slides") {
      const isBook = bundle.meta.page_layout === "book";
      (bundle.slides || []).forEach((slide) => {
        const fullText = [
          slide.ref,
          slide.title || "",
          slide.content_en || "",
          slide.content_ar || "",
          slide.notes_ar || ""
        ].join(" ");

        if (matchesAllTerms(fullText)) {
          items.push({
            id: `slide-${slide.ref}`,
            category: "slides",
            categoryLabel: isBook ? "الكتاب" : "السلايدات",
            title: slide.title || slide.content_en || `${isBook ? "صفحة" : "شريحة"} ${slide.slide_num}`,
            subtitle: slide.content_ar ? slide.content_ar.substring(0, 100) + "..." : slide.content_en || "",
            snippet: slide.notes_ar ? `شرح: ${slide.notes_ar.substring(0, 120)}...` : undefined,
            badge: slide.ref,
            onSelect: () => {
              onJumpToSlide(slide.ref);
              onClose();
            }
          });
        }
      });
    }

    // 3. بحث في جداول المقارنة
    if (category === "all" || category === "tables") {
      (bundle.tables || []).forEach((table) => {
        const rowText = table.rows.flat().join(" ");
        const colText = table.cols.map((c) => c.label).join(" ");
        const fullText = [table.title, table.title_ar, table.desc || "", table.note_ar || "", colText, rowText].join(" ");

        if (matchesAllTerms(fullText)) {
          items.push({
            id: `tbl-${table.id}`,
            category: "tables",
            categoryLabel: "جداول المقارنة",
            title: table.title_ar,
            subtitle: table.title,
            snippet: table.desc || `جدول من ${table.rows.length} صفاً و ${table.cols.length} أعمدة`,
            badge: table.lec ? `محاضرة ${table.lec}` : "جدول",
            onSelect: () => {
              if (onJumpToTable) onJumpToTable(table.id);
              onClose();
            }
          });
        }
      });
    }

    // 4. بحث في الملخص النظري
    if (category === "all" || category === "summary") {
      (bundle.summary?.parts || []).forEach((part) => {
        const blockText = (part.blocks || []).map((b) => [b.head || "", b.body || "", (b.items || []).join(" ")].join(" ")).join(" ");
        const fullText = [part.title, part.lec, blockText].join(" ");

        if (matchesAllTerms(fullText)) {
          items.push({
            id: `part-${part.lec}`,
            category: "summary",
            categoryLabel: "الملخص النظري",
            title: part.title,
            subtitle: `محاضرة ${part.lec}`,
            snippet: blockText.substring(0, 120) + "...",
            badge: part.lec,
            onSelect: () => {
              if (onJumpToSummaryPart) onJumpToSummaryPart(part.lec);
              onClose();
            }
          });
        }
      });
    }

    // 5. بحث في بنك التعاريف
    if (category === "all" || category === "definitions") {
      (bundle.definitions?.items || []).forEach((def) => {
        const triggersText = (def.triggers || []).map((t) => `${t.en} ${t.ar}`).join(" ");
        const fullText = [def.term_en, def.term_ar, def.def_ar, def.def_en || "", def.exam_pitfall?.ar || "", triggersText].join(" ");

        if (matchesAllTerms(fullText)) {
          items.push({
            id: `def-${def.id}`,
            category: "definitions",
            categoryLabel: "بنك التعاريف",
            title: `${def.term_ar} (${def.term_en})`,
            subtitle: def.def_ar,
            snippet: def.exam_pitfall?.ar ? `فخ امتحاني: ${def.exam_pitfall.ar}` : undefined,
            badge: def.lec || "تعريف",
            onSelect: () => {
              if (onJumpToDefinition) onJumpToDefinition(def.id);
              onClose();
            }
          });
        }
      });
    }

    // 6. بحث في ملخص الملخص (الطوارئ)
    if (category === "all" || category === "emergency") {
      (bundle.emergency?.sections || []).forEach((sec) => {
        const parts: string[] = [sec.title, sec.nav_title, sec.desc || "", sec.badge || ""];
        if (sec.type === "capsules") {
          sec.capsules.forEach((cap) => {
            parts.push(cap.title, cap.lec);
            cap.groups.forEach((g) => {
              parts.push(g.subtitle);
              g.items.forEach((it) => parts.push(it.head, it.math || "", it.body));
            });
          });
        } else if (sec.type === "cards") {
          sec.cards.forEach((c) => parts.push(c.title, c.body, c.math || ""));
        } else if (sec.type === "traps_grid") {
          sec.traps.forEach((t) => parts.push(t.title, t.math || "", ...t.points));
        } else if (sec.type === "shortcuts") {
          sec.shortcuts.forEach((s) => parts.push(s.problem, s.rule, ...s.steps));
        } else if (sec.type === "tf_list") {
          sec.items.forEach((it) => parts.push(it.statement, it.trap, it.rule));
        } else if (sec.type === "table") {
          parts.push(...sec.head, ...sec.rows.flat());
        } else if (sec.type === "timeline") {
          sec.steps.forEach((st) => parts.push(st.time, st.target, st.detail));
        }
        const fullText = parts.join(" ");
        if (matchesAllTerms(fullText)) {
          items.push({
            id: `em-${sec.id}`,
            category: "emergency",
            categoryLabel: "ملخص الملخص",
            title: sec.title,
            subtitle: sec.nav_title || "",
            snippet: sec.desc || parts.slice(4).join(" ").substring(0, 120),
            badge: sec.badge || "80/20",
            onSelect: () => {
              if (onJumpToEmergency) onJumpToEmergency();
              onClose();
            }
          });
        }
      });
    }

    // 7. بحث في المعجم
    if (category === "all" || category === "glossary") {
      const glossary = bundle.glossary;
      if (glossary) {
        const structured = glossary.curated_items || glossary.items || [];
        structured.forEach((term, idx) => {
          const fullText = [term.term_en, term.term_ar, term.context || "", term.category || ""].join(" ");
          if (matchesAllTerms(fullText)) {
            items.push({
              id: `gl-cur-${idx}-${term.term_en}`,
              category: "glossary",
              categoryLabel: "المعجم",
              title: `${term.term_ar} (${term.term_en})`,
              subtitle: term.term_en,
              snippet: term.context,
              badge: term.category || "مصطلح",
              onSelect: () => {
                if (onJumpToGlossary) onJumpToGlossary();
                onClose();
              }
            });
          }
        });
        const dictBuckets = [
          ...Object.entries(glossary.words || {}),
          ...Object.entries(glossary.phrases || {})
        ];
        for (let i = 0; i < dictBuckets.length && items.length < 70; i++) {
          const [en, val] = dictBuckets[i];
          const ar = typeof val === "string" ? val : val.arabic;
          const ctx = typeof val === "string" ? undefined : val.context;
          const cat = typeof val === "string" ? undefined : val.category;
          if (matchesAllTerms(`${en} ${ar} ${ctx || ""} ${cat || ""}`)) {
            items.push({
              id: `gl-dict-${i}-${en}`,
              category: "glossary",
              categoryLabel: "المعجم",
              title: `${ar} (${en})`,
              subtitle: en,
              snippet: ctx,
              badge: cat || "مصطلح",
              onSelect: () => {
                if (onJumpToGlossary) onJumpToGlossary();
                onClose();
              }
            });
          }
        }
      }
    }

    // 8. بحث في أنماط الأسئلة
    if (category === "all" || category === "patterns") {
      (bundle.patterns?.rules || []).forEach((rule) => {
        const casesText = (rule.cases || [])
          .map((c) => [c.q, c.q_ar || "", c.ans, c.note || "", c.trigger_word || ""].join(" "))
          .join(" ");
        const fullText = [rule.title, rule.subtitle || "", rule.rule, rule.trigger || "", casesText].join(" ");
        if (matchesAllTerms(fullText)) {
          items.push({
            id: `pat-${rule.id}`,
            category: "patterns",
            categoryLabel: "أنماط الأسئلة",
            title: rule.title,
            subtitle: rule.subtitle || rule.trigger || "",
            snippet: rule.rule,
            badge: rule.accuracy || rule.id.toUpperCase(),
            onSelect: () => {
              if (onJumpToPattern) onJumpToPattern();
              onClose();
            }
          });
        }
      });
    }

    return items.slice(0, 60); // أول 60 نتيجة لتجنب الثقل
  }, [query, category, bundle, onJumpToSlide, onJumpToQuestion, onJumpToTable, onJumpToSummaryPart, onJumpToDefinition, onJumpToEmergency, onJumpToGlossary, onJumpToPattern, onClose]);

  // التنقل بلوحة المفاتيح
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].onSelect();
      }
    }
  };

  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      id="globalSearchModal"
      className="global-search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="البحث الأكاديمي الشامل"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(6px)",
        zIndex: 2500,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "max(16px, env(safe-area-inset-top)) 12px 16px"
      }}
      onClick={onClose}
    >
      <div
        className="card global-search-card"
        style={{
          width: "100%",
          maxWidth: "720px",
          maxHeight: "min(88dvh, 740px)",
          display: "flex",
          flexDirection: "column",
          margin: 0,
          padding: 0,
          background: "var(--sf)",
          border: "1px solid var(--ln)",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.55)",
          borderRadius: "var(--r-l)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* شريط الإدخال الرئيسي */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--ln)",
            background: "var(--sf2)"
          }}
        >
          <span style={{ color: "var(--acc)", display: "flex", alignItems: "center" }}>
            <Icons.Search size={22} />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="ابحث في الأسئلة، السلايدات، الجداول، الملخص، والتعاريف..."
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "1.05rem",
              fontFamily: "inherit",
              color: "var(--ink)"
            }}
          />
          {query && (
            <button
              type="button"
              className="btn btn-icon btn-sm"
              onClick={() => setQuery("")}
              aria-label="مسح نص البحث"
            >
              <Icons.Cross size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة البحث"
            style={{
              background: "var(--sf)",
              border: "1px solid var(--ln)",
              color: "var(--ink-m)",
              cursor: "pointer",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "inline-grid",
              placeItems: "center",
              flexShrink: 0
            }}
            title="إغلاق (Esc)"
          >
            <Icons.Cross size={14} />
          </button>
          <span
            className="desktop-only"
            style={{
              fontSize: "0.72rem",
              padding: "2px 7px",
              borderRadius: "var(--r-pill)",
              background: "var(--sf)",
              border: "1px solid var(--ln)",
              color: "var(--ink-m)",
              fontFamily: "var(--fm)"
            }}
          >
            ESC للإغلاق
          </span>
        </div>

        {/* فلاتر النطاق */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            padding: "10px 18px",
            borderBottom: "1px solid var(--ln)",
            background: "var(--sf)",
            overflowX: "auto",
            scrollbarWidth: "none"
          }}
        >
          {[
            { id: "all", label: "الكل" },
            { id: "questions", label: "الأسئلة" },
            { id: "slides", label: bundle?.meta.page_layout === "book" ? "الكتاب" : "السلايدات" },
            { id: "tables", label: "الجداول" },
            { id: "summary", label: "الملخص" },
            { id: "emergency", label: "ملخص الملخص" },
            { id: "definitions", label: "التعاريف" },
            { id: "glossary", label: "المعجم" },
            { id: "patterns", label: "الأنماط" }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`fchip ${category === cat.id ? "on" : ""}`}
              onClick={() => {
                setCategory(cat.id as SearchCategory);
                setSelectedIndex(0);
              }}
              style={{ fontSize: "0.78rem", padding: "4px 10px" }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* قائمة النتائج */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "8px"
          }}
        >
          {!query.trim() ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-m)" }}>
              <div style={{ display: "inline-flex", padding: "14px", borderRadius: "50%", background: "var(--sf2)", marginBottom: "12px", color: "var(--acc)" }}>
                <Icons.Search size={28} />
              </div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                البحث الأكاديمي الشامل
              </h4>
              <p style={{ fontSize: "0.82rem", maxWidth: "420px", margin: "0 auto" }}>
                اكتب أي مصطلح بالإنجليزية أو العربية للعثور عليه فوراً عبر كافة أسئلة، شرائح، ملخصات وجداول المقرر
              </p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-m)" }}>
              <div style={{ display: "inline-flex", padding: "14px", borderRadius: "50%", background: "var(--sf2)", marginBottom: "12px" }}>
                <Icons.Filter size={28} />
              </div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                لم يتم العثور على نتائج تطابق «{query}»
              </h4>
              <p style={{ fontSize: "0.82rem" }}>
                جرب تغيير كلمات البحث أو التبديل إلى نطاق «الكل»
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ padding: "4px 12px", fontSize: "0.75rem", color: "var(--ink-m)", display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                <span>تم العثور على {results.length} نتيجة</span>
                <span className="desktop-only">استخدم الأسهم للتنقل و Enter للاختيار</span>
              </div>
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={`${item.category}-${item.id}`}
                    data-index={idx}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--r-m)",
                      background: isSelected ? "color-mix(in srgb, var(--acc) 14%, var(--sf2))" : "var(--sf2)",
                      border: `1px solid ${isSelected ? "var(--acc)" : "var(--ln)"}`,
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "var(--r-pill)",
                          background: "var(--sf)",
                          color: "var(--acc)",
                          border: "1px solid var(--ln)"
                        }}
                      >
                        {item.categoryLabel}
                      </span>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontFamily: "var(--fm)",
                            fontWeight: 700,
                            color: "var(--ink-m)"
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)" }}>
                      {highlightText(item.title, query)}
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: "0.8rem", color: "var(--ink-m)", direction: "ltr", textAlign: "left" }}>
                        {highlightText(item.subtitle, query)}
                      </div>
                    )}
                    {item.snippet && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--ink)",
                          opacity: 0.85,
                          marginTop: "2px",
                          paddingTop: "4px",
                          borderTop: "1px dashed var(--ln)"
                        }}
                      >
                        {highlightText(item.snippet, query)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* الشريط السفلي — لسطح المكتب فقط */}
        <div
          className="desktop-only"
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--ln)",
            background: "var(--sf2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.74rem",
            color: "var(--ink-m)"
          }}
        >
          <div className="desktop-only" style={{ display: "flex", gap: "14px" }}>
            <span><kbd style={{ padding: "1px 4px", border: "1px solid var(--ln)", borderRadius: "3px", fontFamily: "var(--fm)" }}>Enter</kbd> انتقال فوري</span>
            <span><kbd style={{ padding: "1px 4px", border: "1px solid var(--ln)", borderRadius: "3px", fontFamily: "var(--fm)" }}>↑ / ↓</kbd> اختيار</span>
          </div>
          <span style={{ marginInlineStart: "auto" }}>المنصة التعليمية الموحدة</span>
        </div>
      </div>
    </div>
  );
};

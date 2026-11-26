// ==============================================================================
// المنصة التعليمية الموحدة — باحث ومستكشف المحتوى الشامل (Universal Search / Ctrl+K)
// Instant Multi-Module Search · Questions · Slides · Tables · Summary · Definitions
// Keyboard Navigation · Matched Highlighting · Multi-Frame Jump Navigation
// Zero Emojis Standard · 100% SVG Vector Line-Art
// ==============================================================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "../icons/SvgIcons";
import { highlightSearchText, matchesNormalizedTerms, stripHtmlTags } from "../../lib/textUtils";
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
  onJumpToEmergency?: (sectionId?: string) => void;
  onJumpToGlossary?: () => void;
  onJumpToPattern?: (ruleId?: string) => void;
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
  score: number;
  onSelect: () => void;
}

type NonAllCategory = Exclude<SearchCategory, "all">;

const ALL_CATEGORY_ORDER: NonAllCategory[] = [
  "slides",
  "definitions",
  "tables",
  "summary",
  "emergency",
  "patterns",
  "glossary",
  "questions"
];

const ALL_PER_CATEGORY_LIMIT = 8;

const CATEGORY_LABELS: Record<NonAllCategory, string> = {
  questions: "بنك الأسئلة",
  slides: "السلايدات",
  tables: "جداول المقارنة",
  summary: "الملخص النظري",
  emergency: "ملخص الملخص",
  definitions: "بنك التعاريف",
  glossary: "المعجم",
  patterns: "أنماط الأسئلة"
};

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

  const { results, categoryCounts, categoryTotals } = useMemo(() => {
    const emptyCounts: Record<SearchCategory, number> = {
      all: 0,
      questions: 0,
      slides: 0,
      tables: 0,
      summary: 0,
      definitions: 0,
      emergency: 0,
      glossary: 0,
      patterns: 0
    };
    const emptyTotals: Record<NonAllCategory, number> = {
      questions: 0,
      slides: 0,
      tables: 0,
      summary: 0,
      definitions: 0,
      emergency: 0,
      glossary: 0,
      patterns: 0
    };

    if (!query.trim() || !bundle) {
      return { results: [] as SearchResultItem[], categoryCounts: emptyCounts, categoryTotals: emptyTotals };
    }

    const qLower = query.trim().toLowerCase();
    const matchesAllTerms = (target: string) => matchesNormalizedTerms(target, query);
    const computeScore = (titleText: string, secondaryText = "") => {
      let s = 1;
      const tLow = titleText.toLowerCase();
      if (matchesAllTerms(titleText)) s += 4;
      if (tLow.startsWith(qLower)) s += 3;
      else if (tLow.includes(qLower)) s += 2;
      if (secondaryText && matchesAllTerms(secondaryText)) s += 1;
      return s;
    };

    const buckets: Record<NonAllCategory, SearchResultItem[]> = {
      questions: [],
      slides: [],
      tables: [],
      summary: [],
      definitions: [],
      emergency: [],
      glossary: [],
      patterns: []
    };

    // 1. بحث في بنك الأسئلة
    (bundle.questions || []).forEach((qItem) => {
      const cleanQEn = stripHtmlTags(qItem.question_en || "");
      const cleanQAr = stripHtmlTags(qItem.question_ar || "");
      const cleanTip = stripHtmlTags(qItem.exam_tip || "");
      const cleanWhy = stripHtmlTags(qItem.why_correct || "");
      const fullText = stripHtmlTags(
        [
          cleanQEn,
          cleanQAr,
          ...(qItem.options_en || []),
          ...(qItem.options_ar || []),
          cleanWhy,
          cleanTip,
          qItem.slide_ref || ""
        ].join(" ")
      );

      if (matchesAllTerms(fullText)) {
        const title = cleanQAr || cleanQEn;
        buckets.questions.push({
          id: `q-${qItem.id}`,
          category: "questions",
          categoryLabel: "بنك الأسئلة",
          title,
          subtitle: cleanQEn ? cleanQEn : `سؤال رقم ${qItem.orig_q_num || qItem.id}`,
          snippet: cleanTip ? `تكتيك الحل: ${cleanTip}` : cleanWhy || undefined,
          badge: qItem.slide_ref || `سؤال ${qItem.orig_q_num || ""}`,
          score: computeScore(`${cleanQEn} ${cleanQAr}`, qItem.slide_ref || ""),
          onSelect: () => {
            onJumpToQuestion(qItem.id);
            onClose();
          }
        });
      }
    });

    // 2. بحث في السلايدات / صفحات الكتاب
    const isBook = bundle.meta.page_layout === "book";
    (bundle.slides || []).forEach((slide) => {
      const cleanTitle = stripHtmlTags(slide.title || "");
      const cleanEn = stripHtmlTags(slide.content_en || "");
      const cleanAr = stripHtmlTags(slide.content_ar || "");
      const cleanNotes = stripHtmlTags(slide.notes_ar || "");
      const fullText = [slide.ref, cleanTitle, cleanEn, cleanAr, cleanNotes].join(" ");

      if (matchesAllTerms(fullText)) {
        const title = cleanTitle || cleanEn || `${isBook ? "صفحة" : "شريحة"} ${slide.slide_num}`;
        buckets.slides.push({
          id: `slide-${slide.ref}`,
          category: "slides",
          categoryLabel: isBook ? "الكتاب" : "السلايدات",
          title,
          subtitle: cleanAr ? (cleanAr.length > 100 ? cleanAr.substring(0, 100) + "..." : cleanAr) : cleanEn,
          snippet: cleanNotes ? `شرح: ${cleanNotes.length > 120 ? cleanNotes.substring(0, 120) + "..." : cleanNotes}` : undefined,
          badge: slide.ref,
          score: computeScore(`${slide.ref} ${cleanTitle}`, cleanEn),
          onSelect: () => {
            onJumpToSlide(slide.ref);
            onClose();
          }
        });
      }
    });

    // 3. بحث في جداول المقارنة
    (bundle.tables || []).forEach((table) => {
      const cleanTitle = stripHtmlTags(table.title || "");
      const cleanTitleAr = stripHtmlTags(table.title_ar || "");
      const cleanDesc = stripHtmlTags(table.desc || "");
      const cleanNote = stripHtmlTags(table.note_ar || "");
      const rowText = stripHtmlTags(table.rows.flat().join(" "));
      const colText = stripHtmlTags(table.cols.map((c) => c.label).join(" "));
      const fullText = [cleanTitle, cleanTitleAr, cleanDesc, cleanNote, colText, rowText].join(" ");

      if (matchesAllTerms(fullText)) {
        buckets.tables.push({
          id: `tbl-${table.id}`,
          category: "tables",
          categoryLabel: "جداول المقارنة",
          title: cleanTitleAr || cleanTitle,
          subtitle: cleanTitle !== cleanTitleAr ? cleanTitle : "",
          snippet: cleanDesc || `جدول من ${table.rows.length} صفاً و ${table.cols.length} أعمدة`,
          badge: table.lec ? `محاضرة ${table.lec}` : "جدول",
          score: computeScore(`${cleanTitleAr} ${cleanTitle}`, cleanDesc),
          onSelect: () => {
            if (onJumpToTable) onJumpToTable(table.id);
            onClose();
          }
        });
      }
    });

    // 4. بحث في الملخص النظري
    (bundle.summary?.parts || []).forEach((part) => {
      const cleanTitle = stripHtmlTags(part.title || "");
      const blockText = stripHtmlTags(
        (part.blocks || []).map((b) => [b.head || "", b.body || "", (b.items || []).join(" ")].join(" ")).join(" ")
      );
      const fullText = [cleanTitle, part.lec, blockText].join(" ");

      if (matchesAllTerms(fullText)) {
        buckets.summary.push({
          id: `part-${part.lec}`,
          category: "summary",
          categoryLabel: "الملخص النظري",
          title: cleanTitle,
          subtitle: `محاضرة ${part.lec}`,
          snippet: blockText ? (blockText.length > 120 ? blockText.substring(0, 120) + "..." : blockText) : undefined,
          badge: part.lec,
          score: computeScore(`${cleanTitle} ${part.lec}`),
          onSelect: () => {
            if (onJumpToSummaryPart) onJumpToSummaryPart(part.lec);
            onClose();
          }
        });
      }
    });

    // 5. بحث في بنك التعاريف
    (bundle.definitions?.items || []).forEach((def) => {
      const cleanDefAr = stripHtmlTags(def.def_ar || "");
      const cleanDefEn = stripHtmlTags(def.def_en || "");
      const cleanPitfall = stripHtmlTags(def.exam_pitfall?.ar || "");
      const triggersText = stripHtmlTags((def.triggers || []).map((t) => `${t.en} ${t.ar}`).join(" "));
      const fullText = [def.term_en, def.term_ar, cleanDefAr, cleanDefEn, cleanPitfall, triggersText].join(" ");

      if (matchesAllTerms(fullText)) {
        buckets.definitions.push({
          id: `def-${def.id}`,
          category: "definitions",
          categoryLabel: "بنك التعاريف",
          title: `${def.term_ar} (${def.term_en})`,
          subtitle: cleanDefAr,
          snippet: cleanPitfall ? `فخ امتحاني: ${cleanPitfall}` : undefined,
          badge: def.lec || "تعريف",
          score: computeScore(`${def.term_ar} ${def.term_en}`, cleanDefAr),
          onSelect: () => {
            if (onJumpToDefinition) onJumpToDefinition(def.id);
            onClose();
          }
        });
      }
    });

    // 6. بحث في ملخص الملخص (الطوارئ)
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
      const fullText = stripHtmlTags(parts.join(" "));
      if (matchesAllTerms(fullText)) {
        const cleanDesc = stripHtmlTags(sec.desc || "");
        const cleanBody = stripHtmlTags(parts.slice(4).join(" "));
        const cleanSecTitle = stripHtmlTags(sec.title);
        buckets.emergency.push({
          id: `em-${sec.id}`,
          category: "emergency",
          categoryLabel: "ملخص الملخص",
          title: cleanSecTitle,
          subtitle: stripHtmlTags(sec.nav_title || ""),
          snippet: cleanDesc || (cleanBody.length > 120 ? cleanBody.substring(0, 120) + "..." : cleanBody),
          badge: sec.badge || "80/20",
          score: computeScore(`${cleanSecTitle} ${sec.nav_title || ""}`, cleanDesc),
          onSelect: () => {
            if (onJumpToEmergency) onJumpToEmergency(sec.id);
            onClose();
          }
        });
      }
    });

    // 7. بحث في المعجم
    const glossary = bundle.glossary;
    if (glossary) {
      const structured = glossary.curated_items || glossary.items || [];
      structured.forEach((term, idx) => {
        const cleanContext = stripHtmlTags(term.context || "");
        const fullText = [term.term_en, term.term_ar, cleanContext, term.category || ""].join(" ");
        if (matchesAllTerms(fullText)) {
          buckets.glossary.push({
            id: `gl-cur-${idx}-${term.term_en}`,
            category: "glossary",
            categoryLabel: "المعجم",
            title: `${term.term_ar} (${term.term_en})`,
            subtitle: term.term_en,
            snippet: cleanContext || undefined,
            badge: term.category || "مصطلح",
            score: computeScore(`${term.term_ar} ${term.term_en}`, cleanContext),
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
      for (let i = 0; i < dictBuckets.length && buckets.glossary.length < 80; i++) {
        const [en, val] = dictBuckets[i];
        const ar = typeof val === "string" ? val : val.arabic;
        const ctx = typeof val === "string" ? undefined : stripHtmlTags(val.context || "");
        const cat = typeof val === "string" ? undefined : val.category;
        if (matchesAllTerms(`${en} ${ar} ${ctx || ""} ${cat || ""}`)) {
          buckets.glossary.push({
            id: `gl-dict-${i}-${en}`,
            category: "glossary",
            categoryLabel: "المعجم",
            title: `${ar} (${en})`,
            subtitle: en,
            snippet: ctx || undefined,
            badge: cat || "مصطلح",
            score: computeScore(`${ar} ${en}`, ctx || ""),
            onSelect: () => {
              if (onJumpToGlossary) onJumpToGlossary();
              onClose();
            }
          });
        }
      }
    }

    // 8. بحث في أنماط الأسئلة
    (bundle.patterns?.rules || []).forEach((rule) => {
      const cleanTitle = stripHtmlTags(rule.title || "");
      const cleanSub = stripHtmlTags(rule.subtitle || rule.trigger || "");
      const cleanRule = stripHtmlTags(rule.rule || "");
      const casesText = stripHtmlTags(
        (rule.cases || [])
          .map((c) => [c.q, c.q_ar || "", c.ans, c.note || "", c.trigger_word || ""].join(" "))
          .join(" ")
      );
      const fullText = [cleanTitle, cleanSub, cleanRule, casesText].join(" ");
      if (matchesAllTerms(fullText)) {
        buckets.patterns.push({
          id: `pat-${rule.id}`,
          category: "patterns",
          categoryLabel: "أنماط الأسئلة",
          title: cleanTitle,
          subtitle: cleanSub,
          snippet: cleanRule,
          badge: rule.accuracy || rule.id.toUpperCase(),
          score: computeScore(`${cleanTitle} ${cleanSub}`, cleanRule),
          onSelect: () => {
            if (onJumpToPattern) onJumpToPattern(rule.id);
            onClose();
          }
        });
      }
    });

    // ترتيب كل قسم حسب تطابق العنوان أولاً وحساب الإجمالي
    const counts: Record<SearchCategory, number> = { ...emptyCounts };
    const totals: Record<NonAllCategory, number> = { ...emptyTotals };
    let grandTotal = 0;

    for (const cat of ALL_CATEGORY_ORDER) {
      buckets[cat].sort((a, b) => b.score - a.score);
      const len = buckets[cat].length;
      counts[cat] = len;
      totals[cat] = len;
      grandTotal += len;
    }
    counts.all = grandTotal;

    // في تبويب «الكل» نعرض أعلى 8 نتائج متوازنة من كل قسم حتى لا تغرق الأسئلة باقي الأقسام
    let finalItems: SearchResultItem[];
    if (category === "all") {
      finalItems = [];
      for (const cat of ALL_CATEGORY_ORDER) {
        if (buckets[cat].length > 0) {
          finalItems.push(...buckets[cat].slice(0, ALL_PER_CATEGORY_LIMIT));
        }
      }
    } else {
      finalItems = buckets[category].slice(0, 80);
    }

    return { results: finalItems, categoryCounts: counts, categoryTotals: totals };
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
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              aria-label="مسح نص البحث"
              title="مسح نص البحث"
              style={{
                background: "var(--sf)",
                border: "1px solid var(--ln)",
                color: "var(--ink-m)",
                cursor: "pointer",
                fontSize: "0.74rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "var(--r-pill)",
                flexShrink: 0,
                whiteSpace: "nowrap"
              }}
            >
              مسح
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
            scrollbarWidth: "none",
            flexShrink: 0
          }}
        >
          {[
            { id: "all" as const, label: "الكل" },
            { id: "slides" as const, label: bundle?.meta.page_layout === "book" ? "الكتاب" : "السلايدات" },
            { id: "questions" as const, label: "الأسئلة" },
            { id: "definitions" as const, label: "التعاريف" },
            { id: "tables" as const, label: "الجداول" },
            { id: "summary" as const, label: "الملخص" },
            { id: "emergency" as const, label: "ملخص الملخص" },
            { id: "glossary" as const, label: "المعجم" },
            { id: "patterns" as const, label: "الأنماط" }
          ].map((cat) => {
            const cnt = query.trim() ? categoryCounts[cat.id] : 0;
            return (
              <button
                key={cat.id}
                type="button"
                className={`fchip ${category === cat.id ? "on" : ""}`}
                onClick={() => {
                  setCategory(cat.id);
                  setSelectedIndex(0);
                }}
                style={{ fontSize: "0.78rem", padding: "4px 10px", flexShrink: 0, whiteSpace: "nowrap" }}
              >
                <span>{cat.label}</span>
                {query.trim() && cnt > 0 && (
                  <span style={{ opacity: 0.78, marginInlineStart: "4px", fontFamily: "var(--fm)", fontSize: "0.72rem" }}>
                    ({cnt})
                  </span>
                )}
              </button>
            );
          })}
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
                <span>
                  {category === "all" && categoryCounts.all > results.length
                    ? `عرض أبرز ${results.length} نتيجة متوازنة من أصل ${categoryCounts.all}`
                    : `تم العثور على ${category === "all" ? categoryCounts.all : categoryCounts[category]} نتيجة`}
                </span>
                <span className="desktop-only">استخدم الأسهم للتنقل و Enter للاختيار</span>
              </div>
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const prevItem = idx > 0 ? results[idx - 1] : null;
                const showGroupHeader = category === "all" && (!prevItem || prevItem.category !== item.category);
                const totalInCat = categoryTotals[item.category];
                const groupLabel =
                  item.category === "slides" && bundle?.meta.page_layout === "book"
                    ? "الكتاب"
                    : CATEGORY_LABELS[item.category];
                return (
                  <React.Fragment key={`${item.category}-${item.id}`}>
                    {showGroupHeader && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          padding: "8px 10px 4px",
                          marginTop: idx === 0 ? 0 : "6px",
                          borderBottom: "1px solid var(--ln)"
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--acc)" }}>
                          {groupLabel} ({totalInCat})
                        </span>
                        {totalInCat > ALL_PER_CATEGORY_LIMIT && (
                          <button
                            type="button"
                            onClick={() => {
                              setCategory(item.category);
                              setSelectedIndex(0);
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid var(--ln)",
                              borderRadius: "var(--r-pill)",
                              color: "var(--ink-m)",
                              cursor: "pointer",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "2px 9px"
                            }}
                          >
                            عرض كل الـ {totalInCat}
                          </button>
                        )}
                      </div>
                    )}
                    <div
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
                        <div dir="auto" style={{ fontSize: "0.8rem", color: "var(--ink-m)", unicodeBidi: "plaintext" }}>
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
                  </React.Fragment>
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

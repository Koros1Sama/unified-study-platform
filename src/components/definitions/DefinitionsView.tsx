// ==============================================================================
// المنصة التعليمية الموحدة — بنك التعاريف والمصطلحات ونظام الأهمية الثلاثي
// Definitions Bank with 3-Tier Importance System (Tiers 1, 2, 3)
// Flashcards, 5-Second Triggers, Exam Pitfalls, Slide Refs. Zero Emojis.
// ==============================================================================

import React, { useState, useMemo } from "react";
import { Icons } from "../icons/SvgIcons";
import type { DefinitionBank, DefinitionItem, ImportanceTier } from "../../types";

interface DefinitionsViewProps {
  data?: DefinitionBank;
  masteredIds?: string[];
  onToggleMastered?: (id: string) => void;
  onJumpToSlide: (ref: string) => void;
}

export function getDefinitionTier(importance: number): ImportanceTier {
  if (importance === 1 || importance === 2 || importance === 3) {
    return importance as ImportanceTier;
  }
  // المواءمة مع مقياس 1-5 السابق (حيث 5 هي الأعلى خطورة في Sec_Viewer)
  if (importance >= 5) return 1;
  if (importance === 4) return 2;
  return 3;
}

export const DEF_TIER_META: Record<
  ImportanceTier,
  { label: string; short: string; badgeClass: string; desc: string }
> = {
  1: {
    label: "درجة أولى (حتمية امتحانية)",
    short: "درجة أولى · حتمي",
    badgeClass: "tier-1",
    desc: "مفاهيم وقواعد مركزية معتمدة لا يخلو منها أي امتحان رسمي"
  },
  2: {
    label: "درجة ثانية (مفاهيم داعمة)",
    short: "درجة ثانية · داعم",
    badgeClass: "tier-2",
    desc: "مصطلحات تقنية أساسية تسند فهم المتن النظري والجداول"
  },
  3: {
    label: "درجة ثالثة (تكميلية وتخصصية)",
    short: "درجة ثالثة · تكميلي",
    badgeClass: "tier-3",
    desc: "مصطلحات تخصصية مساعدة وتراكيب إثرائية للاستزادة"
  }
};

function normalize(text: string): string {
  return (text || "").toLowerCase();
}

export const DefinitionsView: React.FC<DefinitionsViewProps> = ({
  data,
  masteredIds = [],
  onToggleMastered,
  onJumpToSlide
}) => {
  const [query, setQuery] = useState("");
  const [lectureFilter, setLectureFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState<"all" | ImportanceTier>("all");
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [showArabic, setShowArabic] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const items = data?.items || [];

  const lectures = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => map.set(item.lec, (map.get(item.lec) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en"));
  }, [items]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      if (item.category) map.set(item.category, (map.get(item.category) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const tierCounts = useMemo(() => {
    let t1 = 0;
    let t2 = 0;
    let t3 = 0;
    items.forEach((item) => {
      const t = getDefinitionTier(item.importance);
      if (t === 1) t1++;
      else if (t === 2) t2++;
      else t3++;
    });
    return { 1: t1, 2: t2, 3: t3 };
  }, [items]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((item) => {
      if (lectureFilter !== "all" && item.lec !== lectureFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (tierFilter !== "all" && getDefinitionTier(item.importance) !== tierFilter) return false;
      if (!q) return true;
      const haystack = [
        item.term_en,
        item.term_ar,
        item.category,
        item.def_en,
        item.def_ar,
        item.lec,
        item.ref,
        ...(item.triggers || []).flatMap((t) => [t.en, t.ar]),
        item.exam_pitfall?.en || "",
        item.exam_pitfall?.ar || ""
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, lectureFilter, categoryFilter, tierFilter]);

  if (items.length === 0) {
    return (
      <div className="pending-box" style={{ margin: "40px auto", maxWidth: 620 }}>
        <div className="pb-ic">
          <Icons.Definitions size={34} />
        </div>
        <div className="pb-t">بنك التعاريف غير متوفر لهذه المادة</div>
        <div className="pb-s">
          المواد التي تحتوي على بنك تعاريف رسمي تعرض هنا بطاقات Terms + Triggers + Pitfalls.
        </div>
      </div>
    );
  }

  const masteredCount = items.filter((item) => masteredIds.includes(item.id)).length;

  const renderCard = (item: DefinitionItem) => {
    const isMastered = masteredIds.includes(item.id);
    const isRevealed = revealed[item.id] || !flashcardMode;
    const tier = getDefinitionTier(item.importance);
    const tierMeta = DEF_TIER_META[tier];

    return (
      <article
        key={item.id}
        id={`def-${item.id}`}
        className={`def-card def-tier-${tier} ${isMastered ? "is-mastered" : ""} ${
          flashcardMode && !isRevealed ? "is-hidden" : ""
        }`}
        data-lec={item.lec}
        onClick={() => {
          if (flashcardMode) {
            setRevealed((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
          }
        }}
      >
        <div className="def-card-head">
          <span className="def-lec-badge">{item.lec}</span>
          <span className={`def-tier-badge ${tierMeta.badgeClass}`} title={tierMeta.desc}>
            {tierMeta.short}
          </span>
          {item.category && <span className="def-cat-badge">{item.category}</span>}
          <span className="def-imp" title={`الأهمية: ${tierMeta.label}`}>
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`def-imp-bar ${step <= (4 - tier) ? "on" : ""}`}
              />
            ))}
          </span>
        </div>

        <div className="def-term">
          <h3 className="def-term-title" dir="ltr">
            {item.term_en}
          </h3>
          <div className="def-term-ar">{item.term_ar}</div>
        </div>

        <div className="def-body">
          <div className="def-body-en" dir="ltr">
            {item.def_en}
          </div>
          {showArabic && item.def_ar && <div className="def-body-ar">{item.def_ar}</div>}
        </div>

        {isRevealed && (
          <div className="def-extra">
            {item.triggers && item.triggers.length > 0 && (
              <div className="def-triggers-box">
                <div className="def-extra-title">
                  <Icons.Target size={14} />
                  <span>مفاتيح الحل السريع (5-Second Triggers)</span>
                </div>
                <div className="def-trigger-list">
                  {item.triggers.map((trigger, idx) => (
                    <span key={idx} className="def-trigger-chip" title={trigger.ar}>
                      <b dir="ltr">{trigger.en}</b>
                      {trigger.ar && <i>{trigger.ar}</i>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {item.exam_pitfall && (item.exam_pitfall.en || item.exam_pitfall.ar) && (
              <div className="def-pitfall">
                <div className="def-extra-title">
                  <Icons.Warning size={14} />
                  <span>مصيدة الامتحان الشائعة</span>
                </div>
                {item.exam_pitfall.ar && <p className="def-pitfall-ar">{item.exam_pitfall.ar}</p>}
                {item.exam_pitfall.en && (
                  <p className="def-pitfall-en" dir="ltr">
                    {item.exam_pitfall.en}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="def-footer">
          {item.ref && (
            <button
              type="button"
              className="ref-chip def-slide-ref"
              onClick={(e) => {
                e.stopPropagation();
                onJumpToSlide(item.ref);
              }}
              title={`الانتقال إلى شريحة ${item.ref}`}
            >
              <Icons.Slides size={12} />
              <span>{item.ref}</span>
            </button>
          )}

          {flashcardMode && (
            <button
              type="button"
              className="ref-chip def-flip-btn"
              onClick={(e) => {
                e.stopPropagation();
                setRevealed((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
              }}
            >
              <Icons.Eye size={12} />
              <span>{isRevealed ? "إخفاء التعريف" : "اكشف التعريف"}</span>
            </button>
          )}

          {onToggleMastered && (
            <button
              type="button"
              className={`ref-chip def-master-btn ${isMastered ? "on" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleMastered(item.id);
              }}
              title={isMastered ? "إلغاء الإتقان" : "تعليم كمُتقَن"}
            >
              <Icons.Check size={12} />
              <span>{isMastered ? "متقن" : "أتقنتُه"}</span>
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div id="definitionsView" className={`def-view ${flashcardMode ? "def-flashcard-mode" : ""}`}>
      <div className="def-hero">
        <div className="def-kicker">
          <span className="dot" />
          <span>بنك التعاريف والمصطلحات الامتحانية</span>
        </div>
        <h1 className="def-title">{data?.title_ar || "بنك التعاريف والمصطلحات"}</h1>
        {data?.sub_ar && <p className="def-sub">{data.sub_ar}</p>}

        <div className="def-hero-stats">
          <div className="def-stat">
            <b>{items.length}</b>
            <span>مصطلحاً بنكياً</span>
          </div>
          <div className="def-stat">
            <b>{tierCounts[1]}</b>
            <span>درجة أولى (حتمي)</span>
          </div>
          <div className="def-stat">
            <b>{tierCounts[2]}</b>
            <span>درجة ثانية (داعم)</span>
          </div>
          <div className="def-stat">
            <b>{tierCounts[3]}</b>
            <span>درجة ثالثة (تكميلي)</span>
          </div>
          <div className="def-stat">
            <b>{lectures.length}</b>
            <span>محاضرات مغطاة</span>
          </div>
          <div className="def-stat">
            <b>
              {masteredCount} / {items.length}
            </b>
            <span>مصطلحات أتقنتها</span>
          </div>
        </div>
      </div>

      <div className="def-toolbar">
        <div className="def-search">
          <Icons.Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في المصطلح، التعريف، الترجمة، المفاهيم المحفزة، أو مصيدة الامتحان..."
            aria-label="بحث التعاريف"
          />
          {query && (
            <button
              type="button"
              className="def-search-clear"
              onClick={() => setQuery("")}
              aria-label="مسح البحث"
            >
              <Icons.Cross size={15} />
            </button>
          )}
        </div>

        <div className="def-tool-actions">
          <select
            className="def-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="تصفية التصنيف"
          >
            <option value="all">كل التصنيفات ({categories.length})</option>
            {categories.map(([cat, count]) => (
              <option key={cat} value={cat}>
                {cat} ({count})
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`fchip ${showArabic ? "on" : ""}`}
            onClick={() => setShowArabic(!showArabic)}
          >
            الترجمة العربية
          </button>
          <button
            type="button"
            className={`fchip ${flashcardMode ? "on" : ""}`}
            onClick={() => setFlashcardMode(!flashcardMode)}
            title="إخفاء التعريفات حتى تكشفها بنفسك"
          >
            <Icons.Eye size={13} />
            وضع الفلاش كارد
          </button>
        </div>
      </div>

      <div className="def-chips def-tier-chips">
        <span className="chips-label">تصفية الأهمية:</span>
        {([
          { id: "all", label: `الكل (${items.length})`, tierClass: "" },
          { id: 1, label: `درجة أولى · حتمية (${tierCounts[1]})`, tierClass: "tier-1" },
          { id: 2, label: `درجة ثانية · داعمة (${tierCounts[2]})`, tierClass: "tier-2" },
          { id: 3, label: `درجة ثالثة · تكميلية (${tierCounts[3]})`, tierClass: "tier-3" }
        ] as const).map((opt) => (
          <button
            key={String(opt.id)}
            type="button"
            className={`fchip ${opt.tierClass || ""} ${tierFilter === opt.id ? "on" : ""}`}
            onClick={() => setTierFilter(opt.id as "all" | ImportanceTier)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="def-chips">
        <span className="chips-label">المحاضرة:</span>
        <button
          type="button"
          className={`fchip ${lectureFilter === "all" ? "on" : ""}`}
          onClick={() => setLectureFilter("all")}
        >
          الكل ({items.length})
        </button>
        {lectures.map(([lec, count]) => (
          <button
            key={lec}
            type="button"
            className={`fchip ${lectureFilter === lec ? "on" : ""}`}
            onClick={() => setLectureFilter(lec)}
          >
            {lec} ({count})
          </button>
        ))}
        <span className="def-result-count">
          المعروض: <b>{filtered.length}</b>
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="pending-box">
          <div className="pb-ic">
            <Icons.Search size={30} />
          </div>
          <div className="pb-t">لا توجد مصطلحات تطابق معايير البحث الحالية</div>
          <div className="pb-s">
            جرّب توسيع البحث أو إلغاء فلاتر المحاضرة، الأهمية، والتصنيف.
          </div>
        </div>
      ) : (
        <div className="def-grid">{filtered.map(renderCard)}</div>
      )}
    </div>
  );
};

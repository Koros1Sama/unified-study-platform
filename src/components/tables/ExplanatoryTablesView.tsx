// ==============================================================================
// المنصة التعليمية الموحدة — محرك الجداول الشارحة (Authentic Tables)
// Row-level importance · saved filter · live search · column auto-fit ·
// responsive card mode · long-table collapse · zero emojis.
// ==============================================================================

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Icons } from "../icons/SvgIcons";
import type { ExplanatoryTable } from "../../types";

interface ExplanatoryTablesViewProps {
  tables: ExplanatoryTable[];
  memorizedTableIds: string[];
  onToggleMemorize: (tableId: string) => void;
  onJumpToSlide: (ref: string) => void;
  activeLectureId?: string;
}

export function getColPercentages(colsCount: number): string[] {
  if (colsCount <= 1) return ["100%"];
  if (colsCount === 2) return ["35%", "65%"];
  if (colsCount === 3) return ["24%", "36%", "40%"];
  if (colsCount === 4) return ["18%", "26%", "26%", "30%"];
  if (colsCount === 5) return ["16%", "20%", "22%", "20%", "22%"];
  const each = Math.floor(100 / colsCount);
  return Array(colsCount).fill(`${each}%`);
}

const IMPORTANCE_LABEL: Record<number, string> = {
  1: "عام",
  2: "مساند",
  3: "مهم",
  4: "مرجح",
  5: "صفوة"
};

const COLLAPSE_THRESHOLD = 9;

export const ExplanatoryTablesView: React.FC<ExplanatoryTablesViewProps> = ({
  tables,
  memorizedTableIds,
  onToggleMemorize,
  onJumpToSlide,
  activeLectureId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [minImportance, setMinImportance] = useState<number>(() => {
    const saved = localStorage.getItem("unified_tbl_min");
    return saved ? parseInt(saved, 10) || 1 : 1;
  });
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [forceCards, setForceCards] = useState<boolean>(() => {
    return localStorage.getItem("unified_tbl_cards") === "true";
  });
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [lectureFilter, setLectureFilter] = useState<string>(activeLectureId || "all");
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);

  const handleCopyMarkdown = useCallback((table: ExplanatoryTable) => {
    const headers = table.cols.map((c) => c.label).join(" | ");
    const separator = table.cols.map(() => "---").join(" | ");
    const rowsText = table.rows
      .map((r) => r.map((cell) => String(cell).replace(/\n/g, " ")).join(" | "))
      .join("\n");
    const md = `### ${table.title_ar} (${table.title})\n\n| ${headers} |\n| ${separator} |\n| ${rowsText} |\n`;

    const fallbackCopy = (text: string) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopiedTableId(table.id);
        setTimeout(() => setCopiedTableId(null), 2000);
      } catch (_) {}
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(() => {
        setCopiedTableId(table.id);
        setTimeout(() => setCopiedTableId(null), 2000);
      }).catch(() => fallbackCopy(md));
    } else {
      fallbackCopy(md);
    }
  }, []);

  useEffect(() => {
    setLectureFilter(activeLectureId || "all");
  }, [activeLectureId]);

  const handleImportanceChange = (val: number) => {
    setMinImportance(val);
    localStorage.setItem("unified_tbl_min", String(val));
  };

  const toggleCards = () => {
    setForceCards((prev) => {
      localStorage.setItem("unified_tbl_cards", String(!prev));
      return !prev;
    });
  };

  // محرك fitTables لتحجيم الجداول بدقة
  const fitTables = useCallback(() => {
    if (!containerRef.current) return;
    const wraps = containerRef.current.querySelectorAll<HTMLDivElement>(".tbl-wrap");
    wraps.forEach((wrap) => {
      const sc = wrap.querySelector<HTMLDivElement>(".tbl-scale");
      const tbl = wrap.querySelector<HTMLTableElement>("table.tbl");
      if (!sc || !tbl) return;
      sc.style.transform = "none";
      sc.style.height = "";
      const w = tbl.offsetWidth;
      const avail = wrap.clientWidth;
      if (w > avail + 1 && avail > 0) {
        const k = avail / w;
        sc.style.transform = `scale(${k})`;
        sc.style.transformOrigin = "top right";
        sc.style.width = `${w}px`;
        wrap.style.height = `${Math.ceil(tbl.offsetHeight * k) + 4}px`;
      } else {
        wrap.style.height = "";
        sc.style.width = "";
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(fitTables, 60);
    window.addEventListener("resize", fitTables);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", fitTables);
    };
  }, [fitTables, tables, minImportance, showSavedOnly, searchQuery, forceCards, expandedTables, lectureFilter]);

  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tables
      .filter((table) => {
        if (lectureFilter !== "all" && table.lec !== lectureFilter) return false;
        if (showSavedOnly && !memorizedTableIds.includes(table.id)) return false;
        if (q) {
          const matchesTitle =
            (table.title_ar || "").toLowerCase().includes(q) ||
            (table.title || "").toLowerCase().includes(q);
          const matchesContent = table.rows.some((row) =>
            row.some((cell) => String(cell).toLowerCase().includes(q))
          );
          if (!matchesTitle && !matchesContent) return false;
        }
        return table.imps.some((imp) => imp >= minImportance);
      })
      .map((table) => {
        const rows = table.rows
          .map((row, index) => ({ row, index, imp: table.imps[index] || 1 }))
          .filter((entry) => entry.imp >= minImportance)
          .filter((entry) => {
            if (!q) return true;
            const inTitle =
              (table.title_ar || "").toLowerCase().includes(q) ||
              (table.title || "").toLowerCase().includes(q);
            if (inTitle) return true;
            return entry.row.some((cell) => String(cell).toLowerCase().includes(q));
          });
        return { table, rows };
      });
  }, [tables, showSavedOnly, memorizedTableIds, searchQuery, minImportance, lectureFilter]);

  const visibleRowTotal = filteredTables.reduce((sum, entry) => sum + entry.rows.length, 0);
  const totalRowCount = tables.reduce((sum, table) => sum + table.rows.length, 0);

  if (!tables || tables.length === 0) {
    return (
      <div className="pending-box" style={{ margin: "40px auto", maxWidth: 600 }}>
        <div className="pb-ic"><Icons.Table size={34} /></div>
        <div className="pb-t">لا توجد جداول شارحة متوفرة حالياً لهذه المادة</div>
      </div>
    );
  }

  return (
    <div id="tablesView" ref={containerRef}>
      <div className="headline">
        <div className="kicker">
          <span className="dot" />
          <span>الجداول الشارحة وجداول المقارنة الأكاديمية</span>
        </div>
        <h1>جداول المقارنة والمفاهيم الشارحة</h1>
        <p className="sub">
          إجمالي {tables.length} جدولاً · المعروض: {filteredTables.length} جدولاً ·{" "}
          {visibleRowTotal} صفاً من {totalRowCount}
        </p>
      </div>

      <div className="fchips tbl-toolbar" style={{ marginBottom: "14px" }}>
        {[
          { val: 1, label: "الكل (افتراضي)" },
          { val: 3, label: "أهمية 3+" },
          { val: 4, label: "أهمية 4+" },
          { val: 5, label: "صفوة 5" }
        ].map((lvl) => (
          <button
            key={lvl.val}
            type="button"
            className={`fchip ${minImportance === lvl.val ? "on" : ""}`}
            onClick={() => handleImportanceChange(lvl.val)}
          >
            {lvl.label}
          </button>
        ))}

        <button
          type="button"
          className={`fchip ${showSavedOnly ? "on" : ""}`}
          onClick={() => setShowSavedOnly(!showSavedOnly)}
        >
          <Icons.Bookmark size={13} />
          المحفوظة ({memorizedTableIds.length})
        </button>

        <button
          type="button"
          className={`fchip ${forceCards ? "on" : ""}`}
          onClick={toggleCards}
          title="عرض الجداول كبطاقات متجاوبة بدل الجدول العريض"
        >
          <Icons.Grid size={13} />
          وضع البطاقات
        </button>

        <div className="tbl-legend">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <span key={lvl} className={`tbl-legend-item imp-${lvl}`}>
              <i /> {IMPORTANCE_LABEL[lvl]}
            </span>
          ))}
        </div>

      </div>

      {/* شريط البحث الموحد الأنيق للجداول */}
      <div className="unified-search-box" style={{ margin: "8px 0 16px" }}>
        <Icons.Search size={16} style={{ color: "var(--acc)", flexShrink: 0 }} />
        <input
          type="search"
          placeholder="ابحث في عناوين الجداول والمفاهيم والصفوف المقارنة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="البحث في الجداول"
        />
        {searchQuery && (
          <span className="search-count-badge">
            {filteredTables.length} جدول
          </span>
        )}
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            style={{ background: "none", border: "none", color: "var(--ink-m)", cursor: "pointer", padding: "4px", display: "flex" }}
            title="مسح البحث"
            aria-label="مسح البحث"
          >
            <Icons.Cross size={14} />
          </button>
        )}
      </div>

      <div className={`tbl-list ${forceCards ? "tbl-force-cards" : ""}`}>
        {filteredTables.length === 0 && (
          <div className="pending-box">
            <div className="pb-ic"><Icons.Filter size={30} /></div>
            <div className="pb-t">لا توجد جداول أو صفوف تطابق الفلاتر الحالية</div>
          </div>
        )}

        {filteredTables.map(({ table, rows }) => {
          const colPercentages = getColPercentages(table.cols.length);
          const isSaved = memorizedTableIds.includes(table.id);
          const isExpanded = expandedTables[table.id] || rows.length <= COLLAPSE_THRESHOLD;
          const visibleRows = isExpanded ? rows : rows.slice(0, COLLAPSE_THRESHOLD);

          return (
            <article
              key={table.id}
              className={`tbl-card ${isSaved ? "memorized" : ""}`}
              id={`tbl-${table.id}`}
            >
              <div className="tbl-card-head">
                <div className="tbl-card-title-wrap">
                  <h3 className="tbl-card-title">{table.title_ar}</h3>
                  {table.title && <span className="tbl-card-en">{table.title}</span>}
                  <span className="tbl-count">{rows.length} صفاً معروضاً</span>
                </div>

                <div className="tbl-card-actions">
                  {Array.from(new Set(table.refs || [])).map((ref) => (
                    <button
                      key={ref}
                      type="button"
                      className="ref-chip"
                      onClick={() => onJumpToSlide(ref)}
                      title={`معاينة شريحة ${ref}`}
                    >
                      <Icons.Slides size={12} />
                      <span>{ref}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    className="ref-chip"
                    onClick={() => handleCopyMarkdown(table)}
                    title="نسخ الجدول كـ Markdown إلى الحافظة"
                  >
                    <Icons.Copy size={12} />
                    <span>{copiedTableId === table.id ? "تم النسخ" : "نسخ Markdown"}</span>
                  </button>

                  <button
                    type="button"
                    className={`ref-chip tcard-seen-btn ${isSaved ? "on" : ""}`}
                    onClick={() => onToggleMemorize(table.id)}
                    title={isSaved ? "إلغاء الحفظ" : "حفظ للمراجعة"}
                  >
                    <Icons.Bookmark size={12} />
                    <span>{isSaved ? "محفوظ" : "حفظ"}</span>
                  </button>
                </div>
              </div>

              {table.note_ar && (
                <div className="tcard-note">
                  <Icons.Tip size={14} />
                  <span>{table.note_ar}</span>
                </div>
              )}

              <div className="tbl-wrap">
                <div className="tbl-scale">
                  <table className="tbl">
                    <thead>
                      <tr>
                        {table.cols.map((col, cIdx) => (
                          <th
                            key={cIdx}
                            style={{
                              width: colPercentages[cIdx],
                              textAlign: col.ltr ? "left" : "right",
                              direction: col.ltr ? "ltr" : "rtl"
                            }}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map(({ row, index: rIdx, imp }) => (
                        <tr key={rIdx} className={`trow imp-row-${imp}`}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              data-label={table.cols[cIdx]?.label || ""}
                              style={{
                                textAlign: table.cols[cIdx]?.ltr ? "left" : "right",
                                direction: table.cols[cIdx]?.ltr ? "ltr" : "rtl"
                              }}
                            >
                              {cIdx === 0 && (
                                <span
                                  className={`imp-dot imp-${imp}`}
                                  title={`أهمية امتحانية: ${imp} من 5 (${IMPORTANCE_LABEL[imp]})`}
                                />
                              )}
                              <span dangerouslySetInnerHTML={{ __html: String(cell) }} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {rows.length > COLLAPSE_THRESHOLD && (
                <button
                  type="button"
                  className="tbl-expand-btn"
                  onClick={() =>
                    setExpandedTables((prev) => ({ ...prev, [table.id]: !prev[table.id] }))
                  }
                >
                  {isExpanded
                    ? "طي الصفوف الإضافية"
                    : `عرض بقية الصفوف (+${rows.length - COLLAPSE_THRESHOLD})`}
                  <Icons.ChevronDown size={14} className={isExpanded ? "rot" : ""} />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};


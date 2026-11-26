// ==============================================================================
// المنصة التعليمية الموحدة — السايدبار المكتبي الأصيل والتنقل الجوالي
// Exact authentic markup and styling matching RM_Viewer and TOC_Slides_Viewer
// Zero Emojis Standard
// ==============================================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import type { ActiveView, ExplanatoryTable, QuestionModelInfo } from "../../types";

interface CompanionNavigationProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  lectures?: Array<{ id: string; title_ar: string; title_en?: string; slides_count: number }>;
  activeLectureId?: string;
  onSelectLecture?: (id: string) => void;
  models?: QuestionModelInfo[];
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  availableViews?: Partial<Record<ActiveView, boolean>>;
  summaryParts?: Array<{ lec: string; title: string }>;
  emergencySections?: Array<{ id: string; nav_title?: string; title: string }>;
  patternRules?: Array<{ id: string; title: string }>;
  labSessions?: Array<{ id: string; title_ar: string }>;
  activeLabSession?: string;
  onSelectLabSession?: (id: string) => void;
  pageLayout?: "slides" | "book";
  tables?: ExplanatoryTable[];
  reviewedParts?: string[];
  reviewedSections?: string[];
  answeredQuestions?: Record<string, { selected_answer: number; is_correct: boolean }>;
  questions?: Array<{ id: string; model_id: string }>;
  counts?: {
    lectures?: number;
    tables?: number;
    questions?: number;
  };
}

export const CompanionNavigation: React.FC<CompanionNavigationProps> = ({
  activeView,
  onSelectView,
  lectures = [],
  activeLectureId = "all",
  onSelectLecture,
  models = [],
  selectedModelId = "all",
  onSelectModel,
  availableViews,
  summaryParts = [],
  emergencySections = [],
  patternRules = [],
  labSessions = [],
  activeLabSession = "all",
  onSelectLabSession,
  pageLayout = "slides",
  tables = [],
  reviewedParts = [],
  reviewedSections = [],
  answeredQuestions = {},
  questions = []
}) => {
  const isBookLayout = pageLayout === "book";
  const can = (view: ActiveView) => availableViews?.[view] !== false;
  const showsLectureList = ["slides", "summary", "tables"].includes(activeView);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [activeEmergencyId, setActiveEmergencyId] = useState<string>("");
  const [activePatternId, setActivePatternId] = useState<string>("");

  // تتبع المحور النشط في ملخص الملخص والأنماط للسايدبار المكتبي والناف بار السفلي للجوال
  useEffect(() => {
    if (activeView === "emergency" && emergencySections.length > 0) {
      setActiveEmergencyId((prev) =>
        emergencySections.some((s) => s.id === prev) ? prev : emergencySections[0].id
      );
      if (typeof IntersectionObserver === "undefined") return;
      const obs = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]?.target?.id) {
            setActiveEmergencyId(visible[0].target.id);
          }
        },
        { rootMargin: "-18% 0px -65% 0px", threshold: 0.05 }
      );
      const timer = window.setTimeout(() => {
        emergencySections.forEach((sec) => {
          const el = document.getElementById(sec.id);
          if (el) obs.observe(el);
        });
      }, 120);
      return () => {
        window.clearTimeout(timer);
        obs.disconnect();
      };
    }

    if (activeView === "patterns" && patternRules.length > 0) {
      setActivePatternId((prev) =>
        patternRules.some((r) => r.id === prev) ? prev : patternRules[0].id
      );
      if (typeof IntersectionObserver === "undefined") return;
      const obs = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const id = visible[0]?.target?.id;
          if (id && id.startsWith("pat-")) {
            setActivePatternId(id.slice(4));
          }
        },
        { rootMargin: "-18% 0px -65% 0px", threshold: 0.05 }
      );
      const timer = window.setTimeout(() => {
        patternRules.forEach((rule) => {
          const el = document.getElementById(`pat-${rule.id}`);
          if (el) obs.observe(el);
        });
      }, 120);
      return () => {
        window.clearTimeout(timer);
        obs.disconnect();
      };
    }
  }, [activeView, emergencySections, patternRules]);

  const tableLectureIds = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.lec) set.add(t.lec);
    });
    return Array.from(set).sort((a, b) => {
      const na = Number(a.replace(/\D+/g, "")) || 999;
      const nb = Number(b.replace(/\D+/g, "")) || 999;
      return na - nb;
    });
  }, [tables]);

  type BottomNavItem = {
    id: string;
    label: string;
    title?: string;
    active: boolean;
    done?: boolean;
    onClick: () => void;
  };

  const bottomItems = useMemo<BottomNavItem[]>(() => {
    if (activeView === "slides" && lectures.length > 0) {
      return [
        {
          id: "all",
          label: "الكل",
          title: "كل المحاضرات",
          active: activeLectureId === "all",
          onClick: () => {
            onSelectLecture?.("all");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
        ...lectures.map((lec) => ({
          id: lec.id,
          label: lec.id,
          title: lec.title_ar,
          active: activeLectureId === lec.id,
          onClick: () => {
            onSelectLecture?.(lec.id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }))
      ];
    }

    if (activeView === "summary") {
      const list = summaryParts.length > 0 ? summaryParts.map((p) => ({ id: p.lec, title: p.title })) : lectures.map((l) => ({ id: l.id, title: l.title_ar }));
      if (list.length === 0) return [];
      return [
        {
          id: "all",
          label: "البداية",
          title: "أعلى الملخص المتواصل",
          active: activeLectureId === "all",
          onClick: () => {
            onSelectLecture?.("all");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
        ...list.map((p) => ({
          id: p.id,
          label: p.id,
          title: p.title,
          active: activeLectureId === p.id,
          done: reviewedParts.includes(p.id),
          onClick: () => {
            onSelectLecture?.(p.id);
            const targetEl = document.getElementById(`part-${p.id}`);
            if (targetEl) {
              targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }
        }))
      ];
    }

    if (activeView === "tables" && tableLectureIds.length > 1) {
      return [
        {
          id: "all",
          label: "الكل",
          title: "كل الجداول",
          active: activeLectureId === "all",
          onClick: () => {
            onSelectLecture?.("all");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
        ...tableLectureIds.map((lecId) => ({
          id: lecId,
          label: lecId,
          title: lectures.find((l) => l.id === lecId)?.title_ar || lecId,
          active: activeLectureId === lecId,
          onClick: () => {
            onSelectLecture?.(activeLectureId === lecId ? "all" : lecId);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }))
      ];
    }

    if (activeView === "emergency" && emergencySections.length > 0) {
      return emergencySections.map((sec) => ({
        id: sec.id,
        label: sec.nav_title || sec.title,
        title: sec.title,
        active: activeEmergencyId === sec.id,
        done: reviewedSections.includes(sec.id),
        onClick: () => {
          setActiveEmergencyId(sec.id);
          const el = document.getElementById(sec.id);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }));
    }

    if (activeView === "questions" && models.length > 0) {
      return [
        {
          id: "all",
          label: "الشامل",
          title: "البنك الموحد الكامل",
          active: selectedModelId === "all",
          onClick: () => {
            onSelectModel?.("all");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
        ...models.map((m) => {
          const modelQs = questions.filter((q) => q.model_id === m.id);
          const allRight =
            modelQs.length > 0 &&
            modelQs.every((q: any) => q.id && answeredQuestions[q.id]?.is_correct);
          return {
            id: m.id,
            label: m.short_label || m.id.toUpperCase(),
            title: m.title_ar,
            active: selectedModelId === m.id,
            done: allRight,
            onClick: () => {
              onSelectModel?.(m.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          };
        })
      ];
    }

    if (activeView === "patterns" && patternRules.length > 0) {
      return patternRules.map((rule) => ({
        id: rule.id,
        label: rule.id.toUpperCase(),
        title: rule.title,
        active: activePatternId === rule.id,
        onClick: () => {
          setActivePatternId(rule.id);
          const el = document.getElementById(`pat-${rule.id}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }));
    }

    if (activeView === "lab" && labSessions.length > 0) {
      return [
        {
          id: "all",
          label: "الكل",
          title: "كل الجلسات العملية",
          active: activeLabSession === "all",
          onClick: () => {
            onSelectLabSession?.("all");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        },
        ...labSessions.map((s) => ({
          id: s.id,
          label: s.id,
          title: s.title_ar,
          active: activeLabSession === s.id,
          onClick: () => {
            onSelectLabSession?.(s.id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }))
      ];
    }

    return [];
  }, [
    activeView,
    lectures,
    activeLectureId,
    onSelectLecture,
    summaryParts,
    reviewedParts,
    tableLectureIds,
    emergencySections,
    reviewedSections,
    models,
    selectedModelId,
    onSelectModel,
    questions,
    answeredQuestions,
    patternRules,
    activeEmergencyId,
    activePatternId,
    labSessions,
    activeLabSession,
    onSelectLabSession
  ]);

  useEffect(() => {
    const el = bottomScrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>("button.active");
    if (activeBtn) {
      activeBtn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [activeView, activeLectureId, selectedModelId, activeEmergencyId, activePatternId, activeLabSession, bottomItems.length]);
  return (
    <>
      {/* Desktop Authentic Sidebar (.side#sideNav) */}
      <nav className="side" id="sideNav" aria-label="التنقل">
        {/* قطاع تبديل الأقسام السريع (.view-seg) */}
        <div className="view-seg">
          <button
            type="button"
            className={activeView === "slides" ? "active" : ""}
            style={{ display: can("slides") ? undefined : "none" }}
            onClick={() => onSelectView("slides")}
          >
            {isBookLayout ? (
              <Icons.BookOpen size={18} />
            ) : (
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8"/>
                <path d="M12 17v4"/>
              </svg>
            )}
            <span>{isBookLayout ? "الكتاب" : "السلايدات"}</span>
          </button>

          <button
            type="button"
            className={activeView === "summary" ? "active" : ""}
            style={{ display: can("summary") ? undefined : "none" }}
            onClick={() => onSelectView("summary")}
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>الملخص</span>
          </button>

          <button
            type="button"
            className={activeView === "emergency" ? "active" : ""}
            style={{ display: can("emergency") ? undefined : "none" }}
            onClick={() => onSelectView("emergency")}
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>ملخص الملخص</span>
          </button>

          <button
            type="button"
            className={activeView === "tables" ? "active" : ""}
            style={{ display: can("tables") ? undefined : "none" }}
            onClick={() => onSelectView("tables")}
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18"/>
              <path d="M3 15h18"/>
              <path d="M9 3v18"/>
            </svg>
            <span>الجداول</span>
          </button>

          <button
            type="button"
            className={activeView === "questions" ? "active" : ""}
            style={{ display: can("questions") ? undefined : "none" }}
            onClick={() => onSelectView("questions")}
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <path d="M9 14l2 2 4-4"/>
            </svg>
            <span>النماذج</span>
          </button>

          <button
            type="button"
            className={activeView === "explorer" ? "active" : ""}
            style={{ display: can("explorer") ? undefined : "none" }}
            onClick={() => onSelectView("explorer")}
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>المستكشف</span>
          </button>

          <button
            type="button"
            className={activeView === "interactive" ? "active" : ""}
            style={{ display: can("interactive") ? undefined : "none" }}
            onClick={() => onSelectView("interactive")}
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
            <span>التفاعلي</span>
          </button>

          <button
            type="button"
            className={activeView === "exam" ? "active" : ""}
            style={{ display: can("exam") ? undefined : "none" }}
            onClick={() => onSelectView("exam")}
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span>الاختبار</span>
          </button>

          {can("definitions") && (
            <button type="button" className={activeView === "definitions" ? "active" : ""} onClick={() => onSelectView("definitions")}>
              <Icons.Definitions size={18} />
              <span>التعاريف</span>
            </button>
          )}

          {can("glossary") && (
            <button type="button" className={activeView === "glossary" ? "active" : ""} onClick={() => onSelectView("glossary")}>
              <Icons.Glossary size={18} />
              <span>المعجم</span>
            </button>
          )}

          {can("patterns") && (
            <button type="button" className={activeView === "patterns" ? "active" : ""} onClick={() => onSelectView("patterns")}>
              <Icons.Patterns size={18} />
              <span>الأنماط</span>
            </button>
          )}

          {can("lab") && (
            <button type="button" className={activeView === "lab" ? "active" : ""} onClick={() => onSelectView("lab")}>
              <Icons.Lab size={18} />
              <span>العملي</span>
            </button>
          )}
        </div>

        {/* 1. قائمة نماذج بنك الأسئلة عند التواجد في قسم النماذج (#modelsNav) */}
        {activeView === "questions" && models.length > 0 && (
          <div id="modelsNav">
            <div className="side-title">نماذج الاختبارات</div>
            <div id="modelList">
              <button
                type="button"
                className={`lec-btn is-allbank ${selectedModelId === "all" ? "active" : ""}`}
                onClick={() => onSelectModel && onSelectModel("all")}
              >
                <span className="lt">
                  <span>البنك الموحد الكامل</span>
                  <span className="cnt">شامل</span>
                </span>
                <span className="le">All Models Merged</span>
              </button>

              {models.map((m) => {
                const isActive = selectedModelId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`lec-btn ${isActive ? "active" : ""}`}
                    onClick={() => onSelectModel && onSelectModel(m.id)}
                  >
                    <span className="lt">
                      <span>{m.title_ar}</span>
                      {m.kind && <span className="cnt">{m.kind}</span>}
                    </span>
                    {m.origin_ar && <span className="le">{m.origin_ar}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. قائمة المحاضرات الدراسية الأصيلة (.lec-btn) للسلايدات والملخص والجداول (#slidesNav) */}
        {showsLectureList && (
          <div id="slidesNav">
            <div className="side-title">{isBookLayout ? "فصول الكتاب المرجعي" : "المحاضرات الدراسية"}</div>
            <div id="lecList">
              <button
                type="button"
                className={`lec-btn ${activeLectureId === "all" ? "active" : ""}`}
                onClick={() => {
                  onSelectLecture?.("all");
                  if (activeView === "summary") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                <span className="lt">
                  <span>{activeView === "summary" ? "أعلى الملخص المتواصل" : isBookLayout ? "كل الفصول" : "كل المحاضرات"}</span>
                  <span className="cnt">{lectures.length} {isBookLayout ? "فصل" : "محاضرة"}</span>
                </span>
              </button>

              {lectures.map((lec) => {
                const isActive = activeLectureId === lec.id;
                return (
                  <button
                    key={lec.id}
                    type="button"
                    className={`lec-btn ${isActive ? "active" : ""}`}
                    onClick={() => {
                      onSelectLecture?.(lec.id);
                      if (activeView === "summary") {
                        const targetEl = document.getElementById(`part-${lec.id}`);
                        if (targetEl) {
                          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }
                    }}
                  >
                    <span className="lt">
                      <span>{lec.id}: {lec.title_ar}</span>
                      {lec.slides_count > 0 && (
                        <span className="cnt">{lec.slides_count} {isBookLayout ? "صفحة" : "شريحة"}</span>
                      )}
                    </span>
                    {lec.title_en && <span className="le">{lec.title_en}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. فهرس محاور ملخص الملخص على اللابتوب (#emergencyNav) */}
        {activeView === "emergency" && emergencySections.length > 0 && (
          <div id="emergencyNav">
            <div className="side-title">محاور ملخص الملخص</div>
            <div id="emergencyList">
              {emergencySections.map((sec, idx) => {
                const isActive = activeEmergencyId === sec.id;
                const isDone = reviewedSections.includes(sec.id);
                return (
                  <button
                    key={sec.id}
                    type="button"
                    className={`lec-btn ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActiveEmergencyId(sec.id);
                      const el = document.getElementById(sec.id);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <span className="lt">
                      <span>{sec.nav_title || sec.title}</span>
                      <span className="cnt">{isDone ? "تم" : `${idx + 1}`}</span>
                    </span>
                    {sec.nav_title && sec.title !== sec.nav_title && (
                      <span className="le">{sec.title}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. فهرس قواعد أنماط الأسئلة على اللابتوب (#patternsNav) */}
        {activeView === "patterns" && patternRules.length > 0 && (
          <div id="patternsNav">
            <div className="side-title">قواعد الأنماط</div>
            <div id="patternsList">
              {patternRules.map((rule) => {
                const isActive = activePatternId === rule.id;
                return (
                  <button
                    key={rule.id}
                    type="button"
                    className={`lec-btn ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActivePatternId(rule.id);
                      const el = document.getElementById(`pat-${rule.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <span className="lt">
                      <span>{rule.title}</span>
                      <span className="cnt">{rule.id.toUpperCase()}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. فهرس الجلسات العملية على اللابتوب (#labNav) */}
        {activeView === "lab" && labSessions.length > 0 && (
          <div id="labNav">
            <div className="side-title">الجلسات العملية</div>
            <div id="labList">
              <button
                type="button"
                className={`lec-btn ${activeLabSession === "all" ? "active" : ""}`}
                onClick={() => {
                  onSelectLabSession?.("all");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span className="lt">
                  <span>كل الجلسات العملية</span>
                  <span className="cnt">{labSessions.length}</span>
                </span>
              </button>
              {labSessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`lec-btn ${activeLabSession === s.id ? "active" : ""}`}
                  onClick={() => {
                    onSelectLabSession?.(s.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <span className="lt">
                    <span>{s.title_ar}</span>
                    <span className="cnt">{s.id}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="side-note" style={{ marginTop: "auto", paddingTop: "16px" }}>
          <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>المنصة الموحدة — محتوى معتمد ومطابق للسلايدات الرسمية.</span>
        </div>

        <div className="side-kbd">Ctrl+B لإخفاء / إظهار القائمة · Z للتكبير</div>
      </nav>

      {/* شريط الفصول والأجزاء والنماذج السفلي للهواتف الأصيل (.bottom-nav) — بدون تكرار لأقسام التوبار */}
      {bottomItems.length > 0 && (
        <nav className="bottom-nav" id="bottomNav" aria-label="الفصول والأجزاء">
          <div className="bn-lecs" ref={bottomScrollRef}>
            {bottomItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${item.active ? "active" : ""} ${item.done ? "done" : ""}`.trim()}
                onClick={item.onClick}
                title={item.title || item.label}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
};


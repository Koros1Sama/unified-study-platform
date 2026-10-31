// ==============================================================================
// المنصة التعليمية الموحدة — السايدبار المكتبي الأصيل والتنقل الجوالي
// Exact authentic markup and styling matching RM_Viewer and TOC_Slides_Viewer
// Zero Emojis Standard
// ==============================================================================

import React from "react";
import { Icons } from "../icons/SvgIcons";
import type { ActiveView, QuestionModelInfo } from "../../types";

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
  availableViews
}) => {
  const can = (view: ActiveView) => availableViews?.[view] !== false;
  const showsLectureList = ["slides", "summary", "tables"].includes(activeView);
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
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8"/>
              <path d="M12 17v4"/>
            </svg>
            <span>السلايدات</span>
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
              <span>المعمل</span>
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
            <div className="side-title">المحاضرات الدراسية</div>
            <div id="lecList">
              <button
                type="button"
                className={`lec-btn ${activeLectureId === "all" ? "active" : ""}`}
                onClick={() => onSelectLecture && onSelectLecture("all")}
              >
                <span className="lt">
                  <span>كل المحاضرات</span>
                  <span className="cnt">{lectures.length} محاضرة</span>
                </span>
              </button>

              {lectures.map((lec) => {
                const isActive = activeLectureId === lec.id;
                return (
                  <button
                    key={lec.id}
                    type="button"
                    className={`lec-btn ${isActive ? "active" : ""}`}
                    onClick={() => onSelectLecture && onSelectLecture(lec.id)}
                  >
                    <span className="lt">
                      <span>{lec.id}: {lec.title_ar}</span>
                      {lec.slides_count > 0 && (
                        <span className="cnt">{lec.slides_count} شريحة</span>
                      )}
                    </span>
                    {lec.title_en && <span className="le">{lec.title_en}</span>}
                  </button>
                );
              })}
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

      {/* شريط التنقل السفلي للهواتف الأصيل (.bottom-nav) — مخفي تلقائياً على الشاشات المكتبية */}
      <nav className="bottom-nav" id="bottomNav" aria-label="التنقل السريع للهواتف">
        <div className="bn-lecs">
          {[
            { id: "slides" as ActiveView, label: "السلايدات" },
            { id: "summary" as ActiveView, label: "الملخص" },
            { id: "emergency" as ActiveView, label: "الإنقاذ" },
            { id: "tables" as ActiveView, label: "الجداول" },
            { id: "questions" as ActiveView, label: "النماذج" },
            { id: "interactive" as ActiveView, label: "التفاعلي" },
            { id: "exam" as ActiveView, label: "الاختبار" },
            { id: "definitions" as ActiveView, label: "التعاريف" },
            { id: "glossary" as ActiveView, label: "المعجم" },
            { id: "patterns" as ActiveView, label: "الأنماط" },
            { id: "lab" as ActiveView, label: "المعمل" },
            { id: "explorer" as ActiveView, label: "المستكشف" }
          ]
            .filter((item) => can(item.id))
            .map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={isActive ? "active" : ""}
                onClick={() => onSelectView(item.id)}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};


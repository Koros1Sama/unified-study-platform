// ==============================================================================
// المنصة التعليمية الموحدة — التوبار الحركي الممتد (Authentic Kinetic Topbar)
// Identical styling to RM_Viewer and TOC_Slides_Viewer · 11 Themes · Zero Emojis
// ==============================================================================

import React, { useEffect, useState, useRef } from "react";
import { Icons } from "../icons/SvgIcons";
import type { SubjectMeta, ActiveView, ZenZoomLevel, ExplanationMode } from "../../types";

export const THEME_LIST = [
  { id: "amber", name: "كهرماني دافئ" },
  { id: "amber-classic", name: "كهرماني كلاسيكي" },
  { id: "obsidian", name: "أوبسيديان ملكي" },
  { id: "emerald", name: "زمردي ليلي" },
  { id: "ocean", name: "المحيط الكحلي" },
  { id: "amethyst", name: "جمشت بنفسجي" },
  { id: "crimson", name: "قرمزي داكن" },
  { id: "neon", name: "نيون سايبر" },
  { id: "mist", name: "ضباب النهار" },
  { id: "sage", name: "مريمية الصباح" },
  { id: "rose", name: "وردي مخملي" }
];

interface UnifiedAppHeaderProps {
  currentSubject: SubjectMeta;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenPortal: () => void;
  zenLevel: ZenZoomLevel;
  onZenChange: (level: ZenZoomLevel) => void;
  languageMode: "smart" | "en" | "ar" | "both";
  onLanguageChange: (lang: "smart" | "en" | "ar" | "both") => void;
  autoTranslateSlides: boolean;
  onToggleAutoTranslate: () => void;
  autoExplainSlides: boolean;
  onToggleAutoExplain: () => void;
  availableViews?: Partial<Record<ActiveView, boolean>>;
  shuffleChoices?: boolean;
  onToggleShuffleChoices?: () => void;
  shuffleQuestions?: boolean;
  onToggleShuffleQuestions?: () => void;
  shuffleSeed?: number;
  onChangeShuffleSeed?: (seed: number) => void;
  showBookmarks?: boolean;
  onToggleShowBookmarks?: (show: boolean) => void;
  onOpenBmLabelModal?: () => void;
  expMode?: ExplanationMode;
  onChangeExpMode?: (mode: ExplanationMode) => void;
  progressPct?: number;
  onResetProgress?: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenShortcuts?: () => void;
  onOpenOfflineModal?: () => void;
  fontScale?: number;
  onChangeFontScale?: (scale: number) => void;
  onExportProgress?: () => void;
  canInstallPwa?: boolean;
  isPwaInstalled?: boolean;
  onPromptPwaInstall?: () => void;
  onReshuffle?: () => void;
  isIos?: boolean;
  isDesktop?: boolean;
}

export const UnifiedAppHeader: React.FC<UnifiedAppHeaderProps> = ({
  currentSubject,
  activeView,
  onSelectView,
  onOpenPortal,
  zenLevel,
  onZenChange,
  languageMode,
  onLanguageChange,
  autoTranslateSlides,
  onToggleAutoTranslate,
  autoExplainSlides,
  onToggleAutoExplain,
  availableViews,
  shuffleChoices = false,
  onToggleShuffleChoices,
  shuffleQuestions = false,
  onToggleShuffleQuestions,
  shuffleSeed = 1,
  onChangeShuffleSeed,
  showBookmarks = true,
  onToggleShowBookmarks,
  onOpenBmLabelModal,
  expMode = "always",
  onChangeExpMode,
  progressPct = 0,
  onResetProgress,
  onOpenGlobalSearch,
  onOpenShortcuts,
  onOpenOfflineModal,
  fontScale = 100,
  onChangeFontScale,
  onExportProgress,
  canInstallPwa = false,
  isPwaInstalled = false,
  onPromptPwaInstall,
  onReshuffle,
  isIos = false,
  isDesktop = false
}) => {
  const [isHidden, setIsHidden] = useState(false);
  const [isSetOpen, setIsSetOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("unified_theme") || "amber");
  const [mode, setMode] = useState<"dark" | "light">(() => (localStorage.getItem("unified_mode") as "dark" | "light") || "dark");
  const lastScrollY = useRef(0);
  const moreRef = useRef<HTMLDivElement>(null);
  const setPanelRef = useRef<HTMLDivElement>(null);
  const btnSetRef = useRef<HTMLButtonElement>(null);

  const can = (view: ActiveView) => availableViews?.[view] !== false;

  useEffect(() => {
    if (!isMoreOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMoreOpen]);

  // تحديث الثيم والنمط على مستوى مستند الـ HTML
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("unified_theme", theme);
    localStorage.setItem("unified_mode", mode);
  }, [theme, mode]);

  // إغلاق لوحة الإعدادات عند النقر بالخارج أو الضغط على زر ESC
  useEffect(() => {
    if (!isSetOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        setPanelRef.current &&
        !setPanelRef.current.contains(target) &&
        btnSetRef.current &&
        !btnSetRef.current.contains(target)
      ) {
        setIsSetOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSetOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSetOpen]);

  // إخفاء التوبار عند النزول وإظهاره عند الصعود (مع إبقائه ظاهراً دائماً إن كانت الإعدادات مفتوحة)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (isSetOpen) {
        // عند فتح الإعدادات يظل التوبار ثابتاً ولا تغلق اللوحة أثناء التمرير
        setIsHidden(false);
        lastScrollY.current = currentScrollY;
        return;
      }
      if (currentScrollY > 100 && currentScrollY > lastScrollY.current + 8) {
        setIsHidden(true);
      } else if (currentScrollY < lastScrollY.current - 8 || currentScrollY <= 20) {
        setIsHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSetOpen]);

  const toggleMode = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`topbar ${isHidden ? "topbar-hidden" : ""}`}>
      <div className="topbar-in">
        {/* Brand with Subject Switcher */}
        <div
          className="brand"
          onClick={onOpenPortal}
          style={{ cursor: "pointer" }}
          title="انقر لتبديل المادة الدراسية (المقررات)"
        >
          <span className="lm" id="brandHome" title="بوابة المقررات" aria-label="المقررات">
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <path d="M9 7h6"/>
              <path d="M9 11h6"/>
            </svg>
          </span>
          <span>
            <span id="brandName" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              {currentSubject.name_ar}
              <svg className="svg-ic" style={{ width: 14, height: 14, opacity: 0.7 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
            <small id="brandSub">
              {currentSubject.professor_name ? `${currentSubject.professor_name} · ` : ""}ترم {currentSubject.term}
            </small>
          </span>
        </div>

        {/* Central Segmented Pills Navigation */}
        <div className="top-nav-wrap">
          <div className="seg-pills">
            <button
              type="button"
              className={`seg-pill ${activeView === "slides" ? "active" : ""}`}
              style={{ display: can("slides") ? undefined : "none" }}
              onClick={() => onSelectView("slides")}
              title="عرض سلايدات المحاضرات والشروح"
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
              className={`seg-pill ${activeView === "summary" ? "active" : ""}`}
              style={{ display: can("summary") ? undefined : "none" }}
              onClick={() => onSelectView("summary")}
              title="الملخص النظري الشامل"
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
              className={`seg-pill ${activeView === "emergency" ? "active" : ""}`}
              style={{ display: can("emergency") ? undefined : "none" }}
              onClick={() => onSelectView("emergency")}
              title="ملخص الملخص — الكبسولات المركزة واختبار الفخاخ"
            >
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span>ملخص الملخص</span>
            </button>

            <button
              type="button"
              className={`seg-pill ${activeView === "tables" ? "active" : ""}`}
              style={{ display: can("tables") ? undefined : "none" }}
              onClick={() => onSelectView("tables")}
              title="جداول المقارنات الشارحة المفصلة"
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
              className={`seg-pill ${activeView === "questions" ? "active" : ""}`}
              style={{ display: can("questions") ? undefined : "none" }}
              onClick={() => onSelectView("questions")}
              title="بنك النماذج والأسئلة"
            >
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                <path d="M9 14l2 2 4-4"/>
              </svg>
              <span>النماذج</span>
            </button>

            {can("interactive") && (
            <button
              type="button"
              className={`seg-pill ${activeView === "interactive" ? "active" : ""}`}
              onClick={() => onSelectView("interactive")}
              title="الاستوديوهات والمحاكيات التفاعلية"
            >
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>التفاعلي</span>
            </button>
            )}

            {/* قائمة الأدوات الإضافية: المستكشف، الاختبار، التعاريف، المعجم، الأنماط، المعمل */}
            <div className="more-wrap" ref={moreRef}>
              <button
                type="button"
                className={`seg-pill ${["explorer", "exam", "definitions", "glossary", "patterns", "lab"].includes(activeView) ? "active" : ""}`}
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                aria-expanded={isMoreOpen}
                title="أدوات الدراسة الإضافية"
              >
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.6"/>
                  <circle cx="12" cy="12" r="1.6"/>
                  <circle cx="19" cy="12" r="1.6"/>
                </svg>
                <span>المزيد</span>
              </button>

              {isMoreOpen && (
                <div className="more-menu">
                  {can("explorer") && (
                    <button type="button" className={`more-item ${activeView === "explorer" ? "active" : ""}`} onClick={() => { onSelectView("explorer"); setIsMoreOpen(false); }}>
                      <Icons.Explorer size={16} />
                      <span><b>المستكشف</b><small>بحث متقدم في بنك الأسئلة</small></span>
                    </button>
                  )}
                  {can("exam") && (
                    <button type="button" className={`more-item ${activeView === "exam" ? "active" : ""}`} onClick={() => { onSelectView("exam"); setIsMoreOpen(false); }}>
                      <Icons.Exam size={16} />
                      <span><b>الاختبار</b><small>محاكي بدرجة وتقدير وزمن</small></span>
                    </button>
                  )}
                  {can("definitions") && (
                    <button type="button" className={`more-item ${activeView === "definitions" ? "active" : ""}`} onClick={() => { onSelectView("definitions"); setIsMoreOpen(false); }}>
                      <Icons.Definitions size={16} />
                      <span><b>بنك التعاريف</b><small>Terms · Triggers · Pitfalls</small></span>
                    </button>
                  )}
                  {can("glossary") && (
                    <button type="button" className={`more-item ${activeView === "glossary" ? "active" : ""}`} onClick={() => { onSelectView("glossary"); setIsMoreOpen(false); }}>
                      <Icons.Glossary size={16} />
                      <span><b>المعجم</b><small>مصطلحات وعبارات ثنائية اللغة</small></span>
                    </button>
                  )}
                  {can("patterns") && (
                    <button type="button" className={`more-item ${activeView === "patterns" ? "active" : ""}`} onClick={() => { onSelectView("patterns"); setIsMoreOpen(false); }}>
                      <Icons.Patterns size={16} />
                      <span><b>مختبر الأنماط</b><small>قواعد الحسم والاستثناءات</small></span>
                    </button>
                  )}
                  {can("lab") && (
                    <button type="button" className={`more-item ${activeView === "lab" ? "active" : ""}`} onClick={() => { onSelectView("lab"); setIsMoreOpen(false); }}>
                      <Icons.Lab size={16} />
                      <span><b>الملحق العملي</b><small>معمل معزول عن النظري</small></span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* أدوات السلايدات المساعدة في التوبار */}
          {activeView === "slides" && (
            <div className="slide-actions-wrap" style={{ display: "inline-flex" }}>
              <span className="nav-divider"></span>
              <button
                type="button"
                className={`top-btn slide-action-btn ${autoTranslateSlides ? "on" : ""}`}
                onClick={onToggleAutoTranslate}
                title="إظهار أو إخفاء ترجمات السلايدات التلقائية"
              >
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span className="txt">عربي</span>
              </button>
              <button
                type="button"
                className={`top-btn slide-action-btn ${autoExplainSlides ? "on" : ""}`}
                onClick={onToggleAutoExplain}
                title="إظهار أو إخفاء الشروح التلقائية"
              >
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6"/>
                  <path d="M10 22h4"/>
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                </svg>
                <span className="txt">شرح</span>
              </button>
            </div>
          )}

          {/* أدوات النماذج المساعدة في التوبار */}
          {activeView === "questions" && (
            <div className="model-actions-wrap" style={{ display: "inline-flex" }}>
              <span className="nav-divider"></span>
              <button
                type="button"
                className={`top-btn model-action-btn ${languageMode === "smart" ? "on" : ""}`}
                onClick={() => onLanguageChange("smart")}
                title="الوضع الذكي: الإنجليزية مع نافذة الترجمة بالحوم"
              >
                <span className="txt">ذكي</span>
              </button>
              <button
                type="button"
                className={`top-btn model-action-btn ${languageMode === "en" ? "on" : ""}`}
                onClick={() => onLanguageChange("en")}
                title="عرض الأسئلة بالإنجليزية فقط"
              >
                <span className="txt">English</span>
              </button>
              <button
                type="button"
                className={`top-btn model-action-btn ${languageMode === "ar" ? "on" : ""}`}
                onClick={() => onLanguageChange("ar")}
                title="عرض الأسئلة بالعربية فقط"
              >
                <span className="txt">عربي</span>
              </button>
            </div>
          )}
        </div>

        {/* Top Actions: Portal Switcher, Zen Toggle, Mode Toggle, Settings */}
        <div className="top-actions">
          {/* زر البحث الشامل في كامل المقرر */}
          {onOpenGlobalSearch && (
            <button
              type="button"
              className="top-btn"
              id="btnGlobalSearch"
              onClick={onOpenGlobalSearch}
              title="البحث الشامل في المقرر (Ctrl+K أو /)"
            >
              <Icons.Search size={15} />
              <span className="txt">بحث</span>
            </button>
          )}

          {/* زر بوابة المقررات */}
          <button
            type="button"
            className="top-btn desktop-only"
            id="btnPortal"
            onClick={onOpenPortal}
            title="الانتقال إلى بوابة المقررات والفصول"
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span className="txt">المقررات</span>
          </button>

          {/* كبسولة الأوضاع الثلاثية (Zen Toggle) */}
          <div className="zen-toggle-group" id="zenToggleGroup" role="group" aria-label="أوضاع العرض والتكبير">
            <button
              type="button"
              data-zen="0"
              className={`zen-opt ${zenLevel === 0 ? "active" : ""}`}
              onClick={() => onZenChange(0)}
              title="الوضع العادي (عرض السايدبار والمحتوى الطبيعي)"
            >
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
              <span className="zen-txt">عادي</span>
            </button>
            <button
              type="button"
              data-zen="1"
              className={`zen-opt ${zenLevel === 1 ? "active" : ""}`}
              onClick={() => onZenChange(1)}
              title="وضع التركيز (توسيط المحتوى بدون تشتت)"
            >
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="4"/>
              </svg>
              <span className="zen-txt">تركيز</span>
            </button>
            <button
              type="button"
              data-zen="2"
              className={`zen-opt ${zenLevel === 2 ? "active" : ""}`}
              onClick={() => onZenChange(2)}
              title="وضع التكبير الكامل (ملء الشاشة)"
            >
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
              </svg>
              <span className="zen-txt">تكبير</span>
            </button>
          </div>

          {/* تبديل النمط النهاري / المسائي */}
          <button
            type="button"
            className="top-btn"
            id="btnModeToggle"
            onClick={toggleMode}
            title={mode === "dark" ? "التبديل إلى النمط النهاري" : "التبديل إلى النمط المسائي"}
          >
            <span className="mode-ic" style={{ display: "inline-flex", alignItems: "center" }}>
              {mode === "dark" ? (
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </span>
            <span className="txt">{mode === "dark" ? "نهاري" : "مسائي"}</span>
          </button>

          {/* زر فتح قائمة الإعدادات والثيمات */}
          <button
            ref={btnSetRef}
            type="button"
            className={`top-btn ${isSetOpen ? "on" : ""}`}
            id="btnSet"
            onClick={(e) => {
              e.stopPropagation();
              setIsSetOpen((prev) => !prev);
            }}
            title="الإعدادات والثيمات"
          >
            <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span className="txt">إعدادات</span>
          </button>
        </div>
      </div>

      {/* لوحة الإعدادات المنسدلة (.setwrap) المطابقة للأصل */}
      {isSetOpen && (
        <div
          ref={setPanelRef}
          className="setwrap"
          id="setPanel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* نمط الإضاءة */}
          <div className="setgroup">
            <div className="setlabel">
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
              </svg>
              <span>نمط الإضاءة (نهاري / مسائي)</span>
            </div>
            <div className="setopts">
              <button
                type="button"
                className={`set-opt ${mode === "dark" ? "on" : ""}`}
                onClick={() => setMode("dark")}
              >
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <span>مسائي (داكن)</span>
              </button>
              <button
                type="button"
                className={`set-opt ${mode === "light" ? "on" : ""}`}
                onClick={() => setMode("light")}
              >
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                </svg>
                <span>نهاري (فاتح)</span>
              </button>
            </div>
          </div>

          {/* الثيمات الـ 11 مع الأقراص المقسومة 135 درجة */}
          <div className="setgroup">
            <div className="setlabel">
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>الثيم — 11 ثيماً</span>
            </div>
            <div className="setopts" id="themeRow">
              {THEME_LIST.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`set-opt ${theme === t.id ? "on" : ""}`}
                  data-t={t.id}
                  onClick={() => setTheme(t.id)}
                >
                  <span className="tdot" data-t={t.id}></span>
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* لغة أسئلة البنك */}
          <div className="setgroup">
            <div className="setlabel">
              <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
              </svg>
              <span>لغة أسئلة البنك</span>
            </div>
            <div className="setopts">
              <button
                type="button"
                className={`set-opt ${languageMode === "ar" ? "on" : ""}`}
                onClick={() => onLanguageChange("ar")}
              >
                عربي
              </button>
              <button
                type="button"
                className={`set-opt ${languageMode === "en" ? "on" : ""}`}
                onClick={() => onLanguageChange("en")}
              >
                English
              </button>
              <button
                type="button"
                className={`set-opt ${languageMode === "both" ? "on" : ""}`}
                onClick={() => onLanguageChange("both")}
              >
                الاثنين
              </button>
              <button
                type="button"
                className={`set-opt ${languageMode === "smart" ? "on" : ""}`}
                onClick={() => onLanguageChange("smart")}
              >
                <svg className="svg-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/>
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/>
                </svg>
                <span>ذكي (مرّر يظهر العربي)</span>
              </button>
            </div>
          </div>

          {/* عرض السلايدات */}
          <div className="setgroup">
            <div className="setlabel">
              <Icons.Slides size={16} />
              <span>عرض السلايدات</span>
            </div>
            <div className="setopts">
              <button
                type="button"
                className={`set-opt ${autoTranslateSlides ? "on" : ""}`}
                onClick={onToggleAutoTranslate}
              >
                <Icons.Translate size={14} />
                <span>ترجمة تلقائية</span>
              </button>
              <button
                type="button"
                className={`set-opt ${autoExplainSlides ? "on" : ""}`}
                onClick={onToggleAutoExplain}
              >
                <Icons.Tip size={14} />
                <span>شرح تلقائي</span>
              </button>
            </div>
          </div>

          {/* الترتيب واللخبطة العشوائية */}
          <div className="setgroup">
            <div className="setlabel">
              <Icons.Shuffle size={16} />
              <span>الترتيب واللخبطة العشوائية</span>
            </div>
            <div className="setopts" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button
                type="button"
                className={`set-opt ${shuffleChoices ? "on" : ""}`}
                onClick={onToggleShuffleChoices}
                title="خلط ترتيب خيارات كل سؤال عشوائياً لمقاومة الحفظ المكاني"
              >
                <Icons.Shuffle size={14} />
                <span>لخبطة خيارات السؤال عشوائياً</span>
              </button>
              <button
                type="button"
                className={`set-opt ${shuffleQuestions ? "on" : ""}`}
                onClick={onToggleShuffleQuestions}
                title="ترتيب عشوائي للأسئلة يتغير تلقائياً مع كل إعادة تشغيل، مع إبقاء الأسئلة المحلولة في البداية بنفس ترتيبها المستقر"
              >
                <Icons.List size={14} />
                <span>ترتيب عشوائي للأسئلة (المحلولة أولاً)</span>
              </button>

              {shuffleQuestions && onReshuffle && (
                <div style={{ paddingInlineStart: "6px", marginTop: "2px" }}>
                  <button
                    type="button"
                    className="fchip"
                    onClick={onReshuffle}
                    style={{ fontSize: "0.76rem" }}
                    title="توليد خلط عشوائي جديد الآن لبقية الأسئلة غير المحلولة"
                  >
                    <Icons.Rotate size={13} />
                    <span>إعادة خلط الأسئلة الآن</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* تثبيت تطبيق المنصة (PWA) */}
          <div className="setgroup" id="setGroupPwa">
            <div className="setlabel">
              <Icons.Download size={16} />
              <span>تطبيق المنصة (PWA)</span>
            </div>
            <div className="setopts">
              {isPwaInstalled ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "color-mix(in srgb, #10b981 12%, transparent)", border: "1px solid #10b981", borderRadius: "8px", color: "var(--ink)", width: "100%" }}>
                  <Icons.Check size={16} style={{ color: "#10b981" }} />
                  <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>التطبيق مثبت على جهازك ويعمل أوفلاين</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center", padding: "8px 14px", borderRadius: "var(--r-pill)", fontWeight: 800 }}
                  onClick={onPromptPwaInstall}
                  title={isDesktop ? "تثبيت المنصة على اللابتوب (PWA)" : isIos ? "طريقة تثبيت المنصة على الشاشة الرئيسية للآيفون والآيباد" : "تثبيت المنصة كتطبيق أصيل على جهازك"}
                >
                  <Icons.Download size={15} />
                  <span>{isDesktop ? "تثبيت المنصة على اللابتوب (PWA)" : isIos ? "طريقة التثبيت على الآيفون والآيباد" : "تثبيت المنصة كتطبيق على جهازك (PWA)"}</span>
                </button>
              )}
            </div>
          </div>

          {/* ميزة العلامات الملونة (Bookmarks) */}
          <div className="setgroup" id="setGroupBookmarks">
            <div className="setlabel">
              <Icons.Bookmark size={16} />
              <span>ميزة العلامات الملونة (Bookmarks)</span>
            </div>
            <div className="setopts" id="bmModeOpts">
              <button
                type="button"
                className={`set-opt ${showBookmarks ? "on" : ""}`}
                onClick={() => onToggleShowBookmarks && onToggleShowBookmarks(true)}
              >
                <Icons.Check size={14} />
                <span>إظهار العلامات (مفعلة)</span>
              </button>
              <button
                type="button"
                className={`set-opt ${!showBookmarks ? "on" : ""}`}
                onClick={() => onToggleShowBookmarks && onToggleShowBookmarks(false)}
              >
                <Icons.Cross size={14} />
                <span>إخفاء العلامات (واجهة مبسطة)</span>
              </button>
            </div>
            {onOpenBmLabelModal && (
              <div style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className="fchip"
                  onClick={onOpenBmLabelModal}
                  style={{ fontSize: "0.75rem" }}
                >
                  <Icons.Pen size={12} style={{ marginInlineEnd: 4 }} />
                  <span>تخصيص أسماء ألوان العلامات (أحمر، أصفر، أخضر، أزرق)</span>
                </button>
              </div>
            )}
          </div>

          {/* ظهور الشرح والتعليل في البنك */}
          <div className="setgroup" id="setGroupExp">
            <div className="setlabel">
              <Icons.Eye size={16} />
              <span>ظهور الشرح والتعليل في البنك</span>
            </div>
            <div className="setopts" id="expModeOpts">
              <button
                type="button"
                className={`set-opt ${expMode === "always" ? "on" : ""}`}
                onClick={() => onChangeExpMode && onChangeExpMode("always")}
                title="يفتح الشرح والتعليل تلقائياً فور الإجابة سواء كانت صائبة أو خاطئة"
              >
                <Icons.Check size={14} />
                <span>دائماً (صواب وخطأ) [افتراضي]</span>
              </button>
              <button
                type="button"
                className={`set-opt ${expMode === "wrong_only" ? "on" : ""}`}
                onClick={() => onChangeExpMode && onChangeExpMode("wrong_only")}
                title="يعرض نتيجة الحل فوراً، ويفتح الشرح المفصل تلقائياً فقط إذا كانت الإجابة خاطئة"
              >
                <Icons.Cross size={14} />
                <span>عند الخطأ فقط</span>
              </button>
              <button
                type="button"
                className={`set-opt ${expMode === "manual" ? "on" : ""}`}
                onClick={() => onChangeExpMode && onChangeExpMode("manual")}
                title="يكتفي بعرض صح/خطأ فوراً، ويبقى الشرح مغلقاً حتى تضغط زر عرض الشرح"
              >
                <Icons.Eye size={14} />
                <span>يدوي فقط (عند النقر)</span>
              </button>
            </div>
            <div style={{ fontSize: "0.73rem", color: "var(--ink-m)", marginTop: "6px", lineHeight: 1.5 }}>
              التحكم بالفتح التلقائي للتعليل العلمي وتحليل الخيارات فور الحل؛ يمكنك دائماً طي الشرح أو فتحه في أي سؤال بزر مستقل.
            </div>
          </div>

          {/* مقياس وحجم الخط */}
          <div className="setgroup">
            <div className="setlabel">
              <Icons.Pen size={16} />
              <span>مقياس وحجم الخط</span>
            </div>
            <div className="setopts">
              {[
                { val: 85, label: "85% (أصغر)" },
                { val: 95, label: "95% (مدمج)" },
                { val: 100, label: "100% (افتراضي)" },
                { val: 110, label: "110% (مريح)" },
                { val: 120, label: "120% (كبير)" }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  className={`set-opt ${fontScale === opt.val ? "on" : ""}`}
                  onClick={() => onChangeFontScale && onChangeFontScale(opt.val)}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* أدوات مساعدة: الأوفلاين والاختصارات */}
          <div className="setgroup">
            <div className="setlabel">
              <Icons.Layers size={16} />
              <span>أدوات مساعدة وإضافات</span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {onOpenOfflineModal && (
                <button
                  type="button"
                  className="fchip"
                  onClick={onOpenOfflineModal}
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  <Icons.Download size={14} style={{ marginInlineEnd: 4 }} />
                  <span>حزمة الدراسة بدون إنترنت (Offline Pack)</span>
                </button>
              )}
              {onOpenShortcuts && (
                <button
                  type="button"
                  className="fchip"
                  onClick={onOpenShortcuts}
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  <Icons.Tip size={14} style={{ marginInlineEnd: 4 }} />
                  <span>دليل اختصارات لوحة المفاتيح (?)</span>
                </button>
              )}
              {onExportProgress && (
                <button
                  type="button"
                  className="fchip"
                  onClick={onExportProgress}
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  <Icons.Share size={14} style={{ marginInlineEnd: 4 }} />
                  <span>تصدير نسخة احتياطية من التقدم (JSON)</span>
                </button>
              )}
            </div>
          </div>

          {/* شريط التقدم وتصفير المحفوظات */}
          <div className="setgroup">
            <div className="setlabel">
              <Icons.Target size={16} />
              <span>التقدم الإجمالي</span>
            </div>
            <div className="progress-line">
              <div className="progress-bar">
                <i style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
              </div>
              <span className="progress-txt">{Math.round(progressPct)}%</span>
              {onResetProgress && (
                <button
                  type="button"
                  className="set-opt set-danger"
                  onClick={() => {
                    if (window.confirm("هل أنت متأكد من تصفير كافة إجابات البنك والمحفوظات وعلامات المراجعة لهذا المقرر؟")) {
                      onResetProgress();
                    }
                  }}
                  title="تصفير كل المحفوظات وعلامات المراجعة"
                >
                  <Icons.Reset size={14} />
                  <span>تصفير التقدم</span>
                </button>
              )}
            </div>
          </div>

          {/* معلومات المنصة والمطور */}
          <div className="setgroup">
            <div className="setlabel">
              <Icons.Definitions size={16} />
              <span>عن المنصة</span>
            </div>
            <div className="about-box">
              <span>المنصة التعليمية الموحدة · {currentSubject.name_ar} ({currentSubject.code.toUpperCase()})</span>
              <br />
              <span>إعداد وتطوير: </span>
              <a href="https://t.me/KorosSama" target="_blank" rel="noopener noreferrer">
                <b>عبدالرحمن اسماعيل المخلافي</b>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


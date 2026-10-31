// ==============================================================================
// المنصة التعليمية الموحدة — إطار الاستوديوهات التفاعلية التعليمية المتجهية
// Interactive Studio Host (React SVG Studios & Mathematical Explorers)
// Directive 2 & Rule 8: 100% Mathematical SVG Line-Art · Zero Emojis Standard
// ==============================================================================

import React, { useState, useEffect, useMemo } from "react";
import { Icons } from "../icons/SvgIcons";

interface InteractiveStudioHostProps {
  subjectCode: string;
  initialStudioId?: string;
  initialTabId?: string;
  onReturnToSummary?: () => void;
}

// تطبيع وتعيين معرفات الاستوديوهات الواردة من روابط الملخص
function normalizeStudio(id: string): { studioId: string; defaultTab: string } {
  const lower = (id || "").toLowerCase();
  if (lower.includes("chomsky") || lower.includes("hierarchy")) {
    return { studioId: "chomsky_hierarchy", defaultTab: "hierarchy" };
  }
  if (lower.includes("research") || lower.includes("matrix") || lower.includes("sampling") || lower.includes("method")) {
    return { studioId: "research_matrix", defaultTab: "matrix" };
  }
  if (lower.includes("pda") || lower.includes("stack")) {
    return { studioId: "pda_studio", defaultTab: "sim" };
  }
  if (lower.includes("turing") || lower.includes("tape")) {
    return { studioId: "turing_studio", defaultTab: "sim" };
  }
  return { studioId: "automata_simulator", defaultTab: "sim" };
}

export const InteractiveStudioHost: React.FC<InteractiveStudioHostProps> = ({
  subjectCode,
  initialStudioId = "automata_simulator",
  initialTabId = "sim",
  onReturnToSummary
}) => {
  const initialNorm = useMemo(() => normalizeStudio(initialStudioId), [initialStudioId]);
  const [activeStudioId, setActiveStudioId] = useState<string>(initialNorm.studioId);
  const [activeTabId, setActiveTabId] = useState<string>(initialTabId || initialNorm.defaultTab);

  // مزامنة فورية عند تغير المعرف أو التبويب القادم من الملخص
  useEffect(() => {
    const norm = normalizeStudio(initialStudioId);
    setActiveStudioId(norm.studioId);
    if (initialTabId && initialTabId !== "sim" && initialTabId !== "hierarchy" && initialTabId !== "matrix") {
      // إذا كان التبويب مخصصاً مثل nfa-tree أو comparison أو sampling
      if (initialTabId === "hierarchy-venn") {
        setActiveTabId("hierarchy");
      } else {
        setActiveTabId(initialTabId);
      }
    } else {
      setActiveTabId(initialTabId || norm.defaultTab);
    }
  }, [initialStudioId, initialTabId]);

  // ----------------------------------------------------------------------------
  // 1. حالة محاكي الآلات المنتهية الصورية (DFA Simulator State)
  // ----------------------------------------------------------------------------
  const [inputString, setInputString] = useState<string>("0101");
  const [currentState, setCurrentState] = useState<string>("q0");
  const [simStep, setSimStep] = useState<number>(0);
  const [simHistory, setSimHistory] = useState<
    Array<{ step: number; state: string; char: string; next: string; remaining: string }>
  >([]);

  const runAutomataStep = () => {
    if (simStep >= inputString.length) return;
    const char = inputString[simStep];
    let next = currentState;

    // لغة الآلة: تقبل السلاسل المنتهية بـ 1 على الأبجدية {0, 1}
    // دالة الانتقال: delta(q0, 0)=q0, delta(q0, 1)=q1, delta(q1, 0)=q0, delta(q1, 1)=q1
    if (currentState === "q0") {
      next = char === "1" ? "q1" : "q0";
    } else if (currentState === "q1") {
      next = char === "1" ? "q1" : "q0";
    }

    const nextStep = simStep + 1;
    const remaining = inputString.slice(nextStep);
    setSimHistory((prev) => [
      ...prev,
      { step: nextStep, state: currentState, char, next, remaining }
    ]);
    setCurrentState(next);
    setSimStep(nextStep);
  };

  const resetAutomata = () => {
    setCurrentState("q0");
    setSimStep(0);
    setSimHistory([]);
  };

  const setDfaPreset = (val: string) => {
    setInputString(val);
    setCurrentState("q0");
    setSimStep(0);
    setSimHistory([]);
  };

  // ----------------------------------------------------------------------------
  // 2. حالة هرم تشومسكي التفاعلي (Chomsky Hierarchy State)
  // ----------------------------------------------------------------------------
  const [selectedChomskyType, setSelectedChomskyType] = useState<number>(3);

  const chomskyData = [
    {
      type: 3,
      name_ar: "اللغات المنتظمة (Regular Languages)",
      grammar: "قواعد منتظمة: A -> aB أو A -> a",
      automaton: "آلة منتهية الحالات (DFA / NFA)",
      memory: "بدون ذاكرة مساعدة (فقط الحالة الراهنة)",
      decidable: "جميع المسائل قابلة للتقرير (Emptiness, Equivalence, Membership)",
      pumping: "تخضع لـ Pumping Lemma for Regular Languages",
      compiler: "مرحلة التحليل المعجمي (Lexical Analysis / Tokenizer)",
      example: "(0+1)*1 أو Regex للمتغيرات"
    },
    {
      type: 2,
      name_ar: "اللغات الخالية من السياق (Context-Free Languages)",
      grammar: "قواعد خالية من السياق (CFG): A -> alpha (حيث A رمز غير طرفي)",
      automaton: "آلة المكدس (Pushdown Automaton - PDA)",
      memory: "ذاكرة مكدس ذات وصول مقيد (LIFO Stack)",
      decidable: "الانتماء والخلو قابلان للتقرير، والتكافؤ غير قابل للتقرير (Undecidable)",
      pumping: "تخضع لـ Pumping Lemma for CFLs (uv^i w x^i y)",
      compiler: "مرحلة التحليل النحوي وبناء شجرة الإعراب (Syntax Parsing / AST)",
      example: "{ 0^n 1^n | n >= 1 } وتطابق الأقواس البرمجية"
    },
    {
      type: 1,
      name_ar: "اللغات الحساسة للسياق (Context-Sensitive Languages)",
      grammar: "قواعد حساسة للسياق (CSG): alpha A beta -> alpha gamma beta",
      automaton: "آلة تورنغ محددة الشريط (Linear Bounded Automaton - LBA)",
      memory: "شريط ذاكرة مقيد طولياً بحجم الإدخال (Bounded Tape)",
      decidable: "مسألة الانتماء قابلة للتقرير (Decidable)، بينما الخلو غير قابل",
      pumping: "لا تخضع لنظرية الضخ العادية (تتطلب شروط سياقية معقدة)",
      compiler: "التحليل الدلالي وفحص مطابقة الأنواع (Semantic Analysis / Type Checking)",
      example: "{ a^n b^n c^n | n >= 1 }"
    },
    {
      type: 0,
      name_ar: "اللغات غير المقيدة / القابلة للتعداد عودياً (Recursively Enumerable)",
      grammar: "قواعد غير مقيدة (Unrestricted Grammars): alpha -> beta",
      automaton: "آلة تورنغ القياسية الكاملة (Turing Machine)",
      memory: "شريط لانهائي للقراءة والكتابة والتحرك بالاتجاهين",
      decidable: "مسألة التوقف والانتماء غير قابلة للتقرير (Undecidable / Halting Problem)",
      pumping: "لا تنطبق",
      compiler: "النموذج العام للحوسبة والمعالجات العامة (Universal Computation)",
      example: "أي مسألة حاسوبية قابلة للحل خوارزمياً"
    }
  ];

  // ----------------------------------------------------------------------------
  // 3. حالة مصفوفة مناهج البحث وحاسبة العينات (Research Methodology State)
  // ----------------------------------------------------------------------------
  const [researchPurpose, setResearchPurpose] = useState<"exploratory" | "descriptive" | "explanatory">("explanatory");
  const [dataNature, setDataNature] = useState<"quantitative" | "qualitative" | "mixed">("quantitative");
  const [timeHorizon, setTimeHorizon] = useState<"cross" | "longitudinal">("cross");

  // حاسبة ياماني
  const [populationN, setPopulationN] = useState<number>(1000);
  const [marginE, setMarginE] = useState<number>(0.05);

  const calculatedSampleSize = useMemo(() => {
    if (populationN <= 0) return 0;
    // Yamane Formula: n = N / (1 + N * e^2)
    const denominator = 1 + populationN * (marginE * marginE);
    return Math.ceil(populationN / denominator);
  }, [populationN, marginE]);

  // تحديد المنهجية الموصى بها ديناميكياً
  const methodologyRecommendation = useMemo(() => {
    if (dataNature === "quantitative") {
      if (researchPurpose === "explanatory") {
        return {
          title: "المنهج التجريبي أو المسح السببي (Experimental / Causal-Comparative)",
          tool: "استبانة مغلقة مقننة، اختبارات قياسية قبلية وبعدية",
          sampleStrategy: "عينة احتمالية طبقية أو عشوائية بسيطة بحجم إحصائي كافٍ",
          tip: "التركيز على ضبط المتغيرات الدخيلة، والتحقق من الصدق الظاهري والبنائي وثبات ألفا كرونباخ."
        };
      }
      return {
        title: "المنهج الوصفي المسحي (Descriptive Survey)",
        tool: "استبيانات مقياس ليكرت الخماسي، استمارة تحليل محتوى كمي",
        sampleStrategy: "عينة عشوائية ممثلة لمجتمع البحث الإحصائي",
        tip: "استخدام الجداول المزدوجة ومقاييس النزعة المركزية والتشتت ومعاملات الارتباط."
      };
    }
    if (dataNature === "qualitative") {
      if (researchPurpose === "exploratory") {
        return {
          title: "منهج دراسة الحالة أو النظرية المجذرة (Case Study / Grounded Theory)",
          tool: "مقابلات شبه مهيكلة معمقة، مجموعات التركيز البؤرية (Focus Groups)",
          sampleStrategy: "عينة قصدية غرضية (Purposive Sampling) حتى الوصول لنقطة التشبع النظري",
          tip: "التركيز على صدق المعايشة، ومطابقة الأعضاء (Member Checking)، وتثليث المصادر (Triangulation)."
        };
      }
      return {
        title: "المنهج الإثنوغرافي أو الظاهراتي (Phenomenology / Ethnography)",
        tool: "الملاحظة بالمشاركة، مذكرات الميدان التفاعلية",
        sampleStrategy: "عينات كرة الثلج أو عينات نوعية مركزة (5 إلى 25 فرداً)",
        tip: "استبعاد الانحياز الشخصي للباحث (Epoché / Bracketing) وتوثيق السياق البيئي بدقة."
      };
    }
    return {
      title: "منهج البحوث المختلطة المتتابعة أو المتزامنة (Mixed-Methods Triangulation)",
      tool: "دمج الاستبانة الكمية مع مقابلات نوعية تفسيرية (QUAN-qual Design)",
      sampleStrategy: "عينة احتمالية للمرحلة الكمية تليها عينة قصدية للمرحلة التفسيرية",
      tip: "تكامل البيانات عند مرحلة التفسير لتعويض نقاط ضعف الأسلوب المنفرد."
    };
  }, [dataNature, researchPurpose]);

  // ----------------------------------------------------------------------------
  // 4. حالة محاكي المكدس PDA (Pushdown Automaton)
  // ----------------------------------------------------------------------------
  const [pdaInput, setPdaInput] = useState<string>("0011");
  const [pdaStack, setPdaStack] = useState<string[]>(["Z0"]);
  const [pdaStep, setPdaStep] = useState<number>(0);
  const [pdaState, setPdaState] = useState<string>("q0");

  const runPdaStep = () => {
    if (pdaStep >= pdaInput.length) {
      if (pdaStack.length === 1 && pdaStack[0] === "Z0") {
        setPdaState("q_accept");
      }
      return;
    }
    const ch = pdaInput[pdaStep];
    if (pdaState === "q0") {
      if (ch === "0") {
        setPdaStack((prev) => ["0", ...prev]);
        setPdaStep((s) => s + 1);
      } else if (ch === "1") {
        if (pdaStack[0] === "0") {
          setPdaStack((prev) => prev.slice(1));
          setPdaState("q1");
          setPdaStep((s) => s + 1);
        } else {
          setPdaState("q_reject");
        }
      }
    } else if (pdaState === "q1") {
      if (ch === "1") {
        if (pdaStack[0] === "0") {
          setPdaStack((prev) => prev.slice(1));
          setPdaStep((s) => s + 1);
        } else {
          setPdaState("q_reject");
        }
      } else {
        setPdaState("q_reject");
      }
    }
  };

  const resetPda = () => {
    setPdaStack(["Z0"]);
    setPdaStep(0);
    setPdaState("q0");
  };

  // ----------------------------------------------------------------------------
  // 5. حالة شريط تورنغ (Turing Machine Tape)
  // ----------------------------------------------------------------------------
  const [tape, setTape] = useState<string[]>(["B", "1", "0", "1", "1", "B", "B"]);
  const [headPos, setHeadPos] = useState<number>(1);

  const moveTapeLeft = () => {
    if (headPos > 0) setHeadPos((p) => p - 1);
  };
  const moveTapeRight = () => {
    if (headPos < tape.length - 1) setHeadPos((p) => p + 1);
    else setTape((t) => [...t, "B"]);
  };
  const writeTape = (char: string) => {
    setTape((t) => {
      const copy = [...t];
      copy[headPos] = char;
      return copy;
    });
  };

  // تعريف الاستوديوهات المتوفرة
  const studios = [
    {
      id: "automata_simulator",
      title: "محاكي الآلات المنتهية الصورية (DFA/NFA Simulator)",
      subject: "toc",
      tabs: [
        { id: "sim", label: "المحاكي التفاعلي المتجهي" },
        { id: "trace", label: "جدول التتبع خطوة بخطوة" },
        { id: "rules", label: "دالة الانتقال والتعريف الرياضي" },
        { id: "nfa-tree", label: "شجرة الحوسبة المتفرعة (NFA)" }
      ]
    },
    {
      id: "chomsky_hierarchy",
      title: "مستكشف هرم تشومسكي التفاعلي (Chomsky Hierarchy)",
      subject: "toc",
      tabs: [
        { id: "hierarchy", label: "المخطط الهرمي المتجهي" },
        { id: "comparison", label: "مصفوفة اللغات والآلات المقارنة" }
      ]
    },
    {
      id: "research_matrix",
      title: "مصفوفة اتخاذ القرار لاختيار مناهج البحث (Methodology Matrix)",
      subject: "rm",
      tabs: [
        { id: "matrix", label: "محدد المنهجية التفاعلي" },
        { id: "sampling", label: "حاسبة العينات الإحصائية (ياماني)" }
      ]
    },
    {
      id: "pda_studio",
      title: "محاكي آلة المكدس (Pushdown Automaton)",
      subject: "toc",
      tabs: [
        { id: "sim", label: "محاكاة المكدس (Stack Trace)" }
      ]
    },
    {
      id: "turing_studio",
      title: "محاكي شريط تورنغ التفاعلي (Turing Machine Tape)",
      subject: "toc",
      tabs: [
        { id: "sim", label: "الشريط والرأس القارئ/الكاتب" }
      ]
    }
  ];

  const currentStudio = studios.find((s) => s.id === activeStudioId) || studios[0];

  return (
    <div>
      {/* الترويسة العلوية وبطاقة التنقل بين الاستوديوهات */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, padding: "2px 8px", borderRadius: "var(--r-pill)", background: "var(--acc-g)", color: "var(--acc)" }}>
                استوديو تفاعلي SVG
              </span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)" }}>
                {currentStudio.title}
              </h2>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--ink-m)" }}>
              رسومات متجهات رياضية محسوبة بدقة 100% · صفر إيموجيات · متناسقة مع ثيمات المنصة
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {onReturnToSummary && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={onReturnToSummary}
                title="العودة لموضع الشرح بالملخص"
              >
                <Icons.ArrowRight size={15} />
                <span>العودة لموضع الشرح بالملخص</span>
              </button>
            )}
          </div>
        </div>

        {/* أزرار اختيار الاستوديو التفاعلي */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginTop: "14px", borderTop: "1px solid var(--ln-s)", paddingTop: "12px" }}>
          {studios.map((st) => {
            const isCurrent = st.id === activeStudioId;
            return (
              <button
                key={st.id}
                type="button"
                className={`btn btn-sm ${isCurrent ? "btn-primary" : ""}`}
                onClick={() => {
                  setActiveStudioId(st.id);
                  setActiveTabId(st.tabs[0].id);
                }}
                style={{ whiteSpace: "nowrap" }}
              >
                <span>{st.title.split("(")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* أشرطة التبويب للاستوديو المختار حالياً */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginTop: "10px" }}>
          {currentStudio.tabs.map((tab) => {
            const isTabActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${isTabActive ? "btn-primary" : ""}`}
                style={{
                  background: isTabActive ? "var(--acc)" : "var(--sf2)",
                  color: isTabActive ? "#000" : "var(--ink)",
                  border: `1px solid ${isTabActive ? "var(--acc-b)" : "var(--ln)"}`,
                  whiteSpace: "nowrap"
                }}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 1. محتوى محاكي الآلات المنتهية الصورية (DFA/NFA Simulator) */}
      {/* ====================================================================== */}
      {activeStudioId === "automata_simulator" && (
        <div className="card">
          {/* تبويب المحاكي التفاعلي المتجهي */}
          {activeTabId === "sim" && (
            <div>
              {/* شريط التحكم بالسلسلة والخطوات */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>سلسلة الإدخال (w):</span>
                  <input
                    type="text"
                    value={inputString}
                    onChange={(e) => {
                      setInputString(e.target.value.replace(/[^01]/g, ""));
                      resetAutomata();
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "var(--r-s)",
                      border: "1px solid var(--ln)",
                      background: "var(--sf2)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                      direction: "ltr",
                      textAlign: "center",
                      fontWeight: 700,
                      width: "120px"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button type="button" className="btn btn-sm" onClick={() => setDfaPreset("0101")}>0101</button>
                  <button type="button" className="btn btn-sm" onClick={() => setDfaPreset("110")}>110</button>
                  <button type="button" className="btn btn-sm" onClick={() => setDfaPreset("00111")}>00111</button>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={runAutomataStep}
                  disabled={simStep >= inputString.length}
                >
                  <span>خطوة للأمام ({simStep}/{inputString.length})</span>
                  <Icons.ArrowLeft size={14} />
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={resetAutomata}
                >
                  <Icons.Reset size={14} />
                  <span>إعادة ضبط</span>
                </button>
              </div>

              {/* شريط خلايا الإدخال وموضع المؤشر */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", marginBottom: "20px", direction: "ltr" }}>
                {inputString.split("").map((ch, idx) => {
                  const isCurrent = idx === simStep;
                  const isProcessed = idx < simStep;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: "36px",
                        height: "40px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        border: `2px solid ${isCurrent ? "var(--acc)" : isProcessed ? "var(--ln-b)" : "var(--ln)"}`,
                        borderRadius: "var(--r-s)",
                        background: isCurrent ? "var(--acc-g)" : isProcessed ? "var(--sf2)" : "var(--sf)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        color: isCurrent ? "var(--acc)" : "var(--ink)",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <span>{ch}</span>
                      {isCurrent && (
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--acc)", marginTop: "2px" }} />
                      )}
                    </div>
                  );
                })}
                {inputString.length === 0 && (
                  <span style={{ fontSize: "0.85rem", color: "var(--ink-m)" }}>أدخل سلسلة ثنائية من 0 و 1 للبدء</span>
                )}
              </div>

              {/* رسم بياني متجهي نظيف محسوب رياضياً بالـ SVG للآلة (State Diagram) */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "700px",
                  margin: "0 auto 20px auto",
                  background: "var(--sf2)",
                  borderRadius: "var(--r-m)",
                  border: "1px solid var(--ln)",
                  padding: "20px",
                  display: "flex",
                  justifyContent: "center"
                }}
              >
                <svg width="100%" height="220" viewBox="0 0 600 220" style={{ overflow: "visible" }}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--ink-m)" />
                    </marker>
                    <marker id="arrow-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--acc)" />
                    </marker>
                  </defs>

                  {/* سهم البداية */}
                  <line x1="50" y1="110" x2="110" y2="110" stroke="var(--ink-m)" strokeWidth="2.5" markerEnd="url(#arrow)" />
                  <text x="65" y="100" fill="var(--ink-m)" fontSize="13" fontWeight="bold">Start</text>

                  {/* الحالة q0 */}
                  <circle
                    cx="150"
                    cy="110"
                    r="35"
                    fill={currentState === "q0" ? "var(--acc)" : "var(--sf)"}
                    stroke={currentState === "q0" ? "var(--acc-b)" : "var(--ln)"}
                    strokeWidth={currentState === "q0" ? "4" : "2"}
                  />
                  <text
                    x="150"
                    y="116"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill={currentState === "q0" ? "#000" : "var(--ink)"}
                    fontSize="16"
                    fontWeight="bold"
                    fontFamily="var(--font-mono)"
                  >
                    q0
                  </text>

                  {/* حلقة التراجع على q0 (0) */}
                  <path d="M 135 77 C 120 20, 180 20, 165 77" fill="none" stroke="var(--ink-m)" strokeWidth="2" markerEnd="url(#arrow)" />
                  <text x="150" y="30" fill="var(--ink)" fontSize="13" fontWeight="bold" textAnchor="middle">0</text>

                  {/* انتقال q0 إلى q1 (1) */}
                  <path d="M 185 100 Q 275 70 365 100" fill="none" stroke={currentState === "q0" && inputString[simStep - 1] === "1" ? "var(--acc)" : "var(--ink-m)"} strokeWidth="2.5" markerEnd="url(#arrow)" />
                  <text x="275" y="75" fill="var(--acc)" fontSize="14" fontWeight="bold" textAnchor="middle">1</text>

                  {/* انتقال q1 إلى q0 (0) */}
                  <path d="M 365 120 Q 275 150 185 120" fill="none" stroke={currentState === "q1" && inputString[simStep - 1] === "0" ? "var(--acc)" : "var(--ink-m)"} strokeWidth="2.5" markerEnd="url(#arrow)" />
                  <text x="275" y="155" fill="var(--ink-m)" fontSize="14" fontWeight="bold" textAnchor="middle">0</text>

                  {/* الحالة q1 (حالة القبول النهائية: دائرتان متداخلتان) */}
                  <circle
                    cx="400"
                    cy="110"
                    r="35"
                    fill={currentState === "q1" ? "var(--ok)" : "var(--sf)"}
                    stroke={currentState === "q1" ? "var(--ok)" : "var(--acc)"}
                    strokeWidth="3"
                  />
                  <circle cx="400" cy="110" r="28" fill="none" stroke={currentState === "q1" ? "#fff" : "var(--acc)"} strokeWidth="2" />
                  <text
                    x="400"
                    y="116"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill={currentState === "q1" ? "#fff" : "var(--ink)"}
                    fontSize="16"
                    fontWeight="bold"
                    fontFamily="var(--font-mono)"
                  >
                    q1
                  </text>

                  {/* حلقة التراجع على q1 (1) */}
                  <path d="M 385 77 C 370 20, 430 20, 415 77" fill="none" stroke="var(--ink-m)" strokeWidth="2" markerEnd="url(#arrow)" />
                  <text x="400" y="30" fill="var(--ok)" fontSize="13" fontWeight="bold" textAnchor="middle">1</text>
                </svg>
              </div>

              {/* بطاقة نتيجة القبول */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "var(--r-m)",
                  background: currentState === "q1" ? "var(--ok-g)" : "var(--sf2)",
                  border: `1px solid ${currentState === "q1" ? "var(--ok)" : "var(--ln)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, fontSize: "1rem" }}>
                    الحالة اللحظية الحالية: <code className="m-ltr" dir="ltr" style={{ padding: "2px 6px", background: "var(--sf)", borderRadius: "4px" }}>{currentState}</code>
                  </span>
                  <p style={{ fontSize: "0.85rem", color: "var(--ink-m)", marginTop: "4px" }}>
                    {currentState === "q1"
                      ? "حالة قبول نهائية (Accept State) — السلسلة تنتهي بالرمز 1 حتى هذه الخطوة."
                      : "حالة غير نهائية (Non-accept State) — السلسلة تنتهي بالرمز 0 أو في البداية."}
                  </p>
                </div>

                {simStep === inputString.length && (
                  <span
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--r-pill)",
                      background: currentState === "q1" ? "var(--ok)" : "var(--err)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.95rem"
                    }}
                  >
                    {currentState === "q1" ? "سلسلة مقبولة (Accepted)" : "سلسلة مرفوضة (Rejected)"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* تبويب جدول التتبع خطوة بخطوة */}
          {activeTabId === "trace" && (
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "12px" }}>
                جدول التتبع الزمني اللحظي للانتقالات (Step Trace Table)
              </h3>
              {simHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--ink-m)", background: "var(--sf2)", borderRadius: "var(--r-m)" }}>
                  <p>انقر على «خطوة للأمام» في المحاكي لبدء تسجيل خطوات التتبع اللحظي هنا.</p>
                </div>
              ) : (
                <div className="tbl-wrap">
                  <div className="tbl-scale">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>الخطوة #</th>
                          <th>الحالة الحالية ($q_i$)</th>
                          <th>الرمز المقروء ($\sigma$)</th>
                          <th>صيغة الانتقال ($\delta$)</th>
                          <th>الحالة التالية ($q_{'{i+1}'}$)</th>
                          <th>الشريط المتبقي</th>
                          <th>حالة القبول</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simHistory.map((h) => {
                          const isAccept = h.next === "q1";
                          return (
                            <tr key={h.step}>
                              <td style={{ fontWeight: 700 }}>#{h.step}</td>
                              <td><code className="m-ltr">{h.state}</code></td>
                              <td><code className="m-ltr" style={{ fontWeight: 800, color: "var(--acc)" }}>{h.char}</code></td>
                              <td style={{ direction: "ltr", textAlign: "center", fontFamily: "var(--font-mono)" }}>
                                δ({h.state}, {h.char}) = {h.next}
                              </td>
                              <td><code className="m-ltr" style={{ fontWeight: 700 }}>{h.next}</code></td>
                              <td style={{ direction: "ltr", textAlign: "center", fontFamily: "var(--font-mono)" }}>
                                {h.remaining || "λ (فارغ)"}
                              </td>
                              <td>
                                <span style={{ padding: "2px 8px", borderRadius: "var(--r-pill)", fontSize: "0.76rem", fontWeight: 700, background: isAccept ? "var(--ok-g)" : "var(--sf2)", color: isAccept ? "var(--ok)" : "var(--ink-m)" }}>
                                  {isAccept ? "قبول" : "عادي"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* تبويب دالة الانتقال الرياضية والتعريف الرسمي */}
          {activeTabId === "rules" && (
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "12px" }}>
                التعريف الرياضي الخماسي للآلة المنتهية (Formal 5-Tuple Definition)
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--ink-m)", marginBottom: "16px" }}>
                تُعرّف آلة الحالات المنتهية المحددة بالخماسية الرياضية: <code className="m-ltr" dir="ltr" style={{ fontWeight: 800 }}>M = (Q, Σ, δ, q0, F)</code>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                <div style={{ padding: "12px", background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-m)" }}>مجموعة الحالات (Q):</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font-mono)", direction: "ltr" }}>{"{ q0, q1 }"}</div>
                </div>
                <div style={{ padding: "12px", background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-m)" }}>أبجدية الإدخال (Σ):</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font-mono)", direction: "ltr" }}>{"{ 0, 1 }"}</div>
                </div>
                <div style={{ padding: "12px", background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-m)" }}>الحالة الابتدائية (q0):</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font-mono)", direction: "ltr" }}>q0</div>
                </div>
                <div style={{ padding: "12px", background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--ink-m)" }}>مجموعة حالات القبول (F):</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, fontFamily: "var(--font-mono)", direction: "ltr" }}>{"{ q1 }"}</div>
                </div>
              </div>

              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>
                مصفوفة دالة الانتقال الرياضية δ : Q × Σ → Q
              </h4>
              <div className="tbl-wrap">
                <div className="tbl-scale">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>الحالة الراهنة (State)</th>
                        <th>عند قراءة الرمز '0'</th>
                        <th>عند قراءة الرمز '1'</th>
                        <th>التصنيف الحسابي</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 700 }}><code className="m-ltr">→ q0</code></td>
                        <td><code className="m-ltr">q0</code></td>
                        <td><code className="m-ltr" style={{ color: "var(--acc)", fontWeight: 700 }}>q1</code></td>
                        <td>الحالة الابتدائية (حالة رفض مؤقتة)</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700 }}><code className="m-ltr">* q1</code></td>
                        <td><code className="m-ltr">q0</code></td>
                        <td><code className="m-ltr" style={{ color: "var(--ok)", fontWeight: 700 }}>q1</code></td>
                        <td>حالة القبول النهائية المزدوجة</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* تبويب شجرة الحوسبة المتفرعة NFA */}
          {activeTabId === "nfa-tree" && (
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "12px" }}>
                شجرة الحوسبة اللاتحديدية (NFA Computation Tree)
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--ink-m)", marginBottom: "16px" }}>
                في الآلات غير المحددة (NFA)، تتفرع الحسابات في شجرة متوازية تخيلية. شرط القبول الرياضي الحاسم: يكفي وجود مسار واحد فقط ينتهي في حالة قبول ليتم قبول السلسلة كاملة.
              </p>

              <div
                style={{
                  background: "var(--sf2)",
                  borderRadius: "var(--r-m)",
                  border: "1px solid var(--ln)",
                  padding: "20px",
                  display: "flex",
                  justifyContent: "center"
                }}
              >
                <svg width="100%" height="200" viewBox="0 0 500 200">
                  <circle cx="250" cy="30" r="20" fill="var(--acc)" />
                  <text x="250" y="35" dominantBaseline="middle" textAnchor="middle" fill="#000" fontWeight="bold">q0</text>

                  {/* تفرع أول */}
                  <line x1="240" y1="50" x2="160" y2="100" stroke="var(--ink-m)" strokeWidth="2" />
                  <text x="190" y="70" fill="var(--ink)" fontSize="12" fontWeight="bold">0</text>
                  <circle cx="160" cy="115" r="18" fill="var(--sf)" stroke="var(--ln)" strokeWidth="2" />
                  <text x="160" y="119" dominantBaseline="middle" textAnchor="middle" fill="var(--ink)" fontWeight="bold">q0</text>

                  {/* تفرع ثان متوازي */}
                  <line x1="260" y1="50" x2="340" y2="100" stroke="var(--acc)" strokeWidth="2.5" />
                  <text x="310" y="70" fill="var(--acc)" fontSize="12" fontWeight="bold">0 (تخمين)</text>
                  <circle cx="340" cy="115" r="18" fill="var(--ok)" stroke="var(--ok)" strokeWidth="2" />
                  <text x="340" y="119" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontWeight="bold">q1</text>

                  {/* مسار قبول ناجح */}
                  <line x1="340" y1="135" x2="340" y2="175" stroke="var(--ok)" strokeWidth="2.5" />
                  <text x="360" y="155" fill="var(--ok)" fontSize="12" fontWeight="bold">1</text>
                  <circle cx="340" cy="180" r="16" fill="var(--ok)" stroke="var(--acc)" strokeWidth="2" />
                  <text x="340" y="184" dominantBaseline="middle" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">ACCEPT</text>
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* 2. مستكشف هرم تشومسكي التفاعلي (Chomsky Hierarchy Studio) */}
      {/* ====================================================================== */}
      {activeStudioId === "chomsky_hierarchy" && (
        <div className="card">
          {/* تبويب المخطط الهرمي المتجهي */}
          {activeTabId === "hierarchy" && (
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                المخطط المتجهي للغات والآلات المتداخلة (Chomsky Hierarchy Rings)
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--ink-m)", marginBottom: "16px" }}>
                انقر على أي حلقة هرمية لاستعراض تفاصيل النحو، نوع الذاكرة، وقدرة التقرير الحاسوبية.
              </p>

              <div
                style={{
                  background: "var(--sf2)",
                  borderRadius: "var(--r-m)",
                  border: "1px solid var(--ln)",
                  padding: "24px",
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "20px"
                }}
              >
                <svg width="100%" height="280" viewBox="0 0 600 280">
                  {/* Type 0: Unrestricted / Turing Machine */}
                  <rect
                    x="20"
                    y="10"
                    width="560"
                    height="260"
                    rx="16"
                    fill={selectedChomskyType === 0 ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.08)"}
                    stroke={selectedChomskyType === 0 ? "var(--acc)" : "#6366f1"}
                    strokeWidth={selectedChomskyType === 0 ? "3" : "1.5"}
                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    onClick={() => setSelectedChomskyType(0)}
                  />
                  <text x="40" y="36" fill="var(--ink)" fontSize="13" fontWeight="bold">
                    Type 0: Recursively Enumerable (Turing Machine)
                  </text>

                  {/* Type 1: Context-Sensitive */}
                  <rect
                    x="70"
                    y="50"
                    width="460"
                    height="200"
                    rx="14"
                    fill={selectedChomskyType === 1 ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.08)"}
                    stroke={selectedChomskyType === 1 ? "var(--acc)" : "#10b981"}
                    strokeWidth={selectedChomskyType === 1 ? "3" : "1.5"}
                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    onClick={() => setSelectedChomskyType(1)}
                  />
                  <text x="90" y="74" fill="var(--ink)" fontSize="13" fontWeight="bold">
                    Type 1: Context-Sensitive (Linear Bounded Automaton - LBA)
                  </text>

                  {/* Type 2: Context-Free */}
                  <rect
                    x="120"
                    y="90"
                    width="360"
                    height="140"
                    rx="12"
                    fill={selectedChomskyType === 2 ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.08)"}
                    stroke={selectedChomskyType === 2 ? "var(--acc)" : "#f59e0b"}
                    strokeWidth={selectedChomskyType === 2 ? "3" : "1.5"}
                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    onClick={() => setSelectedChomskyType(2)}
                  />
                  <text x="140" y="114" fill="var(--ink)" fontSize="13" fontWeight="bold">
                    Type 2: Context-Free (Pushdown Automaton - PDA)
                  </text>

                  {/* Type 3: Regular */}
                  <rect
                    x="170"
                    y="130"
                    width="260"
                    height="85"
                    rx="10"
                    fill={selectedChomskyType === 3 ? "var(--acc)" : "rgba(245, 177, 61, 0.2)"}
                    stroke="var(--acc-b)"
                    strokeWidth={selectedChomskyType === 3 ? "3" : "2"}
                    style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                    onClick={() => setSelectedChomskyType(3)}
                  />
                  <text x="300" y="165" fill={selectedChomskyType === 3 ? "#000" : "var(--ink)"} fontSize="14" fontWeight="bold" textAnchor="middle">
                    Type 3: Regular
                  </text>
                  <text x="300" y="185" fill={selectedChomskyType === 3 ? "#111" : "var(--ink-m)"} fontSize="11" textAnchor="middle">
                    (Finite Automata / DFA & NFA)
                  </text>
                </svg>
              </div>

              {/* بطاقة تفاصيل المستوى المحدد */}
              {(() => {
                const item = chomskyData.find((c) => c.type === selectedChomskyType) || chomskyData[0];
                return (
                  <div style={{ padding: "18px", borderRadius: "var(--r-m)", background: "var(--sf)", border: "2px solid var(--acc)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--ln)", paddingBottom: "8px" }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--acc)" }}>
                        النوع {item.type}: {item.name_ar}
                      </h4>
                      <span style={{ fontSize: "0.8rem", padding: "2px 8px", background: "var(--acc-g)", borderRadius: "var(--r-pill)", fontWeight: 700 }}>
                        مستوى تشومسكي #{item.type}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", display: "block" }}>الآلة الحوسبية المعترفة:</span>
                        <strong style={{ fontSize: "0.95rem" }}>{item.automaton}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", display: "block" }}>بنية الذاكرة:</span>
                        <strong style={{ fontSize: "0.95rem" }}>{item.memory}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", display: "block" }}>شكل القواعد التوليدية:</span>
                        <code className="m-ltr" style={{ fontSize: "0.9rem" }}>{item.grammar}</code>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", display: "block" }}>تطبيق المترجمات (Compilers):</span>
                        <strong style={{ fontSize: "0.95rem", color: "var(--ok)" }}>{item.compiler}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", display: "block" }}>قابلية التقرير (Decidability):</span>
                        <span style={{ fontSize: "0.9rem" }}>{item.decidable}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", display: "block" }}>أمثلة قياسية:</span>
                        <code className="m-ltr" style={{ fontSize: "0.9rem" }}>{item.example}</code>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* تبويب مصفوفة اللغات المقارنة */}
          {activeTabId === "comparison" && (
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "12px" }}>
                مصفوفة المقارنة الأكاديمية الشاملة لهرم تشومسكي
              </h3>
              <div className="tbl-wrap">
                <div className="tbl-scale">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>المستوى</th>
                        <th>اسم اللغة</th>
                        <th>الآلة المقابلة</th>
                        <th>شكل القواعد</th>
                        <th>الاتحاد والتقاطع</th>
                        <th>المتممة (Complement)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chomskyData.map((row) => (
                        <tr key={row.type}>
                          <td style={{ fontWeight: 800 }}>Type {row.type}</td>
                          <td style={{ fontWeight: 700 }}>{row.name_ar.split("(")[0]}</td>
                          <td>{row.automaton}</td>
                          <td><code className="m-ltr">{row.grammar.split(":")[1] || row.grammar}</code></td>
                          <td>
                            <span style={{ color: "var(--ok)", fontWeight: 700 }}>
                              {row.type === 2 ? "مغلقة تحت الاتحاد، غير مغلقة تحت التقاطع" : "مغلقة (Closed)"}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: row.type === 2 || row.type === 0 ? "var(--err)" : "var(--ok)", fontWeight: 700 }}>
                              {row.type === 2 ? "غير مغلقة (Not Closed)" : row.type === 0 ? "غير مغلقة" : "مغلقة (Closed)"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* 3. مصفوفة اتخاذ القرار لاختيار مناهج البحث (Methodology Matrix Studio) */}
      {/* ====================================================================== */}
      {activeStudioId === "research_matrix" && (
        <div className="card">
          {/* تبويب محدد المنهجية التفاعلي */}
          {activeTabId === "matrix" && (
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                محدد المنهجية واستراتيجية البحث التفاعلي (Methodology Decision Engine)
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--ink-m)", marginBottom: "16px" }}>
                اختر معايير دراستك لتحديد المنهج المناسب، أدوات جمع البيانات، وتوصيات الاختبار النهائي.
              </p>

              {/* أشرطة الخيارات الثلاثية */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                {/* 1. هدف البحث */}
                <div style={{ padding: "14px", background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, display: "block", marginBottom: "8px" }}>
                    1. الغرض من البحث (Purpose):
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${researchPurpose === "exploratory" ? "btn-primary" : ""}`}
                      onClick={() => setResearchPurpose("exploratory")}
                    >
                      استكشافي (ظاهرة جديدة / غير مدروسة)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${researchPurpose === "descriptive" ? "btn-primary" : ""}`}
                      onClick={() => setResearchPurpose("descriptive")}
                    >
                      وصفي (توصيف الخصائص والواقع الراهن)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${researchPurpose === "explanatory" ? "btn-primary" : ""}`}
                      onClick={() => setResearchPurpose("explanatory")}
                    >
                      تفسيري / سببي (اختبار العلاقات والأثر)
                    </button>
                  </div>
                </div>

                {/* 2. طبيعة البيانات */}
                <div style={{ padding: "14px", background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, display: "block", marginBottom: "8px" }}>
                    2. طبيعة البيانات (Data Nature):
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${dataNature === "quantitative" ? "btn-primary" : ""}`}
                      onClick={() => setDataNature("quantitative")}
                    >
                      كمية رقمية (أرقام، إحصاء، قياسات)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${dataNature === "qualitative" ? "btn-primary" : ""}`}
                      onClick={() => setDataNature("qualitative")}
                    >
                      نوعية كيفية (كلمات، نصوص، مقابلات)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${dataNature === "mixed" ? "btn-primary" : ""}`}
                      onClick={() => setDataNature("mixed")}
                    >
                      مختلطة متكاملة (Mixed Methods)
                    </button>
                  </div>
                </div>

                {/* 3. الأفق الزمني */}
                <div style={{ padding: "14px", background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, display: "block", marginBottom: "8px" }}>
                    3. البعد الزمني (Time Horizon):
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${timeHorizon === "cross" ? "btn-primary" : ""}`}
                      onClick={() => setTimeHorizon("cross")}
                    >
                      مقطعي مستعرض (نقطة زمنية واحدة)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${timeHorizon === "longitudinal" ? "btn-primary" : ""}`}
                      onClick={() => setTimeHorizon("longitudinal")}
                    >
                      طولي تتبعي (فترات زمنية متتالية)
                    </button>
                  </div>
                </div>
              </div>

              {/* بطاقة التوصية المنهجية */}
              <div style={{ padding: "20px", borderRadius: "var(--r-m)", background: "var(--sf)", border: "2px solid var(--acc)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Icons.Check size={20} />
                  <h4 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--acc)" }}>
                    الاستراتيجية المنهجية الموصى بها: {methodologyRecommendation.title}
                  </h4>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "12px" }}>
                  <div style={{ padding: "12px", background: "var(--sf2)", borderRadius: "var(--r-s)" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", display: "block" }}>الأدوات المناسبة لجمع البيانات:</span>
                    <strong style={{ fontSize: "0.95rem" }}>{methodologyRecommendation.tool}</strong>
                  </div>

                  <div style={{ padding: "12px", background: "var(--sf2)", borderRadius: "var(--r-s)" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", display: "block" }}>استراتيجية سحب العينة:</span>
                    <strong style={{ fontSize: "0.95rem" }}>{methodologyRecommendation.sampleStrategy}</strong>
                  </div>
                </div>

                <div style={{ marginTop: "14px", padding: "12px 16px", background: "var(--acc-g)", borderRadius: "var(--r-s)", borderRight: "4px solid var(--acc)" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.88rem", display: "block", marginBottom: "2px" }}>
                    وقفة امتحانية حاسمة لاختبار دكتور المقرر:
                  </span>
                  <p style={{ fontSize: "0.86rem", margin: 0 }}>
                    {methodologyRecommendation.tip}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* تبويب حاسبة العينات الإحصائية لمعادلة ياماني */}
          {activeTabId === "sampling" && (
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
                حاسبة حجم العينة الإحصائية — صيغة ياماني (Yamane Formula Calculator)
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--ink-m)", marginBottom: "16px" }}>
                الصيغة الرياضية المعتمدة للمجتمعات المنتهية المعروفة: <code className="m-ltr" dir="ltr" style={{ fontWeight: 800 }}>n = N / (1 + N · e²)</code>
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                {/* مدخلات الحجم وهامش الخطأ */}
                <div style={{ padding: "16px", background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "0.88rem", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                      حجم المجتمع الأصلي الكلي (Population N):
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={500000}
                      value={populationN}
                      onChange={(e) => setPopulationN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "var(--r-s)",
                        border: "1px solid var(--ln)",
                        background: "var(--sf)",
                        color: "var(--ink)",
                        fontWeight: 700,
                        fontSize: "1rem"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.88rem", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                      هامش الخطأ المقبول (Margin of Error e):
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${marginE === 0.01 ? "btn-primary" : ""}`}
                        onClick={() => setMarginE(0.01)}
                      >
                        ±1% (دقيق جداً)
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${marginE === 0.05 ? "btn-primary" : ""}`}
                        onClick={() => setMarginE(0.05)}
                      >
                        ±5% (القياسي 95%)
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${marginE === 0.1 ? "btn-primary" : ""}`}
                        onClick={() => setMarginE(0.1)}
                      >
                        ±10% (استطلاعي)
                      </button>
                    </div>
                  </div>
                </div>

                {/* مخرجات الحساب اللحظي */}
                <div style={{ padding: "20px", background: "var(--sf)", borderRadius: "var(--r-m)", border: "2px solid var(--acc)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--ink-m)", marginBottom: "4px" }}>
                    حجم العينة المطلوب سحبها إحصائياً (Sample Size n):
                  </span>
                  <div style={{ fontSize: "2.8rem", fontWeight: 900, color: "var(--acc)", lineHeight: 1.1, marginBottom: "8px" }}>
                    {calculatedSampleSize}
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ok)" }}>
                    تمثل حوالي {((calculatedSampleSize / populationN) * 100).toFixed(1)}% من كامل المجتمع
                  </span>

                  <div style={{ marginTop: "14px", fontSize: "0.82rem", color: "var(--ink-m)", fontFamily: "var(--font-mono)", direction: "ltr" }}>
                    n = {populationN} / (1 + {populationN} * {marginE * marginE}) = {calculatedSampleSize}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* 4. محاكي آلة المكدس PDA (Pushdown Automaton) */}
      {/* ====================================================================== */}
      {activeStudioId === "pda_studio" && (
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
            محاكي آلة المكدس التفاعلي (Pushdown Automaton Simulator)
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--ink-m)", marginBottom: "16px" }}>
            التعرف على اللغات الخالية من السياق عبر مكدس الذاكرة (LIFO Stack) للغة: <code className="m-ltr">L = {"{ 0^n 1^n | n >= 1 }"}</code>
          </p>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>سلسلة الإدخال:</span>
            <input
              type="text"
              value={pdaInput}
              onChange={(e) => {
                setPdaInput(e.target.value);
                resetPda();
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--r-s)",
                border: "1px solid var(--ln)",
                background: "var(--sf2)",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                direction: "ltr",
                width: "120px",
                textAlign: "center",
                fontWeight: 700
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={runPdaStep}
              disabled={pdaStep >= pdaInput.length}
            >
              <span>خطوة للمكدس ({pdaStep}/{pdaInput.length})</span>
            </button>
            <button type="button" className="btn btn-sm" onClick={resetPda}>
              <Icons.Reset size={14} />
              <span>إعادة ضبط</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: "24px", justifyContent: "center", alignItems: "flex-end", padding: "20px", background: "var(--sf2)", borderRadius: "var(--r-m)" }}>
            {/* تمثيل المكدس العمودي */}
            <div style={{ width: "120px", display: "flex", flexDirection: "column-reverse", border: "3px solid var(--ln)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "4px", minHeight: "160px", background: "var(--sf)" }}>
              {pdaStack.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    height: "32px",
                    background: item === "Z0" ? "var(--acc-g)" : "var(--acc)",
                    color: item === "Z0" ? "var(--acc)" : "#000",
                    border: "1px solid var(--acc-b)",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontWeight: 800,
                    margin: "2px 0",
                    fontFamily: "var(--font-mono)"
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--ink-m)" }}>
              قاع المكدس: <code className="m-ltr">Z0</code> · الرمز في القمة: <code className="m-ltr">{pdaStack[0] || "فارغ"}</code>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 5. محاكي شريط تورنغ (Turing Machine Tape) */}
      {/* ====================================================================== */}
      {activeStudioId === "turing_studio" && (
        <div className="card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "8px" }}>
            شريط تورنغ اللانهائي والرأس القارئ/الكاتب (Turing Tape Visualizer)
          </h3>
          <p style={{ fontSize: "0.88rem", color: "var(--ink-m)", marginBottom: "16px" }}>
            نموذج الحوسبة العامة ذو الشريط اللانهائي ثنائي الاتجاه: قراءة، كتابة، وتحريك الرأس يساراً ويميناً.
          </p>

          {/* الشريط المتجهي */}
          <div style={{ display: "flex", justifyContent: "center", gap: "4px", overflowX: "auto", padding: "16px 0", direction: "ltr" }}>
            {tape.map((ch, idx) => {
              const isHead = idx === headPos;
              return (
                <div
                  key={idx}
                  style={{
                    width: "44px",
                    height: "50px",
                    border: `2px solid ${isHead ? "var(--acc)" : "var(--ln)"}`,
                    background: isHead ? "var(--acc-g)" : "var(--sf2)",
                    borderRadius: "var(--r-s)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    fontWeight: 800,
                    fontSize: "1.2rem",
                    fontFamily: "var(--font-mono)",
                    color: isHead ? "var(--acc)" : "var(--ink)",
                    position: "relative"
                  }}
                >
                  <span>{ch}</span>
                  {isHead && (
                    <div style={{ position: "absolute", bottom: "-18px", fontSize: "10px", color: "var(--acc)", fontWeight: 900 }}>
                      ^ HEAD
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* أزرار تحريك الرأس والكتابة */}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "24px", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sm" onClick={moveTapeLeft} disabled={headPos <= 0}>
              <Icons.ArrowRight size={14} />
              <span>تحريك الرأس يساراً (L)</span>
            </button>
            <button type="button" className="btn btn-sm" onClick={moveTapeRight}>
              <span>تحريك الرأس يميناً (R)</span>
              <Icons.ArrowLeft size={14} />
            </button>
            <button type="button" className="btn btn-sm" onClick={() => writeTape("0")}>
              كتابة '0'
            </button>
            <button type="button" className="btn btn-sm" onClick={() => writeTape("1")}>
              كتابة '1'
            </button>
            <button type="button" className="btn btn-sm" onClick={() => writeTape("B")}>
              مسح إلى فراغ 'B'
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

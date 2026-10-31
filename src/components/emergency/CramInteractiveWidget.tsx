// ==============================================================================
// المنصة التعليمية الموحدة — الأداة التفاعلية ثنائية الوضع لملخص الملخص
// Interactive Cram Widget (Mode 1: Model Inspector | Mode 2: Trap Quiz)
// Zero Emojis Standard
// ==============================================================================

import React, { useState } from "react";
import { Icons } from "../icons/SvgIcons";
import type { CramModel, CramQuizQuestion } from "../../types";

interface CramInteractiveWidgetProps {
  models: CramModel[];
  questions: CramQuizQuestion[];
}

export const CramInteractiveWidget: React.FC<CramInteractiveWidgetProps> = ({
  models,
  questions
}) => {
  const [mode, setMode] = useState<"inspector" | "quiz">("inspector");
  const [selectedModelId, setSelectedModelId] = useState<string>(() => models[0]?.id || "");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const activeModel = models.find((m) => m.id === selectedModelId) || models[0];

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.ans) correct++;
    });
    return correct;
  };

  return (
    <div
      style={{
        background: "var(--sf)",
        border: "1px solid var(--ln)",
        borderRadius: "var(--r-l)",
        padding: "20px",
        marginTop: "16px"
      }}
    >
      {/* شريط التبديل بين الوضعين */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icons.Interactive size={20} />
            <span>الأداة التفاعلية: مقارن المفاهيم واختبار الفخاخ السريع</span>
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--ink-m)", marginTop: "2px" }}>
            اختر وضع الفحص للمقارنة المنهجية أو ادخل اختبار الفخاخ للتقييم الفوري
          </p>
        </div>

        <div style={{ display: "inline-flex", background: "var(--sf2)", padding: "3px", borderRadius: "var(--r-pill)", border: "1px solid var(--ln)" }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === "inspector" ? "btn-primary" : ""}`}
            style={{ borderRadius: "var(--r-pill)", border: "none" }}
            onClick={() => setMode("inspector")}
          >
            مقارن النماذج (Inspector)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === "quiz" ? "btn-primary" : ""}`}
            style={{ borderRadius: "var(--r-pill)", border: "none" }}
            onClick={() => setMode("quiz")}
          >
            اختبار الفخاخ (Trap Quiz)
          </button>
        </div>
      </div>

      {/* الوضع 1: مقارن النماذج والمفاهيم */}
      {mode === "inspector" && (
        <div>
          {/* كبسولات النماذج */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`btn btn-sm ${selectedModelId === m.id ? "btn-primary" : ""}`}
                onClick={() => setSelectedModelId(m.id)}
              >
                <span>{m.name}</span>
              </button>
            ))}
          </div>

          {activeModel && (
            <div
              style={{
                background: "var(--sf2)",
                border: "1px solid var(--ln)",
                borderRadius: "var(--r-m)",
                padding: "16px"
              }}
            >
              <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--acc)", marginBottom: "12px" }}>
                {activeModel.fullName || activeModel.name}
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                {activeModel.chomskyType && (
                  <div>
                    <span style={{ fontSize: "0.78rem", color: "var(--ink-m)", display: "block" }}>نوع تشومسكي</span>
                    <span style={{ fontWeight: 700 }}>{activeModel.chomskyType}</span>
                  </div>
                )}
                {activeModel.languageClass && (
                  <div>
                    <span style={{ fontSize: "0.78rem", color: "var(--ink-m)", display: "block" }}>فئة اللغة</span>
                    <span style={{ fontWeight: 700 }}>{activeModel.languageClass}</span>
                  </div>
                )}
                {activeModel.memory && (
                  <div>
                    <span style={{ fontSize: "0.78rem", color: "var(--ink-m)", display: "block" }}>طبيعة الذاكرة</span>
                    <span style={{ fontWeight: 700 }}>{activeModel.memory}</span>
                  </div>
                )}
                {activeModel.determinismRule && (
                  <div>
                    <span style={{ fontSize: "0.78rem", color: "var(--ink-m)", display: "block" }}>قاعدة الحتمية واللاحتمية</span>
                    <span style={{ fontWeight: 700 }}>{activeModel.determinismRule}</span>
                  </div>
                )}
              </div>

              {activeModel.canonicalExample && (
                <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid var(--ln-s)" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--ink-m)", display: "block" }}>المثال الكانوني الصريح:</span>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: "2px" }} dangerouslySetInnerHTML={{ __html: activeModel.canonicalExample }} />
                </div>
              )}

              {activeModel.examTrap && (
                <div style={{ marginTop: "10px", padding: "10px", background: "var(--err-g)", borderRight: "3px solid var(--err)", borderRadius: "4px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--err)", display: "block" }}>فخ الامتحان والتحذير:</span>
                  <p style={{ fontSize: "0.88rem", marginTop: "2px" }}>{activeModel.examTrap}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* الوضع 2: اختبار الفخاخ السريع */}
      {mode === "quiz" && (
        <div>
          {questions.length === 0 ? (
            <p style={{ color: "var(--ink-m)" }}>لا توجد أسئلة فخاخ محددة حالياً.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {questions.map((q, qIdx) => {
                const userAns = quizAnswers[qIdx];
                const isAnswered = userAns !== undefined;
                return (
                  <div
                    key={qIdx}
                    style={{
                      background: "var(--sf2)",
                      border: "1px solid var(--ln)",
                      borderRadius: "var(--r-m)",
                      padding: "16px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--acc)" }}>
                        فخ #{qIdx + 1}
                      </span>
                      {q.badge && (
                        <span style={{ fontSize: "0.74rem", background: "var(--acc-g)", color: "var(--acc)", padding: "1px 6px", borderRadius: "4px" }}>
                          {q.badge}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "12px", color: "var(--ink)" }}>
                      {q.q}
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {q.options.map((opt, optIdx) => {
                        const isSelected = userAns === optIdx;
                        let optStyle: React.CSSProperties = {
                          textAlign: "right",
                          justifyContent: "flex-start",
                          background: "var(--sf)",
                          borderColor: "var(--ln)"
                        };

                        if (showResults) {
                          if (optIdx === q.ans) {
                            optStyle = { ...optStyle, background: "var(--ok-g)", borderColor: "var(--ok)", color: "var(--ok)" };
                          } else if (isSelected && isSelected !== (optIdx === q.ans)) {
                            optStyle = { ...optStyle, background: "var(--err-g)", borderColor: "var(--err)", color: "var(--err)" };
                          }
                        } else if (isSelected) {
                          optStyle = { ...optStyle, borderColor: "var(--acc)", background: "var(--acc-g)" };
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            className="btn btn-sm"
                            style={optStyle}
                            onClick={() => handleSelectAnswer(qIdx, optIdx)}
                          >
                            <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--sf2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", marginLeft: "8px" }}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {showResults && (
                      <div style={{ marginTop: "12px", padding: "10px", background: "var(--sf)", borderRadius: "var(--r-s)", border: "1px solid var(--ln)" }}>
                        <div style={{ fontSize: "0.85rem", color: "var(--ok)", fontWeight: 700, marginBottom: "4px" }}>
                          التعليل: {q.why}
                        </div>
                        {q.tip && (
                          <div style={{ fontSize: "0.82rem", color: "var(--warn)" }}>
                            مفتاح الحل: {q.tip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                {!showResults ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowResults(true)}
                  >
                    عرض نتائج الفخاخ والتقييم
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--acc)" }}>
                      نتيجتك: {calculateScore()} من {questions.length}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setQuizAnswers({});
                        setShowResults(false);
                      }}
                    >
                      إعادة الاختبار
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

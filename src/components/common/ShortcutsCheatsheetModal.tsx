// ==============================================================================
// المنصة التعليمية الموحدة — نافذة دليل اختصارات لوحة المفاتيح (Shortcuts Cheatsheet)
// Full keyboard shortcuts cheatsheet · Zero Emojis Standard · 100% SVG Vector Line-Art
// ==============================================================================

import React from "react";
import { Icons } from "../icons/SvgIcons";

export interface ShortcutsCheatsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsCheatsheetModal: React.FC<ShortcutsCheatsheetModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const categories = [
    {
      title: "التنقل العام والواجهة",
      shortcuts: [
        { key: "Ctrl + K / /", desc: "فتح البحث الأكاديمي الشامل في المقرر" },
        { key: "Ctrl + B / Z", desc: "التبديل الدوري لأوضاع العرض والتكبير (عادي / تركيز / تكبير شاشة)" },
        { key: "F11", desc: "دخول وضع التكبير الشامل وملء الشاشة البرمجي" },
        { key: "M", desc: "تبديل نمط الإضاءة (نهاري / مسائي)" },
        { key: "S", desc: "فتح أو إغلاق لوحة الإعدادات" },
        { key: "P", desc: "فتح بوابة اختيار المقررات والفصول الدراسية" },
        { key: "↓ / ↑", desc: "تمرير سلس لثلاثة أرباع الصفحة على الحواسيب" },
        { key: "?", desc: "إظهار نافذة اختصارات لوحة المفاتيح هذه" },
        { key: "Escape", desc: "إغلاق أي نافذة منبثقة أو لوحة نشطة أو عارض شرائح" }
      ]
    },
    {
      title: "بنك الأسئلة والاختبارات",
      shortcuts: [
        { key: "1  2  3  4", desc: "اختيار الإجابة (A, B, C, D) للسؤال المعروض" },
        { key: "E", desc: "فتح أو طي الشرح والتعليل العلمي للحل" },
        { key: "T", desc: "عرض أو إخفاء الترجمة الفورية للسؤال والخيارات" },
        { key: "B", desc: "إضافة أو إزالة علامة مرجعية ملونة للسؤال" },
        { key: "F", desc: "تعليم السؤال بعلم للمراجعة السريعة قبل الاختبار" },
        { key: "J / K", desc: "الانتقال للسؤال التالي أو السابق" }
      ]
    },
    {
      title: "عارض السلايدات واللايت بوكس",
      shortcuts: [
        { key: "←  →", desc: "التقليب والتنقل بين شرائح المحاضرة" },
        { key: "+  -", desc: "تقريب أو تصغير صورة الشريحة في اللايت بوكس" },
        { key: "0", desc: "إعادة ضبط مقياس الزوم للوضع الطبيعي (100%)" },
        { key: "نقر مزدوج", desc: "تكبير سريع 2.5x والتوسيط التلقائي" },
        { key: "F11", desc: "دخول ملء الشاشة البرمجي" }
      ]
    },
    {
      title: "الجداول والملخص النظري",
      shortcuts: [
        { key: "انقر شريحة", desc: "القفز المباشر بروابط السلايدات مع حفظ موضع العودة" },
        { key: "نسخ Markdown", desc: "نسخ أي جدول مقارنة إلى الحافظة بصيغة Markdown كاملة" },
        { key: "فلتر الأهمية 1..5", desc: "تصفية صفوف الجداول حسب ثقلها في الامتحانات" }
      ]
    }
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 2600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "88vh",
          overflowY: "auto",
          margin: 0,
          padding: "24px",
          background: "var(--sf)",
          border: "1px solid var(--ln)",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.55)",
          borderRadius: "var(--r-l)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* رأس النافذة */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icons.Tip size={22} />
              <span>اختصارات لوحة المفاتيح والتحكم السريع</span>
            </h3>
            <p style={{ color: "var(--ink-m)", fontSize: "0.83rem", marginTop: "3px" }}>
              تنقل وادرس بكفاءة وسرعة فائقة باستخدام اختصارات لوحة المفاتيح
            </p>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="إغلاق">
            <Icons.Cross size={18} />
          </button>
        </div>

        {/* المجموعات */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {categories.map((cat, catIdx) => (
            <div key={catIdx} style={{ background: "var(--sf2)", borderRadius: "var(--r-m)", border: "1px solid var(--ln)", padding: "14px 16px" }}>
              <h4 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--acc)", marginBottom: "10px" }}>
                {cat.title}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {cat.shortcuts.map((sc, scIdx) => (
                  <div
                    key={scIdx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      fontSize: "0.84rem"
                    }}
                  >
                    <span style={{ color: "var(--ink)", opacity: 0.9 }}>{sc.desc}</span>
                    <kbd
                      style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "var(--sf)",
                        border: "1px solid var(--ln)",
                        fontFamily: "var(--fm)",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "var(--acc-b)",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                        whiteSpace: "nowrap",
                        direction: "ltr"
                      }}
                    >
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.76rem", color: "var(--ink-m)" }}>
          اضغط <kbd style={{ padding: "2px 5px", border: "1px solid var(--ln)", borderRadius: "4px" }}>Escape</kbd> في أي وقت لإغلاق هذه النافذة
        </div>
      </div>
    </div>
  );
};

// ==============================================================================
// المنصة التعليمية الموحدة — محول الثيمات الـ 11 والنمطين النهاري والمسائي
// Two-Tone 135deg Swatches · Dual Mode Light & Night · Zero Emojis
// ==============================================================================

import React, { useEffect, useState } from "react";
import { Icons } from "../icons/SvgIcons";

export const THEME_LIST = [
  { id: "amber", name: "كهرماني دافئ" },
  { id: "amber-classic", name: "كهرماني كلاسيكي" },
  { id: "obsidian", name: "سبجي سماوي" },
  { id: "emerald", name: "زمردي هادئ" },
  { id: "ocean", name: "محيطي نقي" },
  { id: "amethyst", name: "جمشت ملكي" },
  { id: "crimson", name: "قرمزي جريء" },
  { id: "neon", name: "نيون سماوي" },
  { id: "mist", name: "ضبابي حيادي" },
  { id: "sage", name: "مريمي طبيعي" },
  { id: "rose", name: "وردي ناعم" }
];

export const ThemeSelector: React.FC = () => {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("unified_theme") || "amber");
  const [mode, setMode] = useState<"dark" | "light">(() => (localStorage.getItem("unified_mode") as "dark" | "light") || "dark");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("unified_theme", theme);
    localStorage.setItem("unified_mode", mode);
  }, [theme, mode]);

  const toggleMode = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* زر التبديل السريع بين الوضع النهاري والمسائي */}
        <button
          type="button"
          onClick={toggleMode}
          className="btn btn-icon btn-sm"
          title={mode === "dark" ? "التحويل إلى النمط النهاري" : "التحويل إلى النمط المسائي"}
          aria-label="تبديل الإضاءة"
        >
          {mode === "dark" ? <Icons.Sun size={17} /> : <Icons.Moon size={17} />}
        </button>

        {/* زر فتح لوحة الثيمات */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-icon btn-sm"
          title="تغيير ثيم المنصة (11 ثيماً)"
          aria-label="اختيار ثيم"
        >
          <Icons.Settings size={17} />
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            background: "var(--sf)",
            border: "1px solid var(--ln)",
            borderRadius: "var(--r-m)",
            padding: "16px",
            boxShadow: "var(--sh)",
            zIndex: 1100,
            minWidth: "260px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>الثيمات الـ 11</span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={toggleMode}
              style={{ padding: "3px 8px", fontSize: "0.78rem" }}
            >
              {mode === "dark" ? <Icons.Sun size={13} /> : <Icons.Moon size={13} />}
              <span>{mode === "dark" ? "نهاري" : "مسائي"}</span>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", justifyItems: "center" }}>
            {THEME_LIST.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tdot tdot-${t.id} ${theme === t.id ? "active" : ""}`}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                title={t.name}
                aria-label={t.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

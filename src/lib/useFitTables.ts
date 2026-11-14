// ==============================================================================
// المنصة التعليمية الموحدة — محرك تحجيم الجداول المرن لشاشات الجوال (fitTables)
// نفس رندر سطح المكتب مصغّراً بدقة متناسبة مع عرض الشاشة بدون تكديس مشوّه
// ==============================================================================

import { useEffect, type RefObject } from "react";

export function fitTablesInElement(container: HTMLElement | null, disabled = false): void {
  if (!container) return;
  const wraps = container.querySelectorAll<HTMLElement>(
    ".tbl-wrap, .em-table-wrap, .pat-table-wrap, .malware-table-wrap"
  );

  wraps.forEach((wrap) => {
    const sc = wrap.querySelector<HTMLElement>(".tbl-scale");
    const tbl = (sc || wrap).querySelector<HTMLTableElement>("table");
    if (!sc || !tbl) return;

    // إعادة الضبط قبل القياس لتقدير الأبعاد الطبيعية للجدول
    sc.style.transform = "";
    sc.style.transformOrigin = "";
    sc.style.width = "";
    sc.style.height = "";
    wrap.style.height = "";
    wrap.style.overflowX = "";

    if (disabled) return;

    const avail = wrap.clientWidth;
    if (avail <= 0) return;

    const w = tbl.offsetWidth;
    const h = tbl.offsetHeight;
    if (w > avail + 1 && h > 0) {
      const k = avail / w;
      const isRtl = getComputedStyle(wrap).direction === "rtl";
      sc.style.transformOrigin = isRtl ? "top right" : "top left";
      sc.style.width = `${w}px`;
      sc.style.transform = `scale(${k})`;
      sc.style.height = `${Math.ceil(h * k)}px`;

      const cs = getComputedStyle(wrap);
      const borderV =
        (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      wrap.style.height = `${Math.ceil(h * k + borderV)}px`;
      wrap.style.overflowX = "hidden";
    }
  });
}

export function useFitTables(
  containerRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
  disabled = false
): void {
  useEffect(() => {
    const run = () => fitTablesInElement(containerRef.current, disabled);
    const rafId = window.requestAnimationFrame(run);
    const timer = window.setTimeout(run, 140);

    window.addEventListener("resize", run);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => run());
      ro.observe(containerRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
      window.removeEventListener("resize", run);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, ...deps]);
}

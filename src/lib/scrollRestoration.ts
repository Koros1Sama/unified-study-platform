// ==============================================================================
// المنصة التعليمية الموحدة — محرك استعادة موضع التمرير متعدد الإطارات
// Rock-Solid History, Hyperlink & Back Button Multi-Frame Scroll Restoration
// Delays: [0, 25, 75, 180, 400, 750, 1200]ms · Rule 11
// Zero Emojis Standard
// ==============================================================================

import type { ActiveView, SlideItem } from "../types";

const DELAYS = [0, 25, 75, 180, 400, 750, 1200];

let activeScrollTimers: ReturnType<typeof setTimeout>[] = [];
let detachUserInterruptListeners: (() => void) | null = null;
let programmaticScrollUntil = 0;

function markProgrammaticScroll(): void {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  programmaticScrollUntil = now + 60;
}

function escapeCssValue(val: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(val);
  }
  return val.replace(/["\\]/g, "\\$&");
}

function resolveTargetElement(selectorOrEl: string | HTMLElement): Element | null {
  if (typeof selectorOrEl !== "string") return selectorOrEl;
  if (typeof document === "undefined") return null;

  const trimmed = selectorOrEl.trim();
  if (!trimmed) return null;

  // دعم مباشر لصيغة [id="..."] لتفادي CSS DOMException مع معرّفات تحتوي رموزاً خاصة
  if (trimmed.startsWith('[id="') && trimmed.endsWith('"]')) {
    const rawId = trimmed.slice(5, -2);
    return document.getElementById(rawId);
  }

  // دعم مباشر لصيغة #id بدون مركّبات CSS
  if (trimmed.startsWith("#") && !/[\s>+~[\](),:]/.test(trimmed.slice(1))) {
    const rawId = trimmed.slice(1);
    const byId = document.getElementById(rawId);
    if (byId) return byId;
    try {
      return document.querySelector(`#${escapeCssValue(rawId)}`);
    } catch {
      return null;
    }
  }

  try {
    return document.querySelector(trimmed);
  } catch {
    return null;
  }
}

export function cancelPendingScrollRestoration(): void {
  if (activeScrollTimers.length > 0) {
    for (const timer of activeScrollTimers) {
      clearTimeout(timer);
    }
    activeScrollTimers = [];
  }
  if (detachUserInterruptListeners) {
    detachUserInterruptListeners();
    detachUserInterruptListeners = null;
  }
}

function attachUserInterruptListeners(): void {
  if (typeof window === "undefined") return;
  if (detachUserInterruptListeners) {
    detachUserInterruptListeners();
    detachUserInterruptListeners = null;
  }

  const onDirectUserInput = () => {
    cancelPendingScrollRestoration();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (
      e.key === "Shift" ||
      e.key === "Control" ||
      e.key === "Alt" ||
      e.key === "Meta" ||
      e.key === "Escape"
    ) {
      return;
    }
    cancelPendingScrollRestoration();
  };

  const onScroll = () => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now > programmaticScrollUntil) {
      cancelPendingScrollRestoration();
    }
  };

  window.addEventListener("wheel", onDirectUserInput, { passive: true });
  window.addEventListener("touchstart", onDirectUserInput, { passive: true });
  window.addEventListener("touchmove", onDirectUserInput, { passive: true });
  window.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });

  detachUserInterruptListeners = () => {
    window.removeEventListener("wheel", onDirectUserInput);
    window.removeEventListener("touchstart", onDirectUserInput);
    window.removeEventListener("touchmove", onDirectUserInput);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("scroll", onScroll);
  };
}

// تعطيل استعادة المتصفح التلقائية لمنع القفز والتضارب مع رندرة الـ SPA
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export function restoreScrollPosition(targetY: number, onComplete?: () => void): void {
  if (typeof targetY !== "number" || isNaN(targetY) || targetY < 0) return;
  cancelPendingScrollRestoration();
  attachUserInterruptListeners();

  DELAYS.forEach((delay, idx) => {
    const timer = setTimeout(() => {
      markProgrammaticScroll();
      window.scrollTo({
        top: targetY,
        behavior: delay === 0 ? "instant" : "auto"
      });
      if (idx === DELAYS.length - 1) {
        cancelPendingScrollRestoration();
        if (onComplete) onComplete();
      }
    }, delay);
    activeScrollTimers.push(timer);
  });
}

export function restoreScrollToElement(
  selectorOrEl: string | HTMLElement,
  offset: number = 80,
  onComplete?: () => void
): void {
  cancelPendingScrollRestoration();
  attachUserInterruptListeners();

  DELAYS.forEach((delay, idx) => {
    const timer = setTimeout(() => {
      const el = resolveTargetElement(selectorOrEl);
      if (el) {
        const rect = el.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY - offset;
        markProgrammaticScroll();
        window.scrollTo({
          top: Math.max(0, absoluteTop),
          behavior: delay === 0 ? "instant" : "auto"
        });
      }
      if (idx === DELAYS.length - 1) {
        cancelPendingScrollRestoration();
        if (onComplete) onComplete();
      }
    }, delay);
    activeScrollTimers.push(timer);
  });
}

/**
 * حل وتطبيع مرجع الشريحة من أي صيغة (مثل s15, S15, L1-S015, L1-S15, 15)
 * مع ربطها برقم المحاضرة الصحيح وسحب الكائن الأصلي للشريحة.
 */
export function resolveSlideReference(
  rawRef: string,
  currentLectureId?: string,
  allSlides: SlideItem[] = []
): SlideItem | null {
  if (!rawRef) return null;
  const clean = rawRef.trim().replace(/^#/, "").replace(/^slide[-_]/i, "");

  // 1. مطابقة مباشرة تامة للرمز
  const exact = allSlides.find((s) => s.ref.toUpperCase() === clean.toUpperCase());
  if (exact) return exact;

  // 2. تحليل الأنماط المتنوعة: L1-S015, L1-S15, S15, s15, 15
  const match = clean.match(/^(?:(L\d+)[-_])?S?0*(\d+)$/i);
  if (match) {
    const lecPrefix = match[1] ? match[1].toUpperCase() : undefined;
    const slideNum = parseInt(match[2], 10);

    if (lecPrefix) {
      const matchInLec = allSlides.find(
        (s) => s.lecture_id.toUpperCase() === lecPrefix && s.slide_num === slideNum
      );
      if (matchInLec) return matchInLec;
    } else {
      // إذا لم يُحدد رقم المحاضرة، نبحث أولاً في المحاضرة المحددة/النشطة
      if (currentLectureId && currentLectureId !== "all") {
        const matchInCurrent = allSlides.find(
          (s) => s.lecture_id.toUpperCase() === currentLectureId.toUpperCase() && s.slide_num === slideNum
        );
        if (matchInCurrent) return matchInCurrent;
      }
      // ثم في كامل السلايدات
      const matchAny = allSlides.find((s) => s.slide_num === slideNum);
      if (matchAny) return matchAny;
    }
  }

  // 3. محاولة تطابق جزئي
  const partial = allSlides.find((s) => s.ref.toUpperCase().includes(clean.toUpperCase()));
  if (partial) return partial;

  return null;
}

/**
 * قنص فوري مباشر متمركز على إطار صورة الشريحة (.sc-imgwrap)
 * لا يتأثر بطول أو فتح لوحة الترجمة أو الشرح، وبدون حركة ترانزيشن من أعلى الصفحة.
 */
export function instantCenterOnSlide(ref: string, onComplete?: () => void, triggerFlash: boolean = true): boolean {
  if (typeof document === "undefined" || !ref) return false;
  let card: Element | null = document.getElementById(`slide-${ref}`);
  if (!card) {
    const escapedRef = escapeCssValue(ref);
    try {
      card =
        document.querySelector(`[data-ref="${escapedRef}"]`) ||
        document.querySelector(`.slide-card[data-ref="${escapedRef}"]`);
    } catch {
      card = null;
    }
  }

  if (!card) return false;

  card.classList.remove("hidden");

  // استهداف إطار صورة السلايد مباشرة لضمان تموضعه في المنتصف تماماً
  const imgWrap = (card.querySelector(".sc-imgwrap") as HTMLElement) || (card.querySelector(".sc-body") as HTMLElement) || (card as HTMLElement);

  const topbar = document.getElementById("topbar") || document.querySelector(".topbar");
  const topbarH = topbar ? topbar.getBoundingClientRect().height : 58;

  const rect = imgWrap.getBoundingClientRect();
  const currentScrollY = window.scrollY || document.documentElement.scrollTop;
  const availableH = window.innerHeight - topbarH;
  const targetY = Math.max(
    0,
    Math.round(currentScrollY + rect.top - topbarH - Math.max(0, (availableH - rect.height) / 2))
  );

  // إيقاف ترانزيشن السكرول السلس العام قسرياً لمنع حركة النزول من أعلى الصفحة
  const docEl = document.documentElement;
  const prevScrollBehavior = docEl.style.scrollBehavior;
  docEl.style.scrollBehavior = "auto";

  markProgrammaticScroll();
  window.scrollTo({
    top: targetY,
    behavior: "instant" as ScrollBehavior
  });

  requestAnimationFrame(() => {
    docEl.style.scrollBehavior = prevScrollBehavior;
  });

  // وميض التأكيد البصري للشريحة المستهدفة (مرة واحدة فقط)
  if (triggerFlash) {
    card.classList.remove("flash", "targeted");
    void (card as HTMLElement).offsetWidth; // force reflow
    card.classList.add("flash", "targeted");
    setTimeout(() => {
      card.classList.remove("flash");
    }, 2600);
  }

  if (onComplete) onComplete();
  return true;
}

/**
 * محرك قفز متزامن متعدد الإطارات للوصول للشريحة وإحكام التمركز مع تمدد الصور والمعادلات
 */
export function jumpDirectlyToSlide(ref: string, onComplete?: () => void): void {
  if (!ref) return;
  cancelPendingScrollRestoration();
  attachUserInterruptListeners();

  const attempts = [0, 35, 100, 220, 450, 800];
  let hasFlashed = false;
  attempts.forEach((delay, idx) => {
    const timer = setTimeout(() => {
      const isLast = idx === attempts.length - 1;
      const centered = instantCenterOnSlide(ref, undefined, !hasFlashed);
      if (centered) {
        hasFlashed = true;
      }
      if (isLast) {
        cancelPendingScrollRestoration();
        if (onComplete) onComplete();
      }
    }, delay);
    activeScrollTimers.push(timer);
  });
}

export interface ParsedLocationState {
  view?: ActiveView;
  lec?: string;
  model?: string;
  ref?: string;
  qId?: string;
}

export function parseLocationHash(): ParsedLocationState {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash) return {};

  // حالة سؤال مباشر في بنك الأسئلة مثل #q-toc:m1:1 أو #question-123
  if (/^(?:q|question)-([a-zA-Z0-9_:.\u0600-\u06FF-]+)$/i.test(hash)) {
    const qMatch = hash.match(/^(?:q|question)-([a-zA-Z0-9_:.\u0600-\u06FF-]+)$/i);
    return {
      view: "questions",
      qId: qMatch ? qMatch[1] : undefined
    };
  }

  // حالة شريحة مباشرة تدعم كافة الصيغ (L1-S015, L1-S15, S15, s15, slide-15, slide-L1-S005)
  const slideHashMatch = hash.match(/^(?:slide[-_])?((?:L\d+[-_])?S?\d{1,3})$/i);
  if (slideHashMatch) {
    const raw = slideHashMatch[1].toUpperCase();
    const lecMatch = raw.match(/^(L\d+)[-_]/i);
    return {
      view: "slides",
      ref: raw,
      lec: lecMatch ? lecMatch[1].toUpperCase() : undefined
    };
  }

  // حالة معلمات استعلام: view=slides&lec=L1&ref=L1-S005
  if (hash.includes("=") || hash.includes("&")) {
    const params = new URLSearchParams(hash);
    const view = params.get("view") as ActiveView | null;
    const lec = params.get("lec") || undefined;
    const model = params.get("model") || undefined;
    const ref = params.get("ref") || undefined;
    const qId = params.get("q") || params.get("qId") || undefined;
    return {
      view: view || undefined,
      lec,
      model,
      ref,
      qId
    };
  }

  // حالة اسم قسم مباشر: #slides, #tables, #summary, #questions, إلخ
  const validViews: ActiveView[] = [
    "slides",
    "summary",
    "emergency",
    "tables",
    "questions",
    "interactive",
    "explorer",
    "exam",
    "definitions",
    "glossary",
    "patterns",
    "lab"
  ];
  if (validViews.includes(hash as ActiveView)) {
    return { view: hash as ActiveView };
  }

  return {};
}

export function buildLocationHash(
  view: ActiveView,
  lec?: string,
  model?: string,
  ref?: string,
  qId?: string
): string {
  const params = new URLSearchParams();
  params.set("view", view);
  if (lec && lec !== "all") params.set("lec", lec);
  if (model && model !== "all") params.set("model", model);
  if (ref) params.set("ref", ref);
  if (qId) params.set("q", qId);
  return `#${params.toString()}`;
}

// ==============================================================================
// المنصة التعليمية الموحدة — أدوات معالجة النصوص والبحث والتعقيم والخلط الذكي
// Shared Text, Arabic Normalization, HTML Sanitization & Smart Shuffle Utilities
// ==============================================================================

import React from "react";
import type { UnifiedQuestion } from "../types";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const POSITIONAL_LETTER_REF =
  /\b(?:both\s+[a-e]\s*(?:and|&)\s*[a-e]|[a-e]\s*(?:&|and)\s*[a-e]|options?\s+[a-e]\s*(?:and|&)\s*[a-e])\b|(?:الخيار(?:ان|ين)\s+[أبجدهـa-e]\s*و\s*[أبجدهـa-e])/i;
const PIN_TO_END_OPTION =
  /^\s*(?:all\s+(?:of\s+)?the\s+above|none\s+(?:of\s+)?the\s+above|both\s+(?:of\s+)?the\s+above|all\s+the\s+mentioned|none\s+of\s+the\s+mentioned|كل\s+ما\s+سبق|جميع\s+ما\s+سبق|لا\s+شيء\s+مما\s+سبق|كلاهما|كلا\s+الإجابتين)\b/i;

export function cleanArabicOnly(text: string): string {
  if (!text || typeof text !== "string") return "";
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  let clean = text;
  clean = clean.replace(/\s*\([A-Za-z][A-Za-z0-9\s,\-–—\.:\?/'"&%#+_=]*\)\s*/g, " ");
  clean = clean.replace(/\s*\[[A-Za-z][A-Za-z0-9\s,\-–—\.:\?/'"&%#+_=]*\]\s*/g, " ");
  clean = clean.replace(/\s{2,}/g, " ").replace(/\s+([،؛:\.؟?!])/g, "$1").trim();
  return clean;
}

export function normalizeArabicSearch(text: string): string {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

export function matchesNormalizedTerms(haystack: string, rawQuery: string): boolean {
  const normQuery = normalizeArabicSearch(rawQuery).trim();
  if (!normQuery) return true;
  const normTarget = normalizeArabicSearch(haystack);
  const terms = normQuery.split(/\s+/).filter(Boolean);
  return terms.every((term) => normTarget.includes(term));
}

export function highlightSearchText(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  const termSet = new Set(terms.map((t) => t.toLowerCase()));

  return parts.map((part, idx) =>
    termSet.has(part.toLowerCase()) ? (
      <mark key={idx} className="hl-search">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const ALLOWED_STUDY_HTML_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "sub",
  "sup",
  "br",
  "code",
  "pre",
  "span",
  "p",
  "div",
  "ul",
  "ol",
  "li",
  "small",
  "mark",
  "hr",
  "kbd"
]);

const VOID_STUDY_HTML_TAGS = new Set(["br", "hr"]);
const SAFE_CLASS_VALUE_RE = /^[a-zA-Z0-9_\-\s]+$/;
const SAFE_DIR_VALUES = new Set(["ltr", "rtl", "auto"]);
const HTML_ATTR_RE =
  /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function extractSafeTagAttributes(rawAttrs: string | undefined): string {
  if (!rawAttrs) return "";
  let safeClass = "";
  let safeDir = "";
  HTML_ATTR_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = HTML_ATTR_RE.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const val = (match[2] ?? match[3] ?? match[4] ?? "").trim();
    if (!val) continue;

    if (name === "class") {
      if (SAFE_CLASS_VALUE_RE.test(val)) {
        safeClass = val.replace(/\s+/g, " ");
      }
    } else if (name === "dir") {
      const lower = val.toLowerCase();
      if (SAFE_DIR_VALUES.has(lower)) {
        safeDir = lower;
      }
    }
  }

  let out = "";
  if (safeClass) out += ` class="${safeClass}"`;
  if (safeDir) out += ` dir="${safeDir}"`;
  return out;
}

/**
 * تعقيم صارم بقائمة بيضاء للوسوم الآمنة فقط (Allowlist Sanitizer):
 * يحمي من ثغرات XSS ويعالج تعابير ديراك الكمية (مثل <u|v> و<u|rho|u> و<A>)
 * بتهريب أي وسم غير مسموح إلى &lt; مع اشتراط حدود دقيقة للوسم (?:/?>|\s).
 */
export function sanitizeStudyHtml(raw: string): string {
  if (!raw) return "";
  const input = String(raw);
  const closeTagRe = /<\/([a-zA-Z]+)\s*>/y;
  const openTagRe = /<([a-zA-Z]+)(?=\/?>|\s)(\s[^<>]*?)?\s*(\/?)>/y;

  let out = "";
  let pos = 0;

  while (pos < input.length) {
    const ltIdx = input.indexOf("<", pos);
    if (ltIdx === -1) {
      out += input.slice(pos);
      break;
    }

    if (ltIdx > pos) {
      out += input.slice(pos, ltIdx);
    }

    closeTagRe.lastIndex = ltIdx;
    const closeMatch = closeTagRe.exec(input);
    if (closeMatch) {
      const tag = closeMatch[1].toLowerCase();
      if (ALLOWED_STUDY_HTML_TAGS.has(tag) && !VOID_STUDY_HTML_TAGS.has(tag)) {
        out += `</${tag}>`;
        pos = closeTagRe.lastIndex;
        continue;
      }
    }

    openTagRe.lastIndex = ltIdx;
    const openMatch = openTagRe.exec(input);
    if (openMatch) {
      const tag = openMatch[1].toLowerCase();
      if (ALLOWED_STUDY_HTML_TAGS.has(tag)) {
        const safeAttrs = extractSafeTagAttributes(openMatch[2]);
        out += `<${tag}${safeAttrs}>`;
        pos = openTagRe.lastIndex;
        continue;
      }
    }

    out += "&lt;";
    pos = ltIdx + 1;
  }

  return out;
}

const STRIP_ALLOWED_TAG_RE =
  /<\/?(?:b|strong|i|em|u|s|sub|sup|br|code|pre|span|p|div|ul|ol|li|small|mark|hr|kbd)(?=\/?>|\s)(?:\s[^<>]*?)?\/?>/gi;

export function stripHtmlTags(raw: string): string {
  return String(raw || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(STRIP_ALLOWED_TAG_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function fisherYatesShuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function createDeterministicRng(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * خلط ذكي للخيارات يحمي الأسئلة التي تحتوي إحالات حرفية (مثل a & b)
 * ويثبّت خيارات «كل ما سبق / لا شيء مما سبق» في الموضع الأخير.
 */
export function buildShuffledOptionPermutation(
  optionsEn: string[],
  optionsAr: string[] | undefined,
  seedText: string
): number[] {
  const len = optionsEn.length;
  const identity = optionsEn.map((_, i) => i);
  if (len < 2) return identity;

  const combined = optionsEn.map((en, i) => `${en || ""} ${optionsAr?.[i] || ""}`);
  if (combined.some((txt) => POSITIONAL_LETTER_REF.test(txt))) {
    return identity;
  }

  const pinnedIndices: number[] = [];
  const movableIndices: number[] = [];
  combined.forEach((txt, idx) => {
    if (PIN_TO_END_OPTION.test(txt.trim())) {
      pinnedIndices.push(idx);
    } else {
      movableIndices.push(idx);
    }
  });

  if (movableIndices.length < 2) return identity;

  const rng = createDeterministicRng(seedText);
  const shuffledMovable = fisherYatesShuffle(movableIndices, rng);
  return [...shuffledMovable, ...pinnedIndices];
}

export function applyOptionPermutation(
  question: UnifiedQuestion,
  perm: number[]
): UnifiedQuestion {
  const isIdentity = perm.every((val, idx) => val === idx);
  if (isIdentity) return question;

  const newOptsEn = perm.map((origIdx) => question.options_en[origIdx]);
  const newOptsAr = question.options_ar ? perm.map((origIdx) => question.options_ar[origIdx]) : [];
  const newCorrect = perm.indexOf(question.correct_answer);

  let newDistractor = question.distractor_analysis;
  if (question.distractor_analysis) {
    const remapped: UnifiedQuestion["distractor_analysis"] = {};
    perm.forEach((origIdx, newIdx) => {
      if (question.distractor_analysis[String(origIdx)] !== undefined) {
        remapped[String(newIdx)] = question.distractor_analysis[String(origIdx)];
      }
    });
    newDistractor = remapped;
  }

  return {
    ...question,
    options_en: newOptsEn,
    options_ar: newOptsAr,
    correct_answer: newCorrect >= 0 ? newCorrect : question.correct_answer,
    distractor_analysis: newDistractor
  };
}

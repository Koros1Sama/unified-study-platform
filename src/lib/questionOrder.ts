// ==============================================================================
// المنصة التعليمية الموحدة — محرك ترتيب الأسئلة (طبيعي / حسب الدروس / حسب التشابه)
// Zero Emojis · Fast Client-Side Similarity Clustering + Slide Order
// ==============================================================================

import type { UnifiedQuestion } from "../types";

export type QuestionSortMode = "natural" | "similarity" | "slides";

const STOP_WORDS = new Set([
  "the", "is", "are", "was", "were", "a", "an", "of", "in", "to", "for", "and",
  "or", "not", "by", "with", "on", "at", "from", "as", "which", "what", "when",
  "where", "how", "why", "who", "does", "do", "did", "can", "if", "that", "this",
  "it", "its", "be", "have", "has", "any", "all", "only", "true", "false",
  "في", "من", "على", "إلى", "عن", "مع", "أو", "و", "ما", "هل", "أي", "التي",
  "الذي", "هذا", "هذه", "تلك", "ذلك", "عند", "بين", "كل", "لا", "أن", "إن",
  "هو", "هي", "كان", "يكون", "تكون", "صواب", "خطأ", "فقط", "دائماً"
]);

function extractLectureNum(q: UnifiedQuestion): number {
  const raw = q.lecture_id || (q.slide_ref ? q.slide_ref.split("-")[0] : "");
  const m = String(raw).match(/L(\d+)/i);
  return m ? Number(m[1]) : 999;
}

function extractSlideNum(q: UnifiedQuestion): number {
  if (!q.slide_ref) return 9999;
  const m = String(q.slide_ref).match(/S0*(\d+)/i);
  return m ? Number(m[1]) : 9999;
}

export function sortQuestionsBySlides(list: UnifiedQuestion[]): UnifiedQuestion[] {
  return [...list].sort((a, b) => {
    const la = extractLectureNum(a);
    const lb = extractLectureNum(b);
    if (la !== lb) return la - lb;
    const sa = extractSlideNum(a);
    const sb = extractSlideNum(b);
    if (sa !== sb) return sa - sb;
    return (a.orig_q_num || 0) - (b.orig_q_num || 0);
  });
}

function tokenizeQuestion(q: UnifiedQuestion): Set<string> {
  const raw = [
    q.question_en || "",
    q.question_ar || "",
    ...(q.options_en || []),
    ...(q.options_ar || []),
    q.exam_tip || ""
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, " ");

  const tokens = new Set<string>();
  for (const w of raw.split(/\s+/)) {
    if (w.length < 2 || STOP_WORDS.has(w)) continue;
    tokens.add(w);
  }
  return tokens;
}

export function computeQuestionSimilarityOrder(list: UnifiedQuestion[]): Map<string, number> {
  const orderMap = new Map<string, number>();
  if (list.length === 0) return orderMap;

  const sortedBase = sortQuestionsBySlides(list);
  const n = sortedBase.length;
  const tokens = sortedBase.map(tokenizeQuestion);
  const used = new Uint8Array(n);

  let cur = 0;
  used[0] = 1;
  orderMap.set(sortedBase[0].id, 1);

  for (let step = 1; step < n; step++) {
    const curQ = sortedBase[cur];
    const curTok = tokens[cur];
    let bestIdx = -1;
    let bestScore = -1;

    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const cand = sortedBase[j];
      let score = 0;

      if (curQ.twin_group_id && cand.twin_group_id && curQ.twin_group_id === cand.twin_group_id) {
        score += 10;
      }
      if (curQ.slide_ref && cand.slide_ref && curQ.slide_ref === cand.slide_ref) {
        score += 0.85;
      } else if (curQ.lecture_id && cand.lecture_id && curQ.lecture_id === cand.lecture_id) {
        score += 0.35;
      }

      const candTok = tokens[j];
      if (curTok.size > 0 && candTok.size > 0) {
        let inter = 0;
        curTok.forEach((t) => {
          if (candTok.has(t)) inter++;
        });
        if (inter > 0) {
          const union = curTok.size + candTok.size - inter;
          score += (inter / union) * 3.0;
        }
      }

      if (curQ.type === cand.type) score += 0.04;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }

    if (bestIdx < 0) {
      for (let j = 0; j < n; j++) {
        if (!used[j]) {
          bestIdx = j;
          break;
        }
      }
    }

    used[bestIdx] = 1;
    orderMap.set(sortedBase[bestIdx].id, step + 1);
    cur = bestIdx;
  }

  return orderMap;
}

export function sortQuestionsBySimilarity(list: UnifiedQuestion[]): UnifiedQuestion[] {
  if (list.length <= 1) return list;
  const allHavePrecomputed = list.every((q) => typeof q.similarity_order === "number");
  if (allHavePrecomputed) {
    return [...list].sort((a, b) => (a.similarity_order || 0) - (b.similarity_order || 0));
  }
  const orderMap = computeQuestionSimilarityOrder(list);
  return [...list].sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
}

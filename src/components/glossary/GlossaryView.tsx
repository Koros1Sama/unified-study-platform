// ==============================================================================
// المنصة التعليمية الموحدة — المعجم الأكاديمي ثنائي اللغة ونظام الأهمية الثلاثي
// Curated Bilingual Academic Glossary with Tiered Importance (Tiers 1, 2, 3)
// Zero Emojis Standard · 100% SVG Line-Art
// ==============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import type { GlossaryData, ImportanceTier } from "../../types";

interface GlossaryViewProps {
  data?: GlossaryData;
  subjectName?: string;
}

type TermEntry = {
  key: string;
  arabic: string;
  kind: "word" | "phrase";
  letter: string;
  importance: ImportanceTier;
  category?: string;
  ref?: string;
  context?: string;
};

export const GLOSSARY_TIER_META: Record<
  ImportanceTier,
  { label: string; short: string; badgeClass: string; desc: string }
> = {
  1: {
    label: "درجة أولى (حتمية امتحانية)",
    short: "درجة أولى · حتمي",
    badgeClass: "tier-1",
    desc: "مفاهيم وقواعد مركزية معتمدة لا يخلو منها أي امتحان رسمي"
  },
  2: {
    label: "درجة ثانية (مفاهيم داعمة)",
    short: "درجة ثانية · داعم",
    badgeClass: "tier-2",
    desc: "مصطلحات تقنية أساسية تسند فهم المتن النظري والجداول"
  },
  3: {
    label: "درجة ثالثة (تكميلية وتخصصية)",
    short: "درجة ثالثة · تكميلي",
    badgeClass: "tier-3",
    desc: "مصطلحات تخصصية مساعدة وتراكيب إثرائية للاستزادة"
  }
};

const STOP_WORDS_SET = new Set([
  "a", "about", "above", "across", "act", "actual", "add", "added", "adding", "after",
  "again", "against", "all", "allow", "allowed", "allows", "almost", "along", "already",
  "also", "altering", "alternating", "alters", "always", "among", "an", "and", "another",
  "any", "anyone", "appear", "applying", "approach", "approaches", "are", "aren't",
  "around", "as", "asb", "at", "back", "be", "became", "because", "become", "becomes",
  "becoming", "been", "before", "begin", "behind", "being", "below", "beside", "between",
  "beyond", "both", "but", "by", "can", "cannot", "can't", "case", "cases", "certain",
  "clear", "clearly", "come", "comes", "could", "did", "didn't", "do", "does", "doesn't",
  "doing", "done", "don't", "down", "during", "each", "early", "either", "end", "enough",
  "even", "ever", "every", "few", "first", "for", "from", "further", "get", "gets",
  "give", "given", "gives", "giving", "go", "goes", "going", "gone", "got", "had",
  "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
  "his", "how", "however", "if", "in", "into", "is", "isn't", "it", "its", "itself",
  "just", "keep", "keeps", "kept", "know", "known", "knows", "large", "last", "later",
  "least", "less", "let", "like", "likely", "little", "look", "looks", "made", "make",
  "makes", "making", "many", "may", "me", "mean", "means", "might", "more", "most",
  "much", "must", "my", "myself", "near", "neither", "never", "new", "next", "no",
  "none", "noone", "nor", "not", "now", "of", "off", "often", "on", "once", "one",
  "only", "onto", "or", "other", "others", "our", "ours", "ourselves", "out", "over",
  "own", "part", "per", "perhaps", "put", "puts", "rather", "same", "saw", "say",
  "saying", "says", "see", "seem", "seemed", "seeming", "seems", "seen", "sees",
  "several", "shall", "she", "should", "show", "showed", "showing", "shown", "shows",
  "side", "since", "so", "some", "someone", "something", "somewhere", "still", "such",
  "take", "taken", "takes", "taking", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "therefore", "these", "they", "thing", "things", "this",
  "those", "though", "through", "thus", "to", "too", "toward", "towards", "under",
  "until", "up", "upon", "us", "use", "used", "uses", "using", "very", "want", "was",
  "wasn't", "way", "we", "well", "went", "were", "weren't", "what", "whatever", "when",
  "where", "whether", "which", "while", "who", "whoever", "whole", "whom", "whose",
  "why", "will", "with", "within", "without", "won't", "would", "wouldn't", "yes",
  "yet", "you", "your", "yours", "yourself", "yourselves"
]);

const VALID_SHORT_ACRONYMS = new Set(["ip", "os", "ai", "db", "ui", "ux", "vm", "io", "qa", "ci", "cd", "re", "dfa", "nfa", "cfg", "pda", "tm", "des", "rsa", "aes", "sha", "mac", "arp", "tcp", "udp", "dns", "dos"]);

function isAcademicTerm(rawKey: string): boolean {
  const k = (rawKey || "").trim().toLowerCase();
  if (!k || k.length < 2) return false;
  // استبعاد الرموز المقتطعة والتنصيص وسلاسل الأشرطة
  if (k.includes("'") || k.includes('"') || /^[a-z]-[a-z0-9\-]*$/i.test(k) || /^[a-z][0-9]+$/i.test(k)) return false;
  // استبعاد السلاسل المتكررة والمجردة مثل aa, aab, ababbba, aasbb
  if (/^(.)\1+$/.test(k) || /^[ab01]+$/.test(k) || /^a+[s0-9]*b+$/.test(k)) return false;
  if (/^(a|b|c|d|s|x|y|z|w|u|v|q)[0-9a-z]*$/i.test(k) && /^[abcsxyzwuvq]{2,6}$/i.test(k) && !VALID_SHORT_ACRONYMS.has(k)) {
    return false;
  }
  if (k.length <= 2 && !VALID_SHORT_ACRONYMS.has(k)) return false;
  if (STOP_WORDS_SET.has(k)) return false;
  return true;
}

function determineHeuristicTier(key: string, meta?: any): ImportanceTier {
  if (
    meta &&
    typeof meta === "object" &&
    meta.importance &&
    (meta.importance === 1 || meta.importance === 2 || meta.importance === 3)
  ) {
    return meta.importance as ImportanceTier;
  }
  const k = (key || "").toLowerCase();
  // مفاهيم امتحانية حتمية مركزية (درجة أولى)
  const tier1Regex =
    /^(dfa|nfa|cfg|pda|turing|chomsky|decidable|undecidable|halting|p=np|np-complete|pumping\s+lemma|cia|rsa|aes|des|sha|pki|dos|ddos|mitm|sql|xss|csrf|buffer\s+overflow|agile|scrum|waterfall|spiral|cohesion|coupling|mccabe|cyclomatic|v-model|black-box|white-box|equivalence|boundary\s+value|verification|validation|hypothesis|validity|reliability|empirical)$/i;
  if (tier1Regex.test(k)) return 1;

  // مفاهيم داعمة وامتحانية رئيسية (درجة ثانية)
  const tier2Regex =
    /^(transition|alphabet|automaton|grammar|derivation|regular|context-free|encryption|cipher|hash|firewall|antivirus|authentication|authorization|access\s+control|malware|phishing|trojan|ransomware|requirements|use\s+case|architecture|refactoring|testing|debugging|sampling|variable|correlation|regression|thematic|interview|survey)$/i;
  if (tier2Regex.test(k)) return 2;

  // إذا كانت عبارة فنية مركبة
  if (k.includes(" ") || k.includes("-")) return 2;
  return 3;
}

function buildEntries(data?: GlossaryData): TermEntry[] {
  if (!data) return [];
  const entriesMap = new Map<string, TermEntry>();

  // 1. معالجة العناصر المهيكلة المنسقة مسبقاً (items / curated_items)
  const structured = data.curated_items || data.items || [];
  structured.forEach((item) => {
    const k = item.term_en.trim();
    if (!k || !isAcademicTerm(k)) return;
    const kind = item.kind || (k.includes(" ") ? "phrase" : "word");
    const letter = /^[a-z]/i.test(k) ? k[0].toUpperCase() : "#";
    entriesMap.set(k.toLowerCase(), {
      key: k,
      arabic: item.term_ar,
      kind,
      letter,
      importance: (item.importance as ImportanceTier) || 2,
      category: item.category,
      ref: item.ref,
      context: item.context
    });
  });

  // 2. معالجة المفردات (words) مع التصفية الأكاديمية الصارمة وحظر كلمات الحشو
  if (data.words) {
    Object.entries(data.words).forEach(([key, val]) => {
      const k = key.trim();
      const normKey = k.toLowerCase();
      if (!k || entriesMap.has(normKey) || !isAcademicTerm(k)) return;
      const letter = /^[a-z]/i.test(k) ? k[0].toUpperCase() : "#";
      if (typeof val === "object" && val !== null) {
        entriesMap.set(normKey, {
          key: k,
          arabic: String(val.arabic || (val as any).ar || ""),
          kind: "word",
          letter,
          importance: val.importance ? (val.importance as ImportanceTier) : determineHeuristicTier(k, val),
          category: val.category,
          ref: val.ref,
          context: val.context
        });
      } else {
        entriesMap.set(normKey, {
          key: k,
          arabic: String(val),
          kind: "word",
          letter,
          importance: determineHeuristicTier(k),
          category: undefined,
          ref: undefined,
          context: undefined
        });
      }
    });
  }

  // 3. معالجة العبارات (phrases) مع التصفية
  if (data.phrases) {
    Object.entries(data.phrases).forEach(([key, val]) => {
      const k = key.trim();
      const normKey = k.toLowerCase();
      if (!k || entriesMap.has(normKey) || !isAcademicTerm(k)) return;
      const letter = /^[a-z]/i.test(k) ? k[0].toUpperCase() : "#";
      if (typeof val === "object" && val !== null) {
        entriesMap.set(normKey, {
          key: k,
          arabic: String(val.arabic || (val as any).ar || ""),
          kind: "phrase",
          letter,
          importance: val.importance ? (val.importance as ImportanceTier) : determineHeuristicTier(k, val),
          category: val.category,
          ref: val.ref,
          context: val.context
        });
      } else {
        entriesMap.set(normKey, {
          key: k,
          arabic: String(val),
          kind: "phrase",
          letter,
          importance: determineHeuristicTier(k),
          category: undefined,
          ref: undefined,
          context: undefined
        });
      }
    });
  }

  return Array.from(entriesMap.values()).sort((a, b) => a.key.localeCompare(b.key, "en"));
}

export const GlossaryView: React.FC<GlossaryViewProps> = ({ data, subjectName }) => {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "word" | "phrase">("all");
  const [tierFilter, setTierFilter] = useState<"all" | ImportanceTier>("all");
  const [letter, setLetter] = useState<string>("all");
  const [limit, setLimit] = useState<number>(240);

  const allEntries = useMemo(() => buildEntries(data), [data]);

  const letters = useMemo(() => {
    const set = new Set<string>();
    allEntries.forEach((entry) => set.add(entry.letter));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [allEntries]);

  const stats = useMemo(() => {
    const words = allEntries.filter((e) => e.kind === "word").length;
    const tier1 = allEntries.filter((e) => e.importance === 1).length;
    const tier2 = allEntries.filter((e) => e.importance === 2).length;
    const tier3 = allEntries.filter((e) => e.importance === 3).length;
    return {
      words,
      phrases: allEntries.length - words,
      tier1,
      tier2,
      tier3
    };
  }, [allEntries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((entry) => {
      if (kind !== "all" && entry.kind !== kind) return false;
      if (tierFilter !== "all" && entry.importance !== tierFilter) return false;
      if (letter !== "all" && entry.letter !== letter) return false;
      if (!q) return true;
      return (
        entry.key.toLowerCase().includes(q) ||
        entry.arabic.includes(query.trim()) ||
        (entry.category && entry.category.toLowerCase().includes(q))
      );
    });
  }, [allEntries, query, kind, tierFilter, letter]);

  useEffect(() => {
    setLimit(240);
  }, [query, kind, tierFilter, letter]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  const grouped = useMemo(() => {
    const map = new Map<string, TermEntry[]>();
    visible.forEach((entry) => {
      const list = map.get(entry.letter) || [];
      list.push(entry);
      map.set(entry.letter, list);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en"));
  }, [visible]);

  if (allEntries.length === 0) {
    return (
      <div className="pending-box" style={{ margin: "40px auto", maxWidth: 620 }}>
        <div className="pb-ic">
          <Icons.Glossary size={34} />
        </div>
        <div className="pb-t">المعجم ثنائي اللغة غير متوفر لهذه المادة</div>
        <div className="pb-s">
          يتوفر المعجم في المواد التي تحتوي على قاموس مصطلحات إنجليزي-عربي معتمد ومنتقى بعناية.
        </div>
      </div>
    );
  }

  return (
    <div id="glossaryView" className="gloss-view">
      <div className="headline">
        <div className="kicker">
          <span className="dot" />
          <span>المعجم الأكاديمي ثنائي اللغة — {subjectName || "المادة"}</span>
        </div>
        <h1>{data?.title_ar || "معجم المصطلحات الأكاديمي المختار"}</h1>
        <p className="sub">
          {data?.sub_ar ||
            "مصطلحات منتقاة ومصنفة بنظام الأهمية الثلاثي (حتمي، داعم، تكميلي) وفق السلايدات والامتحانات الرسمية."}
        </p>
      </div>

      <div className="gloss-hero-stats">
        <div className="def-stat">
          <b>{stats.tier1}</b>
          <span>درجة أولى (حتمي)</span>
        </div>
        <div className="def-stat">
          <b>{stats.tier2}</b>
          <span>درجة ثانية (داعم)</span>
        </div>
        <div className="def-stat">
          <b>{stats.tier3}</b>
          <span>درجة ثالثة (تكميلي)</span>
        </div>
        <div className="def-stat">
          <b>{stats.words}</b>
          <span>مفرداً تقنياً</span>
        </div>
        <div className="def-stat">
          <b>{stats.phrases}</b>
          <span>عبارة مركبة</span>
        </div>
        <div className="def-stat">
          <b>{filtered.length}</b>
          <span>نتيجة معروضة</span>
        </div>
      </div>

      <div className="def-toolbar">
        <div className="def-search">
          <Icons.Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالإنجليزية، الترجمة العربية، أو التصنيف..."
            aria-label="بحث المعجم"
          />
          {query && (
            <button
              type="button"
              className="def-search-clear"
              onClick={() => setQuery("")}
              aria-label="مسح البحث"
            >
              <Icons.Cross size={15} />
            </button>
          )}
        </div>

        <div className="def-tool-actions">
          {([
            { id: "all", label: `الكل (${allEntries.length})` },
            { id: "word", label: `مفردات (${stats.words})` },
            { id: "phrase", label: `عبارات (${stats.phrases})` }
          ] as const).map((option) => (
            <button
              key={option.id}
              type="button"
              className={`fchip ${kind === option.id ? "on" : ""}`}
              onClick={() => setKind(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="def-chips gloss-tier-chips">
        <span className="chips-label">تصفية الأهمية:</span>
        {([
          { id: "all", label: `الكل (${allEntries.length})`, tierClass: "" },
          { id: 1, label: `درجة أولى · حتمية (${stats.tier1})`, tierClass: "tier-1" },
          { id: 2, label: `درجة ثانية · داعمة (${stats.tier2})`, tierClass: "tier-2" },
          { id: 3, label: `درجة ثالثة · تكميلية (${stats.tier3})`, tierClass: "tier-3" }
        ] as const).map((opt) => (
          <button
            key={String(opt.id)}
            type="button"
            className={`fchip ${opt.tierClass || ""} ${tierFilter === opt.id ? "on" : ""}`}
            onClick={() => setTierFilter(opt.id as "all" | ImportanceTier)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="gloss-alpha">
        <button
          type="button"
          className={`gloss-letter ${letter === "all" ? "on" : ""}`}
          onClick={() => setLetter("all")}
        >
          الكل
        </button>
        {letters.map((char) => (
          <button
            key={char}
            type="button"
            className={`gloss-letter ${letter === char ? "on" : ""}`}
            onClick={() => setLetter(char)}
          >
            {char}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="pending-box">
          <div className="pb-ic">
            <Icons.Search size={30} />
          </div>
          <div className="pb-t">لا توجد مصطلحات مطابقة</div>
          <div className="pb-s">
            جرّب تغيير درجة الأهمية المحددة أو توسيع البحث بالإنجليزية أو العربية.
          </div>
        </div>
      ) : (
        <div className="gloss-groups">
          {grouped.map(([char, entries]) => (
            <section key={char} className="gloss-group">
              <h2 className="gloss-group-letter">{char}</h2>
              <div className="gloss-grid">
                {entries.map((entry) => {
                  const meta = GLOSSARY_TIER_META[entry.importance];
                  return (
                    <article
                      key={`${entry.kind}-${entry.key}`}
                      className={`gloss-card gloss-tier-${entry.importance}`}
                    >
                      <div className="gloss-card-head">
                        <span
                          className={`gloss-tier ${meta.badgeClass}`}
                          title={meta.desc}
                        >
                          {meta.short}
                        </span>
                        <span className={`gloss-kind ${entry.kind}`}>
                          {entry.kind === "phrase" ? "عبارة" : "مصطلح"}
                        </span>
                        {entry.category && (
                          <span className="gloss-cat-tag">{entry.category}</span>
                        )}
                      </div>
                      <div className="gloss-en" dir="ltr">
                        {entry.key}
                      </div>
                      <div className="gloss-ar">{entry.arabic}</div>
                      {entry.context && (
                        <div className="gloss-context">{entry.context}</div>
                      )}
                      {entry.ref && <div className="gloss-ref">{entry.ref}</div>}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {filtered.length > visible.length && (
        <div className="gloss-more">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setLimit((n) => n + 240)}
          >
            عرض المزيد ({filtered.length - visible.length} متبقٍ)
          </button>
        </div>
      )}
    </div>
  );
};

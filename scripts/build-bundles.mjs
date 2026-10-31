// ==============================================================================
// المنصة التعليمية الموحدة — بناء حزم المواد الأربع من العارضات المرجعية
// Full-fidelity bundle builder: TOC, RM, SEC, SE + lab appendix
// Zero Emojis Standard · Deterministic Canonical IDs · Bundle v3
// ==============================================================================

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const PLATFORM_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(PLATFORM_DIR, "public");
const BUNDLE_VERSION = 5;

const SUBJECTS = {
  toc: {
    code: "toc",
    dir: "TOC_Slides_Viewer",
    name_ar: "نظرية الحوسبة",
    name_en: "Theory of Computation",
    professor_name: "د. رويدا العامري",
    accent_color: "#f5b13d",
    icon_name: "cpu",
    term: 1
  },
  rm: {
    code: "rm",
    dir: "RM_Viewer",
    name_ar: "منهجية البحث العلمي",
    name_en: "Research Methodology",
    professor_name: "أ.د. مالك الجبري",
    accent_color: "#38bdf8",
    icon_name: "compass",
    term: 1
  },
  sec: {
    code: "sec",
    dir: "Sec_Viewer",
    name_ar: "أمن المعلومات والشبكات",
    name_en: "Information Security",
    professor_name: "د. عبدالواسع العزاني",
    accent_color: "#fb7185",
    icon_name: "shield",
    term: 1,
    has_lab: true,
    lab_url: "https://koros1sama.github.io/sec-lab-viewer/",
    lab_title: "ملحق معمل أمن المعلومات"
  },
  se: {
    code: "se",
    dir: "SE_Viewer",
    name_ar: "هندسة البرمجيات",
    name_en: "Software Engineering",
    professor_name: "د. عمار الجوفي",
    accent_color: "#34d399",
    icon_name: "layers",
    term: 1
  }
};

function loadWindow(files) {
  const sandbox = {
    window: {},
    console,
    Object,
    Array,
    Math,
    JSON,
    String,
    Number,
    RegExp,
    Date,
    parseInt,
    parseFloat,
    isNaN
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  }
  return sandbox.window;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]/g, "")
    .trim();
}

function cleanArabicOnly(text) {
  if (!text || typeof text !== "string") return "";
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  let clean = text;
  clean = clean.replace(/\s*\([A-Za-z][A-Za-z0-9\s,\-–—\.:\?/'"&%#+_=]*\)\s*/g, " ");
  clean = clean.replace(/\s*\[[A-Za-z][A-Za-z0-9\s,\-–—\.:\?/'"&%#+_=]*\]\s*/g, " ");
  clean = clean.replace(/\s{2,}/g, " ").replace(/\s+([،؛:\.؟?!])/g, "$1").trim();
  return clean;
}

function fileList(dir, names) {
  return names.map((name) => path.join(dir, "data", `${name}.js`));
}

function modelFileNames(index = []) {
  return index.filter((name) => /^models_/.test(name));
}

function loadSubjectData(def) {
  const dataDir = path.join(ROOT, def.dir, "data");
  const baseFiles = ["meta", "config", "tables", "summary", "emergency", "interactive", "glossary", "definitions", "models"].map(
    (name) => path.join(dataDir, `${name}.js`)
  );
  const baseWindow = loadWindow(baseFiles);
  const config = baseWindow.TOC_CONFIG || {};
  const index = config.files?.index || [];
  const extraNames = index.filter(
    (name) =>
      /^L\d+_(ar|ex)$/.test(name) ||
      /^models_/.test(name) ||
      name === "bank_official" ||
      name === "bank_tests" ||
      name === "algo_patterns"
  );
  console.log(`[Build] ${def.code}: starting bundle build`);
  if (!extraNames.includes("algo_patterns") && fs.existsSync(path.join(dataDir, "algo_patterns.js"))) {
    extraNames.push("algo_patterns");
  }
  const extraWindow = loadWindow(extraNames.map((name) => path.join(dataDir, `${name}.js`)));
  return {
    dir: dataDir,
    config,
    meta: baseWindow.TOC_META || extraWindow.TOC_META || { lectures: [] },
    tables: baseWindow.TOC_TABLES || extraWindow.TOC_TABLES || [],
    summary: baseWindow.TOC_SUMMARY || extraWindow.TOC_SUMMARY,
    emergency: baseWindow.TOC_EMERGENCY || extraWindow.TOC_EMERGENCY,
    glossary: baseWindow.TOC_GLOSSARY || extraWindow.TOC_GLOSSARY,
    phrases: baseWindow.TOC_PHRASES || extraWindow.TOC_PHRASES,
    definitions: baseWindow.TOC_DEFINITIONS || extraWindow.TOC_DEFINITIONS,
    patterns: baseWindow.TOC_PATTERNS || extraWindow.TOC_PATTERNS,
    models:
      (Array.isArray(extraWindow.TOC_MODELS) && extraWindow.TOC_MODELS.length > 0
        ? extraWindow.TOC_MODELS
        : baseWindow.TOC_MODELS) || [],
    ar: extraWindow.TOC_AR || {},
    ex: extraWindow.TOC_EX || {}
  };
}

function extractOptionText(option) {
  if (option === null || option === undefined) return { en: "", ar: "" };
  if (typeof option === "string") return { en: option, ar: "" };
  return {
    en: String(option.en || option.text || option.value || option.ar || ""),
    ar: String(option.ar || option.text || option.en || "")
  };
}

const ARABIC_WHY_SPLIT =
  /(?:[\s—–|\-•.,،;/\\]+|\s*\()\s*(?:متى\s*(?:يكون\s*)?(?:صحيح|صواب|يصح)|السيناريو\s+(?:البديل|الصحيح))\s*[:：\?؟\-—]*\s*/iu;

function parseLegacyAnalysis(value) {
  if (!value) return { why_wrong: "", when_correct: "" };
  if (typeof value === "object") {
    return {
      why_wrong: String(value.why_wrong || value.why || value.reason || "").trim(),
      when_correct: String(
        value.when_correct || value.when || value.correct_scenario || ""
      ).trim()
    };
  }
  const text = String(value).trim();
  if (!text) return { why_wrong: "", when_correct: "" };
  const parts = text.split(ARABIC_WHY_SPLIT);
  return {
    why_wrong: (parts[0] || "").trim(),
    when_correct: (parts[1] || "").trim()
  };
}

function findDistractorSource(q, option, index) {
  const analysis = q.distractor_analysis;
  if (!analysis) return undefined;
  if (Array.isArray(analysis)) return analysis[index];
  if (typeof analysis === "string") {
    return index === 0 ? analysis : undefined;
  }
  if (typeof analysis !== "object") return undefined;

  const letter = String.fromCharCode(65 + index);
  const optionEn = String(option?.en || "").trim().toLowerCase();
  const optionAr = String(option?.ar || "").trim().toLowerCase();
  const keys = [
    String(index),
    letter,
    letter.toLowerCase(),
    `option_${index}`,
    optionEn,
    optionAr
  ];
  for (const key of keys) {
    if (key && Object.prototype.hasOwnProperty.call(analysis, key)) {
      return analysis[key];
    }
  }
  return undefined;
}

function normalizeOptions(q) {
  const raw = Array.isArray(q.opts) && q.opts.length > 0
    ? q.opts
    : Array.isArray(q.options) && q.options.length > 0
      ? q.options
      : [];

  const answerIndex = [
    q.answer,
    q.correct_answer,
    q.verified_answer_index,
    q.current_answer_index
  ].find((value) => Number.isInteger(value) && value >= 0);

  const normalized = raw.map((option, index) => {
    const text = extractOptionText(option);
    const source = findDistractorSource(q, { en: text.en, ar: text.ar }, index);
    const parsed = parseLegacyAnalysis(source);
    const why =
      (typeof option === "object" && option && typeof option.why === "string" && option.why) ||
      (typeof option === "object" && option && typeof option.why_wrong === "string" && option.why_wrong) ||
      parsed.why_wrong;
    return {
      en: text.en,
      ar:
        text.ar ||
        (Array.isArray(q.options_ar) ? String(q.options_ar[index] || "") : "") ||
        text.en,
      ok:
        (typeof option === "object" && option && option.ok === true) ||
        index === answerIndex,
      why: String(why || ""),
      when_correct: String(
        (typeof option === "object" && option && typeof option.when_correct === "string"
          ? option.when_correct
          : "") || parsed.when_correct || ""
      )
    };
  });

  if (normalized.length === 0 && q.type === "tf") {
    const rawAnswer =
      q.answer ?? q.correct_answer ?? q.verified_answer_index ?? q.current_answer_index;
    const trueIndex =
      rawAnswer === true ||
      rawAnswer === 0 ||
      /^(true|t|a|1|صح|صواب)$/i.test(String(rawAnswer || "").trim());
    return [
      {
        en: "True",
        ar: "صواب",
        ok: trueIndex,
        why: String(q.why || q.why_correct || "").trim(),
        when_correct: ""
      },
      {
        en: "False",
        ar: "خطأ",
        ok: !trueIndex,
        why: "",
        when_correct: ""
      }
    ];
  }

  return normalized;
}

function buildQuestions(def, data, warnings) {
  const questions = [];
  const models = [];
  const textFreq = new Map();
  const prepared = [];

  data.models.forEach((model, modelIndex) => {
    const modelId = String(model.id || `m${modelIndex + 1}`);
    let modelCount = 0;

    (model.questions || []).forEach((q, questionIndex) => {
      const isEssay = String(q.type || "").toLowerCase() === "essay";
      const options = normalizeOptions(q);

      if (isEssay || options.length < 2) {
        if (!isEssay) {
          warnings.push(`${def.code}:${modelId}:${q.n || questionIndex + 1} skipped (no options)`);
          return;
        }

        const essayEn = String(q.q_en || q.question_en || q.q || q.question || "").trim();
        const essayAr = String(q.q_ar || q.question_ar || "").trim();
        const ref = String(q.ref || q.slide_ref || "");
        prepared.push({
          id: `${def.code}:${modelId}:${q.n || questionIndex + 1}`,
          subject_code: def.code,
          model_id: modelId,
          orig_q_num: Number(q.n || questionIndex + 1),
          type: "essay",
          lecture_id: ref.includes("-") ? ref.split("-")[0] : undefined,
          slide_ref: ref || undefined,
          question_en: essayEn,
          question_ar: essayAr || cleanArabicOnly(essayEn),
          options_en: [],
          options_ar: [],
          correct_answer: -1,
          why_correct: String(q.why || q.why_correct || "").trim(),
          distractor_analysis: {},
          essay_answer_ar: String(q.ans_ar || q.answer_ar || "").trim() || undefined,
          essay_answer_en: String(q.ans_en || q.answer_en || "").trim() || undefined,
          exam_tip: q.tip || q.exam_tip || undefined,
          is_ai_predicted: /AI|تنبؤي|تنبؤ/i.test(String(model.kind || "")),
          twin_group_id: undefined,
          tg_msg_id: typeof q.tg_msg === "number" ? q.tg_msg : undefined,
          tg_url: q.tg_url || undefined
        });
        modelCount += 1;
        return;
      }

      let correct = options.findIndex((option) => option.ok);
      if (correct < 0) {
        const letter = String(q.answer_letter || q.ans_letter || q.answer || "").trim().toUpperCase();
        if (letter.length === 1 && letter >= "A" && letter <= "H") {
          correct = letter.charCodeAt(0) - 65;
        }
      }
      if (correct < 0) {
        const hinted = String(q.why || q.tip || q.exam_tip || "").match(
          /الخيار\s*\(?\s*([A-H])\s*\)?/i
        );
        if (hinted) {
          const idx = hinted[1].toUpperCase().charCodeAt(0) - 65;
          if (idx >= 0 && idx < options.length) correct = idx;
        }
      }
      if (correct < 0 || correct >= options.length) {
        warnings.push(`${def.code}:${modelId}:${q.n || questionIndex + 1} skipped (no correct answer)`);
        return;
      }

      const ref = String(q.ref || q.slide_ref || "");
      const questionEn = String(q.q_en || q.question_en || q.q || q.question || "").trim();
      const questionAr = String(q.q_ar || q.question_ar || "").trim();
      const correctText = String(options[correct].en || options[correct].ar || "").trim();
      const whyCorrect =
        options[correct].why ||
        String(q.why || q.why_correct || q.explain || "").trim() ||
        `الخيار الصحيح «${correctText}» هو الوحيد المطابق للتعريف أو الشرط المعتمد في السؤال.`;

      const distractorAnalysis = {};
      options.forEach((option, optionIndex) => {
        if (optionIndex === correct) return;
        const optionText = String(option.en || option.ar || "").trim();
        const whyWrong =
          String(option.why || "").trim() ||
          `الخيار «${optionText}» لا يطابق التعريف أو الشرط المطلوب في هذا السؤال؛ الصواب هو «${correctText}».`;
        const whenCorrect =
          String(option.when_correct || "").trim() ||
          `يكون هذا الخيار صحيحاً فقط إذا طُلب المفهوم «${optionText}» صراحةً أو عُكست صيغة السؤال.`;
        distractorAnalysis[String(optionIndex)] = {
          why_wrong: whyWrong,
          when_correct: whenCorrect
        };
      });

      const canonicalId = `${def.code}:${modelId}:${q.n || questionIndex + 1}`;
      const norm = normalizeText(questionEn);
      if (norm.length > 15) textFreq.set(norm, (textFreq.get(norm) || 0) + 1);

      prepared.push({
        id: canonicalId,
        subject_code: def.code,
        model_id: modelId,
        orig_q_num: Number(q.n || questionIndex + 1),
        type: String(q.type || "").toLowerCase() === "tf" ? "tf" : "mcq",
        lecture_id: ref.includes("-") ? ref.split("-")[0] : undefined,
        slide_ref: ref || undefined,
        question_en: questionEn,
        question_ar: questionAr || cleanArabicOnly(questionEn),
        options_en: options.map((option) => option.en),
        options_ar: options.map((option) => option.ar),
        correct_answer: correct,
        why_correct: whyCorrect,
        distractor_analysis: distractorAnalysis,
        exam_tip: q.tip || q.exam_tip || undefined,
        is_ai_predicted: /AI|تنبؤي|تنبؤ/i.test(String(model.kind || "")),
        twin_group_id: undefined,
        tg_msg_id: typeof q.tg_msg === "number" ? q.tg_msg : undefined,
        tg_url: q.tg_url || undefined
      });
      modelCount += 1;
    });

    models.push({
      id: modelId,
      title_ar: model.title_ar || model.short_label || `نموذج ${modelId}`,
      kind: model.kind || "رسمي",
      short_label: model.short_label,
      origin_ar: model.origin_ar || "",
      origin_tag: model.origin_tag,
      origin_url: model.origin_url || "",
      origin_sources: model.origin_sources,
      questions_count: modelCount
    });
  });

  const twinGroups = new Map();
  let twinCounter = 1;
  for (const item of prepared) {
    const norm = normalizeText(item.question_en);
    if (norm.length > 15 && (textFreq.get(norm) || 0) > 1) {
      if (!twinGroups.has(norm)) twinGroups.set(norm, `twin_${def.code}_${twinCounter++}`);
      item.twin_group_id = twinGroups.get(norm);
    }
    questions.push(item);
  }

  return { questions, models };
}

function buildSlides(def, data) {
  const slides = [];
  const lectures = [];

  let metaLectures = data.meta?.lectures || [];
  if (metaLectures.length === 0 && def.code === "rm") {
    metaLectures = [
      { id: "L1", ar: "مدخل إلى البحث العلمي ومفهومه", en: "Introduction to Scientific Research", count: 0, slides: [] },
      { id: "L2", ar: "صياغة مشكلة البحث والفرضيات", en: "Research Problem & Hypotheses", count: 0, slides: [] },
      { id: "L3", ar: "مراجعة الأدبيات والدراسات السابقة", en: "Literature Review", count: 0, slides: [] },
      { id: "L4", ar: "تصاميم ومناهج البحث العلمي", en: "Research Design & Methodologies", count: 0, slides: [] },
      { id: "L5", ar: "طرق جمع البيانات والعينات الإحصائية", en: "Data Collection & Sampling", count: 0, slides: [] },
      { id: "L6", ar: "كتابة التقرير النهائي والأخلاقيات", en: "Research Writing & Ethics", count: 0, slides: [] }
    ];
  }

  metaLectures.forEach((lecture, index) => {
    const lectureId = lecture.id;
    const arMap = data.ar?.[lectureId] || {};
    const exMap = data.ex?.[lectureId] || {};
    const lectureSlides = lecture.slides || [];

    lectures.push({
      id: lectureId,
      subject_code: def.code,
      title_ar: lecture.ar || `المحاضرة ${index + 1}`,
      title_en: lecture.en || lectureId,
      sort_order: index + 1,
      slides_count: lectureSlides.length || lecture.count || 0
    });

    lectureSlides.forEach((slide) => {
      const slideNum = Number(slide.n);
      const ref = `${lectureId}-S${String(slideNum).padStart(3, "0")}`;
      const arEntry = arMap[ref];
      const contentAr = Array.isArray(arEntry?.ar) ? arEntry.ar.join("\n") : (arEntry?.ar || "");
      const notesAr = exMap[ref] || arEntry?.explain || "";
      slides.push({
        subject_code: def.code,
        lecture_id: lectureId,
        slide_num: slideNum,
        ref,
        title: slide.t || ref,
        image_url: `/slides/${def.code}/${lectureId}/slide_${slideNum}.png`,
        content_ar: contentAr,
        content_en: slide.t || "",
        notes_ar: notesAr
      });
    });
  });

  return { slides, lectures };
}

function buildTables(rawTables = []) {
  return rawTables.map((table, index) => ({
    id: table.id || `table-${index + 1}`,
    lec: table.lec || "L1",
    title: table.title || table.title_ar || `جدول ${index + 1}`,
    title_ar: table.title_ar || table.title || `جدول ${index + 1}`,
    desc: table.desc || table.note_ar || "",
    note_ar: table.note_ar || table.desc || "",
    refs: table.refs || [],
    cols: table.cols || [],
    rows: table.rows || [],
    imps: table.imps || (table.rows || []).map(() => 4)
  }));
}

function buildSummary(rawSummary) {
  if (!rawSummary || !Array.isArray(rawSummary.parts)) return undefined;
  return {
    title_ar: rawSummary.title_ar || "الملخص النظري",
    sub_ar: rawSummary.scope_ar || rawSummary.sub_ar || "",
    parts: rawSummary.parts.map((part, index) => ({
      lec: part.lec || `L${index + 1}`,
      title: part.title_ar || part.title || part.lec || `المحاضرة ${index + 1}`,
      interactive: part.interactive || undefined,
      blocks: (part.blocks || []).map((block) => ({
        kind: block.kind || "p",
        head: block.title || (typeof block.head === "string" ? block.head : ""),
        title: block.title || "",
        body: block.body || "",
        items: block.items || [],
        table_head: Array.isArray(block.head) ? block.head : [],
        rows: block.rows || [],
        refs: block.refs || [],
        callout: block.callout || undefined,
        interactive: block.interactive || undefined
      }))
    }))
  };
}

function buildEmergency(rawEmergency, patterns, def) {
  const looksPlaceholder =
    !rawEmergency ||
    !rawEmergency.title_ar ||
    rawEmergency.title_ar.includes("{المادة}") ||
    rawEmergency.title_ar.includes("التجريبي");

  if (!looksPlaceholder) return rawEmergency;
  if (!patterns || !Array.isArray(patterns.rules) || patterns.rules.length === 0) {
    return rawEmergency;
  }

  const rules = patterns.rules;
  const cards = rules.map((rule) => ({
    num: rule.id.toUpperCase(),
    title: rule.title,
    body: rule.rule
  }));

  const trapRules = rules.filter((rule) => (rule.exceptions || []).length > 0);
  const traps = trapRules.map((rule) => ({
    num: rule.id.toUpperCase(),
    title: rule.title,
    points: (rule.exceptions || []).map(
      (item) =>
        `<strong>${item.m.toUpperCase()}#${item.n}</strong> — ${
          item.note || "استثناء موثق يخالف القاعدة العامة."
        }`
    )
  }));

  const shortcutRules = rules.filter((rule) => ["r1", "r2", "r3"].includes(rule.id));
  const shortcuts = shortcutRules.map((rule) => ({
    num: rule.id.toUpperCase(),
    problem: rule.title,
    rule: rule.rule,
    example_title: rule.trigger || undefined,
    steps: [
      `ابحث في نص السؤال عن: ${rule.trigger || "الكلمة المفتاحية"}.`,
      rule.accuracy ? `دقة القاعدة الموثقة: ${rule.accuracy}.` : "راجع حالات النمط الموثقة.",
      (rule.exceptions || []).length > 0
        ? `احذر ${rule.exceptions.length} استثناء موثق يخالف القاعدة.`
        : "لا استثناءات موثقة لهذه القاعدة."
    ]
  }));

  const doctorTips = [
    "ابدأ بأسلوب الحسم بالكلمات المطلقة: always / only / exclusively / proves تقود غالباً إلى False مباشرة.",
    "إذا ظهر All of the above فلن تكون صحيحة إلا إذا كانت كل العناصر صحيحة ومكتملة.",
    "لا تعتمد على طول الخيار أو الحرف وحدهما؛ استخدمهما بعد الاستبعاد فقط.",
    "الاستثناءات الموثقة في مختبر الأنماط هي أخطر الأسئلة لأنها تخالف الحدس الإحصائي."
  ];

  return {
    title_ar: `ملخص الملخص 80/20 — ${def.name_ar}`,
    sub_ar:
      "زبدة قواعد الحسم والاستثناءات الموثقة في البنك الرسمي، مستخرجة آلياً من مختبر الأنماط.",
    doctor_tips: doctorTips,
    sections: [
      {
        id: "em_rm_rules",
        type: "cards",
        nav_title: "1. قواعد الحسم السريع",
        title: "قواعد الحسم السريع المستخرجة من البنك",
        badge: "7 قواعد",
        desc: "كل قاعدة مع دقتها الموثقة وعدد حالاتها؛ اقرأها قبل أي جلسة أسئلة.",
        cards
      },
      {
        id: "em_rm_traps",
        type: "traps_grid",
        nav_title: "2. شبكة الفخاخ والاستثناءات",
        title: "الفخاخ الامتحانية والاستثناءات التي تخالف القاعدة",
        badge: `${traps.reduce((sum, trap) => sum + trap.points.length, 0)} استثناء`,
        desc: "هذه الحالات كسرت القاعدة الإحصائية؛ احفظها منفردة.",
        traps
      },
      {
        id: "em_rm_shortcuts",
        type: "shortcuts",
        nav_title: "3. الحل بالعين",
        title: "طرق الحل السريع بالعين (True / False والاستبعاد)",
        badge: "3 طرق",
        desc: "خطوات عملية لتحسم السؤال في ثوانٍ دون قراءة كل الخيارات.",
        shortcuts
      }
    ]
  };
}

const GLOSSARY_STOP_WORDS = new Set([
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

const CURATED_SUBJECT_GLOSSARIES = {
  toc: [
    {
      term_en: "Deterministic Finite Automaton (DFA)",
      term_ar: "آلة حتمية منتهية (DFA)",
      importance: 1,
      kind: "phrase",
      category: "Automata",
      ref: "L1-S005",
      context: "نموذج حسابي بحالات منتهية وانتقال محدد وحيد لكل رمز إدخال"
    },
    {
      term_en: "Nondeterministic Finite Automaton (NFA)",
      term_ar: "آلة غير حتمية منتهية (NFA)",
      importance: 1,
      kind: "phrase",
      category: "Automata",
      ref: "L2-S003",
      context: "آلة تسمح بانتقالات متعددة أو فارغة (Lambda) للرمز الواحد"
    },
    {
      term_en: "Context-Free Grammar (CFG)",
      term_ar: "قواعد خالية من السياق (CFG)",
      importance: 1,
      kind: "phrase",
      category: "Grammars",
      ref: "L5-S002",
      context: "قواعد توليدية بصيغة A -> alpha تحكم بناء لغات البرمجة"
    },
    {
      term_en: "Pushdown Automaton (PDA)",
      term_ar: "آلة ذات مكدس (PDA)",
      importance: 1,
      kind: "phrase",
      category: "Automata",
      ref: "L6-S004",
      context: "آلة حالات منتهية مزودة بذاكرة مكدس LIFO للتعرف على اللغات خالية السياق"
    },
    {
      term_en: "Turing Machine",
      term_ar: "آلة تورنغ (TM)",
      importance: 1,
      kind: "phrase",
      category: "Turing",
      ref: "L7-S001",
      context: "النموذج الرياضي القياسي الشامل للحوسبة بشريط قراءة وكتابة لا نهائي"
    },
    {
      term_en: "Chomsky Hierarchy",
      term_ar: "تسلسل تشومسكي الهرمي للغات",
      importance: 1,
      kind: "phrase",
      category: "Chomsky",
      ref: "L7-S046",
      context: "تصنيف اللغات الصورية إلى 4 مستويات: منتظمة، خالية السياق، حساسة للسياق، وغير مقيدة"
    },
    {
      term_en: "Pumping Lemma",
      term_ar: "توطئة الضخ (Pumping Lemma)",
      importance: 1,
      kind: "phrase",
      category: "Regular Languages",
      ref: "L3-S012",
      context: "برهان إثبات عدم انتظام اللغات عبر مبدأ برج الحمام والتكرار اللانهائي"
    },
    {
      term_en: "Halting Problem",
      term_ar: "مسألة التوقف (Halting Problem)",
      importance: 1,
      kind: "phrase",
      category: "Decidability",
      ref: "L8-S010",
      context: "أشهر مسألة غير قابلة للحسم أثبت تورنغ استحالة حلها بخوارزمية عامة"
    },
    {
      term_en: "Decidability",
      term_ar: "قابلية التقرير (الحسم الخوارزمي)",
      importance: 1,
      kind: "word",
      category: "Decidability",
      ref: "L8-S005",
      context: "وجود آلة تورنغ تتوقف دائماً بنعم أو لا لكل مدخلات المسألة"
    },
    {
      term_en: "Transition Function",
      term_ar: "دالة الانتقال",
      importance: 2,
      kind: "phrase",
      category: "Automata",
      ref: "L1-S008",
      context: "الدالة الرياضية التي تحدد الحالة التالية بناء على الحالة الحالية ورمز الإدخال"
    },
    {
      term_en: "Regular Expression",
      term_ar: "تعبير نمطي (Regex)",
      importance: 2,
      kind: "phrase",
      category: "Regular Languages",
      ref: "L3-S001",
      context: "صيغة جبرية لتمثيل اللغات المنتظمة باستخدام الاتحاد والدمج ونجمة كلين"
    },
    {
      term_en: "Ambiguity",
      term_ar: "غموض القواعد الصورية",
      importance: 2,
      kind: "word",
      category: "Grammars",
      ref: "L5-S022",
      context: "وجود أكثر من شجرة اشتقاق يسارية لسلسلة واحدة في نفس القواعد"
    },
    {
      term_en: "Chomsky Normal Form (CNF)",
      term_ar: "صيغة تشومسكي المعيارية",
      importance: 3,
      kind: "phrase",
      category: "Grammars",
      ref: "L5-S040",
      context: "صيغة مقيدة لقواعد CFG يكون فيها كل إنتاج إما متغيرين أو رمزاً طرفياً واحداً"
    },
    {
      term_en: "Instantaneous Description (ID)",
      term_ar: "التوصيف اللحظي لهيئة الآلة",
      importance: 3,
      kind: "phrase",
      category: "Automata",
      ref: "L6-S015",
      context: "ثلاثية تسجل الحالة الحالية وما تبقى من الإدخال ومحتوى المكدس أو الشريط"
    }
  ],
  rm: [
    {
      term_en: "Research Methodology",
      term_ar: "منهجية البحث العلمي",
      importance: 1,
      kind: "phrase",
      category: "Foundations",
      ref: "L1-S001",
      context: "الإطار الفلسفي والإجرائي المنظم لجمع البيانات وتحليلها والوصول إلى المعرفة"
    },
    {
      term_en: "Empirical Research",
      term_ar: "البحث التجريبي الواقعي",
      importance: 1,
      kind: "phrase",
      category: "Foundations",
      ref: "L1-S006",
      context: "البحث المبني على الملاحظة والقياس والأدلة الميدانية القابلة للتحقق"
    },
    {
      term_en: "Null Hypothesis (H0)",
      term_ar: "فرضية العدم (الصفرية)",
      importance: 1,
      kind: "phrase",
      category: "Hypotheses",
      ref: "L3-S004",
      context: "الادعاء الإحصائي بعدم وجود فرق أو أثر جوهري بين المتغيرات في المجتمع"
    },
    {
      term_en: "Alternative Hypothesis (H1)",
      term_ar: "الفرضية البديلة",
      importance: 1,
      kind: "phrase",
      category: "Hypotheses",
      ref: "L3-S005",
      context: "فرضية الباحث التي تدعي وجود أثر أو علاقة دالة إحصائياً"
    },
    {
      term_en: "P-Value",
      term_ar: "القيمة الاحتمالية الدلالية (P-Value)",
      importance: 1,
      kind: "word",
      category: "Statistics",
      ref: "L4-S010",
      context: "احتمال الحصول على النتائج بافتراض صحة فرضية العدم؛ تُرفض H0 إذا كانت p < 0.05"
    },
    {
      term_en: "Internal Validity",
      term_ar: "الصدق الداخلي",
      importance: 1,
      kind: "phrase",
      category: "Validity",
      ref: "L2-S014",
      context: "مدى صحة عزو التغير في المتغير التابع إلى المتغير المستقل حصراً"
    },
    {
      term_en: "External Validity",
      term_ar: "الصدق الخارجي (التعميم)",
      importance: 1,
      kind: "phrase",
      category: "Validity",
      ref: "L2-S016",
      context: "إمكانية تعميم نتائج الدراسة على مجتمعات وسياقات وأوقات أخرى"
    },
    {
      term_en: "Reliability",
      term_ar: "ثبات أداة القياس",
      importance: 1,
      kind: "word",
      category: "Measurement",
      ref: "L2-S020",
      context: "اتساق واستقرار نتائج أداة القياس عند تكرار تطبيقها في ظروف مماثلة"
    },
    {
      term_en: "Independent Variable",
      term_ar: "المتغير المستقل",
      importance: 2,
      kind: "phrase",
      category: "Variables",
      ref: "L2-S005",
      context: "المتغير الذي يتحكم فيه الباحث أو يفحصه لمعرفة أثره على المتغيرات الأخرى"
    },
    {
      term_en: "Dependent Variable",
      term_ar: "المتغير التابع",
      importance: 2,
      kind: "phrase",
      category: "Variables",
      ref: "L2-S006",
      context: "المتغير المقاس الذي يتوقع الباحث تغيره بتغير المتغير المستقل"
    },
    {
      term_en: "Stratified Sampling",
      term_ar: "العينة الطبقية العشوائية",
      importance: 2,
      kind: "phrase",
      category: "Sampling",
      ref: "L3-S015",
      context: "تقسيم المجتمع إلى فئات متجانسة ثم اختيار عينات عشوائية ممثلة لكل فئة"
    },
    {
      term_en: "Thematic Analysis",
      term_ar: "التحليل الموضوعي النوعي",
      importance: 2,
      kind: "phrase",
      category: "Qualitative",
      ref: "L5-S008",
      context: "منهجية نوعية لتحديد وتحليل وتوثيق الأنماط والموضوعات المتكررة في البيانات"
    },
    {
      term_en: "Cronbach's Alpha",
      term_ar: "معامل ألفا كرونباخ للاتساق",
      importance: 3,
      kind: "phrase",
      category: "Measurement",
      ref: "L4-S022",
      context: "مقياس إحصائي للاتساق الداخلي لمقاييس ليكرت؛ القيمة المقبولة عادة >= 0.7"
    },
    {
      term_en: "Triangulation",
      term_ar: "التثليث المنهجي",
      importance: 3,
      kind: "word",
      category: "Methodology",
      ref: "L5-S018",
      context: "استخدام مصادر متعددة للبيانات أو باحثين أو مناهج لتعزيز مصداقية النتائج"
    }
  ],
  sec: [
    {
      term_en: "CIA Triad",
      term_ar: "ثالوث أمن المعلومات (السرية والنزاهة والتوافر)",
      importance: 1,
      kind: "phrase",
      category: "Foundations",
      ref: "L1-S004",
      context: "المحددات الثلاثة المركزية لأي نظام أمني: Confidentiality, Integrity, Availability"
    },
    {
      term_en: "Symmetric Encryption",
      term_ar: "التشفير المتماثل",
      importance: 1,
      kind: "phrase",
      category: "Cryptography",
      ref: "L2-S008",
      context: "نظام تشفير يعتمد على مفتاح سري موحد ومشترك لعمليتي التشفير وفك التشفير"
    },
    {
      term_en: "Asymmetric Encryption",
      term_ar: "التشفير غير المتماثل (المفتاح العام)",
      importance: 1,
      kind: "phrase",
      category: "Cryptography",
      ref: "L3-S002",
      context: "نظام تشفير بزوج مفاتيح متكامل: مفتاح عام معلن ومفتاح خاص سري"
    },
    {
      term_en: "Public Key Infrastructure (PKI)",
      term_ar: "البنية التحتية للمفتاح العام",
      importance: 1,
      kind: "phrase",
      category: "Cryptography",
      ref: "L3-S020",
      context: "منظومة إدارية وتقنية تصدر الشهادات الرقمية وتوثق مصداقية المفاتيح العامة"
    },
    {
      term_en: "Buffer Overflow",
      term_ar: "طفح المخزن المؤقت للذاكرة",
      importance: 1,
      kind: "phrase",
      category: "Vulnerabilities",
      ref: "L4-S012",
      context: "ثغرة أمنية ناتجة عن كتابة بيانات تتجاوز الحدود المخصصة في الذاكرة لتعديل سجل التعليمات"
    },
    {
      term_en: "SQL Injection",
      term_ar: "حقن تعليمات قواعد البيانات (SQLi)",
      importance: 1,
      kind: "phrase",
      category: "Vulnerabilities",
      ref: "L4-S025",
      context: "هجوم خبيث يتضمن إدخال أوامر SQL ضارة في حقول الإدخال لتجاوز المصادقة أو سرقة البيانات"
    },
    {
      term_en: "Denial of Service (DoS)",
      term_ar: "هجوم حجب الخدمة",
      importance: 1,
      kind: "phrase",
      category: "Attacks",
      ref: "L5-S004",
      context: "إغراق خادم أو شبكة بحركة مرور مكثفة لتعطيل الخدمة ومنع المستخدمين الشرعيين من الوصول"
    },
    {
      term_en: "Principle of Least Privilege",
      term_ar: "مبدأ الحد الأدنى من الصلاحيات",
      importance: 1,
      kind: "phrase",
      category: "Access Control",
      ref: "L1-S018",
      context: "منح المستخدم أو البرنامج أدنى مستوى من الصلاحيات الكافي لإتمام المهمة فقط"
    },
    {
      term_en: "Access Control List (ACL)",
      term_ar: "قائمة التحكم بالوصول",
      importance: 2,
      kind: "phrase",
      category: "Access Control",
      ref: "L1-S022",
      context: "جدول أذونات يحدد للمستخدمين أو المجموعات العمليات المسموح بها على ملف أو مورد"
    },
    {
      term_en: "Digital Signature",
      term_ar: "التوقيع الرقمي",
      importance: 2,
      kind: "phrase",
      category: "Cryptography",
      ref: "L3-S015",
      context: "آلية تشفير تضمن توثيق هوية المرسل ونزاهة الرسالة وعدم قابلية الإنكار (Non-repudiation)"
    },
    {
      term_en: "Firewall",
      term_ar: "جدار الحماية الشبكي",
      importance: 2,
      kind: "word",
      category: "Network",
      ref: "L5-S012",
      context: "جهاز أو برنامج يراقب ويصفي حزم البيانات الداخلة والخارجة وفق قواعد أمنية محددة"
    },
    {
      term_en: "Initialization Vector (IV)",
      term_ar: "متجه التهيئة في التشفير",
      importance: 3,
      kind: "phrase",
      category: "Cryptography",
      ref: "L2-S030",
      context: "كتلة بيانات عشوائية تضاف للتشفير لضمان عدم تشابه النصوص المشفرة عند تكرار النص الأصلي"
    },
    {
      term_en: "Demilitarized Zone (DMZ)",
      term_ar: "المنطقة منزوعة السلاح في الشبكة",
      importance: 3,
      kind: "phrase",
      category: "Network",
      ref: "L5-S028",
      context: "شبكة فرعية معزولة تفصل بين الشبكة الداخلية الموثوقة والإنترنت الخارجي غير الموثوق"
    }
  ],
  se: [
    {
      term_en: "Software Development Life Cycle (SDLC)",
      term_ar: "دورة حياة تطوير البرمجيات",
      importance: 1,
      kind: "phrase",
      category: "Process Models",
      ref: "L1-S004",
      context: "المراحل المنظمة والمتتابعة لإنشاء وتطوير وصيانة الأنظمة البرمجية"
    },
    {
      term_en: "Waterfall Model",
      term_ar: "نموذج الشلال الخطي",
      importance: 1,
      kind: "phrase",
      category: "Process Models",
      ref: "L2-S003",
      context: "نموذج تطوير خطي متسلسل لا ينتقل لمرحلة تالية إلا بعد اكتمال سابقتها تماماً"
    },
    {
      term_en: "Agile Methodology",
      term_ar: "المنهجية الرشيقة (Agile)",
      importance: 1,
      kind: "phrase",
      category: "Agile",
      ref: "L3-S001",
      context: "فلسفة تطوير برمجية مرنة تركز على التسليم التكراري السريع والتكيف مع التغيير"
    },
    {
      term_en: "Cohesion",
      term_ar: "التماسك الداخلي للموديول",
      importance: 1,
      kind: "word",
      category: "Design",
      ref: "L4-S010",
      context: "مدى تركيز وترابط عناصر الوحدة البرمجية الواحدة لتحقيق هدف وظيفي موحد (المستهدف: تماسك عالٍ)"
    },
    {
      term_en: "Coupling",
      term_ar: "الاقتران والارتباط بين الموديولات",
      importance: 1,
      kind: "word",
      category: "Design",
      ref: "L4-S014",
      context: "مدى اعتمادية وتشابك الموديولات البرمجية مع بعضها البعض (المستهدف: اقتران ضعيف Loose Coupling)"
    },
    {
      term_en: "Cyclomatic Complexity",
      term_ar: "مقياس التعقيد الدوري (مكابي)",
      importance: 1,
      kind: "phrase",
      category: "Metrics",
      ref: "L5-S008",
      context: "مقياس كمي لعدد المسارات الخطية المستقلة في الكود البرمجي؛ يحسب بالصيغة: V(G) = E - N + 2P"
    },
    {
      term_en: "Black-Box Testing",
      term_ar: "اختبار الصندوق الأسود (الوظيفي)",
      importance: 1,
      kind: "phrase",
      category: "Testing",
      ref: "L6-S005",
      context: "فحص وظائف النظام ومطابقتها للمتطلبات دون النظر في بنيته البرمجية الداخلية أو كوده"
    },
    {
      term_en: "White-Box Testing",
      term_ar: "اختبار الصندوق الأبيض (الهيكلي)",
      importance: 1,
      kind: "phrase",
      category: "Testing",
      ref: "L6-S012",
      context: "فحص البنية الهيكلية الداخلية والمسارات والشروط البرمجية والتأكد من تغطية الكود"
    },
    {
      term_en: "Functional Requirements",
      term_ar: "المتطلبات الوظيفية",
      importance: 2,
      kind: "phrase",
      category: "Requirements",
      ref: "L1-S015",
      context: "الخدمات والوظائف المحددة التي يجب أن يقدمها النظام للمستخدمين واستجاباته للمدخلات"
    },
    {
      term_en: "Non-Functional Requirements",
      term_ar: "المتطلبات غير الوظيفية (صفات الجودة)",
      importance: 2,
      kind: "phrase",
      category: "Requirements",
      ref: "L1-S018",
      context: "محددات الأداء والأمان والموثوقية وقابلية التوسع والامتثال لمعايير النظام"
    },
    {
      term_en: "Refactoring",
      term_ar: "إعادة هيكلة وتحسين الكود",
      importance: 2,
      kind: "word",
      category: "Maintenance",
      ref: "L7-S004",
      context: "تعديل بنية الكود الداخلية لتحسين قابلية القراءة والصيانة دون تغيير سلوكه الخارجي"
    },
    {
      term_en: "Equivalence Partitioning",
      term_ar: "تجزئة فئات التكافؤ",
      importance: 2,
      kind: "phrase",
      category: "Testing",
      ref: "L6-S020",
      context: "تقسيم مدخلات البرنامج إلى فئات بيانات متماثلة واختيار عنصر ممثل واحد من كل فئة"
    },
    {
      term_en: "Technical Debt",
      term_ar: "الدين التقني في التصميم",
      importance: 3,
      kind: "phrase",
      category: "Architecture",
      ref: "L7-S015",
      context: "التكلفة الضمنية للإصلاحات وإعادة العمل الناتجة عن اختيار حل سريع بدلاً من الحل الهندسي الأمثل"
    },
    {
      term_en: "Mutation Testing",
      term_ar: "اختبار الطفرات البرمجية",
      importance: 3,
      kind: "phrase",
      category: "Testing",
      ref: "L6-S035",
      context: "إدخال أخطاء متعمدة (طفرات) في الكود لقياس قدرة حالات الاختبار على اكتشافها وقتلها"
    }
  ]
};

function filterCleanGlossary(rawMap) {
  if (!rawMap || typeof rawMap !== "object") return {};
  const cleaned = {};
  for (const [key, val] of Object.entries(rawMap)) {
    const k = key.trim().toLowerCase();
    if (!k || k.length < 2) continue;
    if (k.includes("'") || k.includes('"') || /^[a-z]-[a-z0-9\-]*$/i.test(k) || /^[a-z][0-9]+$/i.test(k)) continue;
    if (/^(.)\1+$/.test(k) || /^[ab01]+$/.test(k) || /^a+[s0-9]*b+$/.test(k)) continue;
    if (GLOSSARY_STOP_WORDS.has(k)) continue;
    cleaned[key] = val;
  }
  return cleaned;
}

function buildGlossary(def, data) {
  const curated = CURATED_SUBJECT_GLOSSARIES[def.code] || [];
  const rawWords = filterCleanGlossary(data.glossary);
  const rawPhrases = filterCleanGlossary(data.phrases);

  // إذا لم يتوفر معجم خاص ولم تتوفر مفردات منتقاة، لا نعيد فارغاً إذا وُجدت مفردات نخبية
  if (!curated.length && !Object.keys(rawWords).length) return undefined;

  return {
    title_ar: `معجم ${def.name_ar} ثنائي اللغة ونظام الأهمية الثلاثي`,
    sub_ar: "مصطلحات منتقاة ومصنفة بنظام الأهمية الثلاثي (حتمي، داعم، تكميلي) وفق السلايدات والامتحانات الرسمية.",
    words: rawWords,
    phrases: rawPhrases,
    curated_items: curated,
    items: curated
  };
}

function buildDefinitions(data) {
  if (!data.definitions || !Array.isArray(data.definitions.items)) return undefined;
  return {
    title_ar: data.definitions.title_ar || "بنك التعاريف والمصطلحات",
    sub_ar: data.definitions.sub_ar || "",
    items: data.definitions.items
  };
}

function toPatternCase(item) {
  return {
    m: item.m || "",
    n: Number(item.n || 0),
    q: item.q || "",
    q_ar: item.q_ar || "",
    ans: item.ans || "",
    ans_ar: item.ans_ar || "",
    ans_letter: item.ans_letter,
    note: item.note || "",
    trap_type: item.trap_type,
    trigger_word: item.trigger_word
  };
}

function buildPatterns(data) {
  const raw = data.patterns;
  if (!raw) return undefined;

  const rules = [
    {
      id: "r1",
      title: "قاعدة الكلمات المطلقة والحسم الفوري (True/False)",
      subtitle: "أكبر مكسب في أسئلة الصح والخطأ",
      rule:
        "إذا احتوى نص السؤال على كلمة مطلقة (always, only, exclusively, proves, guaranteed) أو ادعاء نمطي باطل مثل «p-value = احتمال صحة فرضية العدم» فالإجابة False مباشرة. وإذا خلا السؤال من هذه الكلمات فالأصل True.",
      trigger: "always · only · exclusively · proves · guaranteed · true",
      total: raw.r1?.total,
      accuracy: raw.r1?.accuracy,
      cases: (raw.r1?.traps || []).map(toPatternCase),
      exceptions: (raw.r1?.exceptions || []).map(toPatternCase)
    },
    {
      id: "r2",
      title: "خريطة مقاييس القياس ومقاييس النزعة المركزية",
      subtitle: "Nominal / Ordinal / Interval / Ratio",
      rule:
        "Nominal ← Mode، Ordinal ← Median، Interval و Ratio ← Mean. احفظ الاستثناءات الرسمية للبنك ولا تعمم القاعدة على كل صياغة.",
      trigger: "nominal scale · ordinal scale · interval scale · ratio scale · central tendency",
      total: raw.r2?.total,
      cases: (raw.r2?.cases || []).map(toPatternCase),
      exceptions: (raw.r2?.exceptions || []).map(toPatternCase)
    },
    {
      id: "r3",
      title: "مصيدة All of the above",
      subtitle: "متى تكون صحيحة ومتى تكون مشتتاً خادعاً",
      rule:
        "«All of the above» صحيحة فقط عندما تكون كل العناصر المذكورة مكتملة وصحيحة. إذا كان أحد العناصر ناقصاً أو خارج السياق فهي مشتت خادع، وعندها اقرأ الخيارات الأخرى بدقة.",
      trigger: "All of the above · All the above · Both of the above",
      total: raw.r3?.total,
      accuracy: raw.r3?.accuracyWithOf,
      cases: (raw.r3?.cases || []).map(toPatternCase),
      exceptions: (raw.r3?.exceptions || []).map(toPatternCase)
    },
    {
      id: "r4",
      title: "إشارة الخيار الأطول",
      subtitle: "مؤشر مساعد لا قاعدة مطلقة",
      rule:
        "في بنك المنهجية يميل الخيار الصحيح إلى أن يكون الأطول والأكثر تفصيلاً. استخدم هذا كمؤشر ترجيح فقط بعد استبعاد المشتتات، ولا تعتمد عليه منفرداً.",
      trigger: "اختر أطول خيار بعد التحقق من المضمون",
      total: raw.r4?.total,
      cases: (raw.r4?.cases || []).map(toPatternCase),
      exceptions: (raw.r4?.exceptions || []).map(toPatternCase)
    },
    {
      id: "r5",
      title: "خريطة الكلمات المحفزة (Trigger Map)",
      subtitle: `${Object.keys(raw.r5 || {}).length} نمطاً متكرراً`,
      rule:
        "كل كلمة محفزة في السؤال تقود إلى مفهوم محدد. اربط الكلمة بالمفهوم مباشرة بدل قراءة كل الخيارات قراءة كاملة.",
      trigger: "first step · research gap · sampling frame · thematic analysis · validity · reliability",
      total: Object.values(raw.r5 || {}).length,
      cases: Object.values(raw.r5 || {})
        .flatMap((rule) => [...(rule.examples || []), ...(rule.tf || [])])
        .map(toPatternCase)
        .slice(0, 120),
      exceptions: Object.values(raw.r5 || {})
        .flatMap((rule) => rule.exceptions || [])
        .map(toPatternCase)
    },
    {
      id: "r6",
      title: "توزيع الحروف وميل البنك",
      subtitle: "إحصاء لا يُغني عن المعرفة",
      rule:
        "يظهر البنك ميلاً نحو الخيارين C و D. لا تخمن اعتماداً على الحرف وحده، لكنه مؤشر مساعد عند الاستبعاد الكامل لخيارين.",
      trigger: "C · D",
      total: (raw.r6?.dist || []).reduce((sum, item) => sum + (item.total || 0), 0),
      cases: (raw.r6?.exceptions || []).map(toPatternCase)
    },
    {
      id: "r7",
      title: "الاستثناءات التي لا تتبع أي نمط",
      subtitle: "احفظها كما هي",
      rule:
        "هذه الأسئلة كسرت كل القواعد الإحصائية السابقة. راجعها منفردة قبل الاختبار، فهي الأكثر خطراً لأنها تخالف الحدس.",
      trigger: "مراجعة فردية",
      cases: (Array.isArray(raw.r7) ? raw.r7 : Object.values(raw.r7 || {})).map(toPatternCase)
    }
  ];

  return {
    title_ar: "مختبر أنماط الحل وحسم الاختيارات",
    sub_ar: "قواعد مستخرجة من تحليل كامل لبنك الأسئلة الرسمي، مع نسبة دقة كل قاعدة واستثناءاتها.",
    rules
  };
}

function buildLab(def) {
  if (!def.has_lab) return undefined;
  const labRoot = path.join(ROOT, "Sec_Lab_Viewer");
  const labDataDir = path.join(labRoot, "data");
  if (!fs.existsSync(labDataDir)) return undefined;

  const index = ["meta", "config", "L1_ar", "L1_ex", "L2_ar", "L2_ex", "L3_ar", "L3_ex", "L4_ar", "L4_ex", "L5_ar", "L5_ex", "L6_ar", "L6_ex", "L7_ar", "L7_ex", "L8_ar", "L8_ex"];
  const window = loadWindow(index.map((name) => path.join(labDataDir, `${name}.js`)));
  const meta = window.TOC_META || { lectures: [] };
  const config = window.TOC_CONFIG || {};
  const ar = window.TOC_AR || {};
  const ex = window.TOC_EX || {};
  const sessions = [];
  const slides = [];

  (meta.lectures || []).forEach((lecture, indexValue) => {
    sessions.push({
      id: lecture.id,
      title_ar: lecture.ar || `الجلسة ${indexValue + 1}`,
      title_en: lecture.en || lecture.id,
      slides_count: (lecture.slides || []).length || lecture.count || 0
    });
    (lecture.slides || []).forEach((slide) => {
      const slideNum = Number(slide.n);
      const ref = `${lecture.id}-S${String(slideNum).padStart(3, "0")}`;
      const arEntry = (ar[lecture.id] || {})[ref];
      const contentAr = Array.isArray(arEntry?.ar) ? arEntry.ar.join("\n") : (arEntry?.ar || "");
      slides.push({
        subject_code: "sec",
        lecture_id: lecture.id,
        slide_num: slideNum,
        ref,
        title: slide.t || ref,
        image_url: `/slides/sec/lab/${lecture.id}/slide_${slideNum}.png`,
        content_ar: contentAr,
        content_en: slide.t || "",
        notes_ar: (ex[lecture.id] || {})[ref] || arEntry?.explain || ""
      });
    });
  });

  return {
    title_ar: "ملحق معمل أمن المعلومات",
    sub_ar:
      "مساحة معزولة تماماً عن النظري: سلايدات المعمل وجلساته العملية فقط، دون أن تزاحم مراجعة الاختبار النهائي النظري.",
    professor_name: config.teachers || "",
    external_url: def.lab_url || "",
    sessions,
    slides
  };
}

function copySlides(sourceDir, targetCode, lab = false) {
  if (!fs.existsSync(sourceDir)) return 0;
  let count = 0;
  const lectureDirs = fs.readdirSync(sourceDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const lectureEntry of lectureDirs) {
    const lectureDir = path.join(sourceDir, lectureEntry.name);
    const targetDir = path.join(PUBLIC_DIR, "slides", targetCode, lab ? "lab" : "", lectureEntry.name);
    fs.mkdirSync(targetDir, { recursive: true });
    const files = fs.readdirSync(lectureDir).filter((name) => /\.(png|jpg|jpeg|webp)$/i.test(name));
    for (const file of files) {
      const match = file.match(/S(\d+)\.[a-z]+$/i);
      const targetName = match ? `slide_${Number(match[1])}${path.extname(file)}` : file;
      fs.copyFileSync(path.join(lectureDir, file), path.join(targetDir, targetName));
      count += 1;
    }
  }
  return count;
}

function buildSubject(def) {
  const data = loadSubjectData(def);
  console.log(`[Debug] ${def.code} models=${data.models?.length} lectures=${data.meta?.lectures?.length} arKeys=${Object.keys(data.ar || {}).length}`);
  const warnings = [];
  const { questions, models } = buildQuestions(def, data, warnings);
  const { slides, lectures } = buildSlides(def, data);
  const tables = buildTables(data.tables);
  const summary = buildSummary(data.summary);
  const glossary = buildGlossary(def, data);
  const definitions = buildDefinitions(data);
  const patterns = buildPatterns(data);
  const emergency = buildEmergency(data.emergency, patterns, def);
  const lab = buildLab(def);

  const bundle = {
    meta: {
      code: def.code,
      name_ar: def.name_ar,
      name_en: def.name_en,
      term: def.term,
      professor_name: def.professor_name,
      accent_color: def.accent_color,
      icon_name: def.icon_name,
      is_active: true,
      lectures_count: lectures.length,
      questions_count: questions.length,
      tables_count: tables.length,
      bundle_version: BUNDLE_VERSION,
      has_lab: Boolean(lab),
      lab_url: def.lab_url,
      lab_title: def.lab_title,
      data_status: questions.length > 0 && slides.length > 0 ? "full" : "theory-only"
    },
    lectures,
    slides,
    emergency,
    tables,
    summary,
    glossary,
    definitions,
    patterns,
    lab,
    question_models: models,
    questions
  };

  const outDir = path.join(PUBLIC_DIR, "data", def.code);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "bundle.json"), JSON.stringify(bundle), "utf-8");

  const imageCount = copySlides(path.join(ROOT, def.dir, "slides"), def.code);
  if (def.has_lab) copySlides(path.join(ROOT, "Sec_Viewer", "slides_labs"), def.code, true);

  console.log(
    `[Build] ${def.code.toUpperCase()}: ${lectures.length} lectures, ${slides.length} slides (${imageCount} images), ` +
      `${questions.length} questions, ${tables.length} tables, summary=${Boolean(summary)}, emergency=${Boolean(emergency)}, ` +
      `glossary=${Boolean(glossary)}, definitions=${Boolean(definitions)}, patterns=${Boolean(patterns)}, lab=${Boolean(lab)}`
  );
  if (warnings.length) {
    console.log(`[Build] ${def.code}: ${warnings.length} skipped questions`);
    if (warnings.length <= 5) warnings.forEach((warning) => console.log(`  - ${warning}`));
  }
  return bundle.meta;
}

const subjectMetas = Object.values(SUBJECTS).map(buildSubject);

const subjectsPath = path.join(PUBLIC_DIR, "data", "subjects.json");
fs.writeFileSync(subjectsPath, JSON.stringify(subjectMetas, null, 2), "utf-8");
console.log(`[Build] subjects.json updated with ${subjectMetas.length} subjects. Bundle version ${BUNDLE_VERSION}.`);





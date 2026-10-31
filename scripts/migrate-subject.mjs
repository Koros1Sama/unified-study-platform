// ==============================================================================
// المنصة التعليمية الموحدة — سكربت الترحيل الآلي للمقررات
// Automated Subject Migration Script (TOC & RM)
// Zero Emojis Standard · High Fidelity Data Extraction & Conversion
// ==============================================================================

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const PLATFORM_DIR = path.resolve(__dirname, "..");

console.log("[Migration] Starting migration of TOC and RM subjects...");

function runScriptInContext(filePath, context) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[Migration] File not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  vm.runInContext(content, context);
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function cleanRawText(text) {
  if (!text) return "";
  return String(text).replace(/[\u25AA\u2022]/g, "").trim();
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

// ------------------------------------------------------------------------------
// 1. ترحيل مادة نظرية الحوسبة (TOC)
// ------------------------------------------------------------------------------
function migrateTOC() {
  console.log("[Migration] Migrating TOC (Theory of Computation)...");
  const tocDir = path.join(ROOT, "TOC_Slides_Viewer/data");

  const context = {
    window: {},
    console
  };
  vm.createContext(context);

  // تحميل البيانات
  runScriptInContext(path.join(tocDir, "meta.js"), context);
  runScriptInContext(path.join(tocDir, "emergency.js"), context);
  runScriptInContext(path.join(tocDir, "tables.js"), context);
  runScriptInContext(path.join(tocDir, "summary.js"), context);
  runScriptInContext(path.join(tocDir, "models_m1.js"), context);
  runScriptInContext(path.join(tocDir, "models_m23.js"), context);
  runScriptInContext(path.join(tocDir, "models_m4.js"), context);
  runScriptInContext(path.join(tocDir, "models_m5.js"), context);

  const rawMeta = context.window.TOC_META || { lectures: [] };
  const rawEmergency = context.window.TOC_EMERGENCY;
  const rawTables = context.window.TOC_TABLES || [];
  const rawSummary = context.window.TOC_SUMMARY;
  const rawModels = context.window.TOC_MODELS || [];

  // تحويل المحاضرات والسلايدات
  const lectures = [];
  const slides = [];

  rawMeta.lectures.forEach((lec, idx) => {
    lectures.push({
      id: lec.id,
      subject_code: "toc",
      title_ar: lec.ar || `المحاضرة ${idx + 1}`,
      title_en: lec.en || lec.id,
      sort_order: idx + 1,
      slides_count: lec.count || (lec.slides ? lec.slides.length : 0)
    });

    if (lec.slides) {
      lec.slides.forEach((s) => {
        const slideNum = s.n;
        const ref = `${lec.id}-S${String(slideNum).padStart(3, "0")}`;
        slides.push({
          subject_code: "toc",
          lecture_id: lec.id,
          slide_num: slideNum,
          ref,
          title: cleanRawText(s.t) || ref,
          image_url: `/slides/toc/${lec.id}/slide_${slideNum}.png`,
          content_ar: cleanRawText(s.ar) || "",
          content_en: cleanRawText(s.t) || "",
          notes_ar: cleanRawText(s.notes) || ""
        });
      });
    }
  });

  // تحويل النماذج والأسئلة وتوليد المعرفات الكانونية وتفنيد المشتتات المزدوج (Two-Pass Accurate Duplicate Detection)
  const question_models = [];
  const questions = [];
  const rawQList = [];
  const textFreq = new Map();

  rawModels.forEach((mod, mIdx) => {
    const modelId = mod.id || `m${mIdx + 1}`;
    question_models.push({
      id: modelId,
      title_ar: mod.title_ar || `نموذج ${modelId}`,
      kind: mod.kind || "رسمي",
      origin_ar: mod.origin_ar || "",
      origin_url: mod.origin_url || "",
      questions_count: mod.questions ? mod.questions.length : 0
    });

    if (mod.questions) {
      mod.questions.forEach((q, qIdx) => {
        const origNum = q.n || qIdx + 1;
        const canonicalId = `toc:${modelId}:${origNum}`;

        let options_en = [];
        let options_ar = [];
        let correct_answer = 0;
        let why_correct = "";
        const distractor_analysis = {};

        if (q.opts) {
          options_en = q.opts.map((o) => o.en || o.ar || "");
          options_ar = q.opts.map((o) => cleanArabicOnly(o.ar || o.en || ""));
          const correctIdx = q.opts.findIndex((o) => o.ok);
          correct_answer = correctIdx >= 0 ? correctIdx : 0;
          why_correct = q.opts[correct_answer]?.why || q.why || "الخيار الصائب وفق القواعد الرياضية المعتمدة.";

          q.opts.forEach((o, oIdx) => {
            if (oIdx !== correct_answer) {
              distractor_analysis[String(oIdx)] = {
                why_wrong: o.why || "هذا الخيار لا يطابق الشروط المحددة في المسألة.",
                when_correct: "في المسائل المعاكسة التي تطلب الحالة البديلة أو النموذج المقابل."
              };
            }
          });
        } else if (q.options) {
          options_en = q.options;
          options_ar = (q.options_ar || q.options).map((o) => cleanArabicOnly(o));
          correct_answer = typeof q.answer === "number" ? q.answer : 0;
          why_correct = q.why || "الإجابة الصحيحة المعتمدة.";
        }

        const normQ = normalizeText(q.q_en || q.q);
        if (normQ.length > 15) {
          textFreq.set(normQ, (textFreq.get(normQ) || 0) + 1);
        }

        rawQList.push({
          canonicalId,
          modelId,
          origNum,
          q,
          mod,
          normQ,
          options_en,
          options_ar,
          correct_answer,
          why_correct,
          distractor_analysis
        });
      });
    }
  });

  // Pass 2: إسناد معرفات التوائم فقط للأسئلة المكررة فعلياً (تكرار > 1)
  const twinGroupMap = new Map();
  let nextTwinId = 1;

  rawQList.forEach((item) => {
    let twin_group_id = undefined;
    if (item.normQ.length > 15 && textFreq.get(item.normQ) > 1) {
      if (!twinGroupMap.has(item.normQ)) {
        twinGroupMap.set(item.normQ, `twin_toc_${nextTwinId++}`);
      }
      twin_group_id = twinGroupMap.get(item.normQ);
    }

    questions.push({
      id: item.canonicalId,
      subject_code: "toc",
      model_id: item.modelId,
      orig_q_num: item.origNum,
      type: item.q.type || "mcq",
      lecture_id: item.q.ref ? item.q.ref.split("-")[0] : undefined,
      slide_ref: item.q.ref || undefined,
      question_en: item.q.q_en || item.q.q || "",
      question_ar: cleanArabicOnly(item.q.q_ar || ""),
      options_en: item.options_en,
      options_ar: item.options_ar,
      correct_answer: item.correct_answer,
      why_correct: item.why_correct,
      distractor_analysis: item.distractor_analysis,
      exam_tip: item.q.tip || undefined,
      is_ai_predicted: Boolean(item.q.is_ai_predicted || item.mod.kind?.includes("AI")),
      twin_group_id
    });
  });

  // تحويل الجداول
  const tables = rawTables.map((t) => ({
    id: t.id,
    lec: t.lec,
    title: t.title,
    title_ar: t.title_ar || t.title,
    desc: t.desc || t.note_ar || "",
    note_ar: t.note_ar || "",
    refs: t.refs || [],
    cols: t.cols || [],
    rows: t.rows || [],
    imps: t.imps || t.rows.map(() => 4)
  }));

  // تحويل الملخص
  let summary = undefined;
  if (rawSummary && rawSummary.parts) {
    summary = {
      title_ar: rawSummary.title_ar,
      sub_ar: rawSummary.scope_ar,
      parts: rawSummary.parts.map((p) => ({
        lec: p.lec,
        title: p.title_ar || p.lec,
        interactive: p.interactive || undefined,
        blocks: (p.blocks || []).map((b) => ({
          head: b.title,
          body: b.body || "",
          refs: b.refs || [],
          callout: b.callout || undefined,
          interactive: b.interactive || undefined
        }))
      }))
    };
  }

  // تحويل ملخص الملخص
  const emergency = rawEmergency;

  const bundle = {
    meta: {
      code: "toc",
      name_ar: "نظرية الحوسبة",
      name_en: "Theory of Computation",
      term: 1,
      professor_name: "د. رويدا العامري",
      accent_color: "#f5b13d",
      icon_name: "cpu",
      is_active: true,
      lectures_count: lectures.length,
      questions_count: questions.length,
      tables_count: tables.length
    },
    lectures,
    slides,
    emergency,
    tables,
    summary,
    question_models,
    questions
  };

  const outDir = path.join(PLATFORM_DIR, "public/data/toc");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "bundle.json"), JSON.stringify(bundle, null, 2), "utf-8");
  console.log(`[Migration] TOC migrated successfully: ${lectures.length} lectures, ${slides.length} slides, ${questions.length} questions, ${tables.length} tables.`);
  return bundle.meta;
}

// ------------------------------------------------------------------------------
// 2. ترحيل مادة منهجية البحث العلمي (RM)
// ------------------------------------------------------------------------------
function migrateRM() {
  console.log("[Migration] Migrating RM (Research Methodology)...");
  const rmDir = path.join(ROOT, "RM_Viewer/data");

  const context = {
    window: {},
    console
  };
  vm.createContext(context);

  runScriptInContext(path.join(rmDir, "meta.js"), context);
  runScriptInContext(path.join(rmDir, "emergency.js"), context);
  runScriptInContext(path.join(rmDir, "tables.js"), context);
  runScriptInContext(path.join(rmDir, "summary.js"), context);
  runScriptInContext(path.join(rmDir, "bank_official.js"), context);
  runScriptInContext(path.join(rmDir, "bank_tests.js"), context);

  const rawTables = context.window.TOC_TABLES || [];
  const rawEmergency = context.window.TOC_EMERGENCY;
  const rawSummary = context.window.TOC_SUMMARY;
  const rawModels = context.window.TOC_MODELS || [];

  // محاضرات RM
  const lectures = [
    { id: "L1", subject_code: "rm", title_ar: "مدخل إلى البحث العلمي ومفهومه", title_en: "Introduction to Scientific Research", sort_order: 1, slides_count: 35 },
    { id: "L2", subject_code: "rm", title_ar: "صياغة مشكلة البحث والفرضيات", title_en: "Research Problem & Hypotheses", sort_order: 2, slides_count: 40 },
    { id: "L3", subject_code: "rm", title_ar: "مراجعة الأدبيات والدراسات السابقة", title_en: "Literature Review", sort_order: 3, slides_count: 30 },
    { id: "L4", subject_code: "rm", title_ar: "تصاميم ومناهج البحث العلمي", title_en: "Research Design & Methodologies", sort_order: 4, slides_count: 45 },
    { id: "L5", subject_code: "rm", title_ar: "طرق جمع البيانات والعينات الإحصائية", title_en: "Data Collection & Sampling", sort_order: 5, slides_count: 38 },
    { id: "L6", subject_code: "rm", title_ar: "كتابة التقرير النهائي والأخلاقيات", title_en: "Research Writing & Ethics", sort_order: 6, slides_count: 28 }
  ];

  const slides = [];
  lectures.forEach((lec) => {
    for (let i = 1; i <= lec.slides_count; i++) {
      const ref = `${lec.id}-S${String(i).padStart(3, "0")}`;
      slides.push({
        subject_code: "rm",
        lecture_id: lec.id,
        slide_num: i,
        ref,
        title: `شريحة ${ref}`,
        image_url: `/slides/rm/${lec.id}/slide_${i}.png`,
        content_ar: `محتوى ومفاهيم ${ref} في ${lec.title_ar}`,
        content_en: `Slide ${ref} concepts and definitions`
      });
    }
  });

  // خارطة التوائم المتطابقة في بنك د. مالك الرسمي (B1_TWINS)
  const B1_TWINS = {
    106: 114, 114: 106,
    2: 142, 142: 2,
    4: 143, 143: 4,
    8: 145, 145: 8,
    39: 141, 141: 39,
    42: 144, 144: 42,
    45: 80, 80: 45,
    47: 81, 81: 47,
    95: 96, 96: 95,
    98: 140, 140: 98
  };

  const question_models = [];
  const questions = [];
  const rawQList = [];
  const textFreq = new Map();

  rawModels.forEach((mod, mIdx) => {
    const modelId = mod.id || `m${mIdx + 1}`;
    question_models.push({
      id: modelId,
      title_ar: mod.title_ar || mod.short_label || `نموذج ${modelId}`,
      kind: mod.kind || "رسمي",
      origin_ar: mod.origin_ar || "",
      origin_url: mod.source_pdf || "",
      questions_count: mod.questions ? mod.questions.length : 0
    });

    if (mod.questions) {
      mod.questions.forEach((q, qIdx) => {
        const origNum = q.n || qIdx + 1;
        const canonicalId = `rm:${modelId}:${origNum}`;

        const options_en = q.options || [];
        const options_ar = (q.options_ar || q.options || []).map((o) => cleanArabicOnly(o));
        const correct_answer = typeof q.answer === "number" ? q.answer : 0;
        const why_correct = q.why || "الخيار الصائب وفق الأسس المنهجية المعتمدة للبحث العلمي.";

        const distractor_analysis = {};
        options_en.forEach((_, oIdx) => {
          if (oIdx !== correct_answer) {
            distractor_analysis[String(oIdx)] = {
              why_wrong: "هذا الإجراء أو التعريف لا يمثل المعيار الأمثل في السياق البحثي المحدد.",
              when_correct: "في الحالات الدراسية التي تتطلب منهجية استكشافية أو أدوات قياس نوعية بديلة."
            };
          }
        });

        const normQ = normalizeText(q.q || q.q_en);
        if (normQ.length > 15) {
          textFreq.set(normQ, (textFreq.get(normQ) || 0) + 1);
        }

        rawQList.push({
          canonicalId,
          modelId,
          origNum,
          q,
          normQ,
          options_en,
          options_ar,
          correct_answer,
          why_correct,
          distractor_analysis
        });
      });
    }
  });

  // Pass 2: إسناد معرفات التوائم للأسئلة المكررة حقيقة
  const twinGroupMap = new Map();
  let nextTwinId = 1;

  rawQList.forEach((item) => {
    let twin_group_id = undefined;

    // 1. فحص B1_TWINS
    if (item.modelId === "b1" && B1_TWINS[item.origNum]) {
      const canonicalTwinNum = Math.min(item.origNum, B1_TWINS[item.origNum]);
      twin_group_id = `twin_rm_b1_${canonicalTwinNum}`;
    } else if (item.normQ.length > 15 && textFreq.get(item.normQ) > 1) {
      if (!twinGroupMap.has(item.normQ)) {
        twinGroupMap.set(item.normQ, `twin_rm_txt_${nextTwinId++}`);
      }
      twin_group_id = twinGroupMap.get(item.normQ);
    }

    questions.push({
      id: item.canonicalId,
      subject_code: "rm",
      model_id: item.modelId,
      orig_q_num: item.origNum,
      type: item.q.type || "mcq",
      lecture_id: undefined,
      slide_ref: item.q.ref || undefined,
      question_en: item.q.q || item.q.q_en || "",
      question_ar: cleanArabicOnly(item.q.q_ar || ""),
      options_en: item.options_en,
      options_ar: item.options_ar,
      correct_answer: item.correct_answer,
      why_correct: item.why_correct,
      distractor_analysis: item.distractor_analysis,
      exam_tip: item.q.tip || "احرص على مطابقة نوع المشكلة البحثية مع الأداة المناسبة لحسم الجواب فوراً.",
      is_ai_predicted: false,
      twin_group_id
    });
  });

  const tables = rawTables.map((t) => ({
    id: t.id,
    lec: t.lec || "L1",
    title: t.title || "جدول مقارنة مناهج البحث",
    title_ar: t.title_ar || t.title || "جدول مقارنة مناهج البحث",
    desc: t.desc || "",
    note_ar: t.note_ar || "",
    refs: t.refs || [],
    cols: t.cols || [
      { key: "col1", label: "المعيار" },
      { key: "col2", label: "التوصيف" }
    ],
    rows: t.rows || [],
    imps: t.imps || t.rows.map(() => 4)
  }));

  const bundle = {
    meta: {
      code: "rm",
      name_ar: "منهجية البحث العلمي",
      name_en: "Research Methodology",
      term: 1,
      professor_name: "أ.د. مالك الجبري",
      accent_color: "#38bdf8",
      icon_name: "compass",
      is_active: true,
      lectures_count: lectures.length,
      questions_count: questions.length,
      tables_count: tables.length
    },
    lectures,
    slides,
    emergency: rawEmergency || undefined,
    tables,
    summary: rawSummary || undefined,
    question_models,
    questions
  };

  const outDir = path.join(PLATFORM_DIR, "public/data/rm");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "bundle.json"), JSON.stringify(bundle, null, 2), "utf-8");
  console.log(`[Migration] RM migrated successfully: ${lectures.length} lectures, ${slides.length} slides, ${questions.length} questions, ${tables.length} tables.`);
  return bundle.meta;
}

// تشغيل الترحيل وتحديث قائمة المواد العامة
const tocMeta = migrateTOC();
const rmMeta = migrateRM();

const subjectsList = [
  tocMeta,
  rmMeta,
  {
    code: "sec",
    name_ar: "أمن المعلومات والشبكات",
    name_en: "Information Security",
    term: 1,
    professor_name: "د. عبدالملك المأخذي",
    accent_color: "#fb7185",
    icon_name: "shield",
    is_active: true
  },
  {
    code: "se",
    name_ar: "هندسة البرمجيات",
    name_en: "Software Engineering",
    term: 1,
    professor_name: "د. عمار الجوفي",
    accent_color: "#34d399",
    icon_name: "layers",
    is_active: true
  },
  {
    code: "ap",
    name_ar: "البرمجة المتقدمة",
    name_en: "Advanced Programming",
    term: 1,
    professor_name: "د. مراد العريقي",
    accent_color: "#a78bfa",
    icon_name: "code",
    is_active: true
  },
  {
    code: "ai",
    name_ar: "الذكاء الاصطناعي",
    name_en: "Artificial Intelligence",
    term: 1,
    professor_name: "د. مأمون الشرجبي",
    accent_color: "#f43f5e",
    icon_name: "bot",
    is_active: true
  },
  {
    code: "hci",
    name_ar: "تفاعل الإنسان والحاسوب",
    name_en: "Human-Computer Interaction",
    term: 1,
    professor_name: "د. مروة المخلافي",
    accent_color: "#22d3ee",
    icon_name: "users",
    is_active: true
  }
];

const dataDir = path.join(PLATFORM_DIR, "public/data");
fs.writeFileSync(path.join(dataDir, "subjects.json"), JSON.stringify(subjectsList, null, 2), "utf-8");
console.log("[Migration] Saved public/data/subjects.json with all subjects.");
console.log("[Migration] All migrations completed successfully!");

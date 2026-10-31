// ==============================================================================
// المنصة التعليمية الموحدة — محول البيانات ثنائي المصدر (Dual-Source Adapter)
// Supabase Delta Sync + Dexie IndexedDB + Offline JSON Fallback
// ==============================================================================

import { db } from "./db";
import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  SubjectMeta,
  Lecture,
  SlideItem,
  ExplanatoryTable,
  SummaryOfSummaryData,
  TheoreticalSummaryData,
  QuestionModelInfo,
  UnifiedQuestion,
  UserStudyProgress,
  DefinitionBank,
  GlossaryData,
  QuestionPatternsData,
  LabAppendix
} from "../types";

const SYNC_KEY_PREFIX = "unified_sync_";
const BUNDLE_VERSION_KEY = "unified_bundle_version_";
let subjectsCache: SubjectMeta[] = [];

const BASE_URL = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "") + "/";

export function resolveAssetUrl(url?: string): string {
  if (!url) return "";
  if (/^(https?:|\/\/|data:|blob:)/i.test(url)) return url;
  const cleanPath = url.replace(/^\/+/, "");
  return `${BASE_URL}${cleanPath}`;
}

function resolveDataPath(path: string): string {
  return resolveAssetUrl(path);
}

export interface SubjectBundle {
  meta: SubjectMeta;
  lectures: Lecture[];
  slides: SlideItem[];
  emergency?: SummaryOfSummaryData;
  tables?: ExplanatoryTable[];
  summary?: TheoreticalSummaryData;
  definitions?: DefinitionBank;
  glossary?: GlossaryData;
  patterns?: QuestionPatternsData;
  lab?: LabAppendix;
  question_models: QuestionModelInfo[];
  questions: UnifiedQuestion[];
}

export const DataService = {
  /**
   * جلب قائمة المواد المتاحة مع الكاش المحلي
   */
  async getSubjects(): Promise<SubjectMeta[]> {
    try {
      const res = await fetch(resolveDataPath("data/subjects.json"), { cache: "no-cache" });
      if (res.ok) {
        const subjects: SubjectMeta[] = await res.json();
        subjectsCache = subjects;
        await db.subjects.bulkPut(subjects);
        return subjects;
      }
    } catch (err) {
      console.warn("Could not fetch subjects.json, using cached manifest", err);
    }

    const cached = await db.subjects.toArray();
    if (cached && cached.length > 0) {
      subjectsCache = cached;
      return cached;
    }

    // القائمة الافتراضية المضمنة في حال عدم وجود ملف خارجي بعد
    const defaultSubjects: SubjectMeta[] = [
      {
        code: "toc",
        name_ar: "نظرية الحوسبة",
        name_en: "Theory of Computation",
        term: 1,
        professor_name: "د. رويدا العامري",
        accent_color: "#f5b13d",
        icon_name: "cpu",
        is_active: true
      },
      {
        code: "rm",
        name_ar: "منهجية البحث العلمي",
        name_en: "Research Methodology",
        term: 1,
        professor_name: "أ.د. مالك الجبري",
        accent_color: "#38bdf8",
        icon_name: "compass",
        is_active: true
      },
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

    await db.subjects.bulkPut(defaultSubjects);
    return defaultSubjects;
  },

  /**
   * جلب حزمة بيانات المادة كاملة (IndexedDB -> JSON fallback -> Supabase delta)
   */
  async loadSubjectBundle(code: string): Promise<SubjectBundle> {
    // 1. التحقق من وجود البيانات في IndexedDB
    const cachedLectures = await db.lectures.where("subject_code").equals(code).sortBy("sort_order");
    const cachedQuestions = await db.questions.where("subject_code").equals(code).toArray();
    const cachedModels = await db.question_models.where("subject_code").equals(code).toArray();
    const cachedModules = await db.study_modules.where("subject_code").equals(code).toArray();

    let emergencyData: SummaryOfSummaryData | undefined;
    let tablesData: ExplanatoryTable[] | undefined;
    let summaryData: TheoreticalSummaryData | undefined;
    let definitionsData: DefinitionBank | undefined;
    let glossaryData: GlossaryData | undefined;
    let patternsData: QuestionPatternsData | undefined;
    let labData: LabAppendix | undefined;

    cachedModules.forEach((m) => {
      if (m.module_type === "emergency_cram") emergencyData = m.payload as SummaryOfSummaryData;
      if (m.module_type === "explanatory_tables") tablesData = m.payload as ExplanatoryTable[];
      if (m.module_type === "summary") summaryData = m.payload as TheoreticalSummaryData;
      if (m.module_type === "definitions") definitionsData = m.payload as DefinitionBank;
      if (m.module_type === "glossary") glossaryData = m.payload as GlossaryData;
      if (m.module_type === "patterns") patternsData = m.payload as QuestionPatternsData;
      if (m.module_type === "lab") labData = m.payload as LabAppendix;
    });

    if (subjectsCache.length === 0) {
      await this.getSubjects();
    }
    const expectedVersion =
      subjectsCache.find((s) => s.code === code)?.bundle_version || 3;
    const cachedVersion = Number(localStorage.getItem(`${BUNDLE_VERSION_KEY}${code}`) || 0);
    const hasCachedContent = cachedLectures.length > 0 || cachedQuestions.length > 0;

    // إذا كانت البيانات محفوظة بنفس إصدار الحزمة، نعيدها فوراً ونجري فحص المزامنة في الخلفية
    if (hasCachedContent && cachedVersion === expectedVersion) {
      const subject = (await db.subjects.get(code)) || {
        code,
        name_ar: code.toUpperCase(),
        name_en: code.toUpperCase(),
        term: 1,
        professor_name: "",
        accent_color: "#f5b13d"
      };

      const cachedSlides = await db.slides.where("subject_code").equals(code).toArray();

      // مزامنة خلفية للفرق من سوبابيس إن وجد
      this.syncDeltaFromSupabase(code).catch((e) => console.debug("Delta sync skipped:", e));

      return {
        meta: subject,
        lectures: cachedLectures,
        slides: cachedSlides,
        emergency: emergencyData,
        tables: tablesData,
        summary: summaryData,
        definitions: definitionsData,
        glossary: glossaryData,
        patterns: patternsData,
        lab: labData,
        question_models: cachedModels,
        questions: cachedQuestions
      };
    }

    // 2. جلب أحدث حزمة من ملف JSON المحلي (ثم حفظها في الكاش)
    try {
      const res = await fetch(resolveDataPath(`data/${code}/bundle.json`), { cache: "no-cache" });
      if (res.ok) {
        const bundle: SubjectBundle = await res.json();
        await this.persistBundleToIndexedDB(bundle);
        localStorage.setItem(
          `${BUNDLE_VERSION_KEY}${code}`,
          String(bundle.meta?.bundle_version || expectedVersion)
        );
        return bundle;
      }
    } catch (err) {
      console.warn(`Could not load /data/${code}/bundle.json:`, err);
    }

    // 3. في حال تعذر الشبكة، نستخدم الكاش القديم إن وجد
    if (hasCachedContent) {
      const cachedSlides = await db.slides.where("subject_code").equals(code).toArray();
      const subject = (await db.subjects.get(code)) || {
        code,
        name_ar: code.toUpperCase(),
        name_en: code.toUpperCase(),
        term: 1,
        professor_name: "",
        accent_color: "#f5b13d"
      };
      return {
        meta: subject,
        lectures: cachedLectures,
        slides: cachedSlides,
        emergency: emergencyData,
        tables: tablesData,
        summary: summaryData,
        definitions: definitionsData,
        glossary: glossaryData,
        patterns: patternsData,
        lab: labData,
        question_models: cachedModels,
        questions: cachedQuestions
      };
    }

    // في حال تعذر الجلب الكامل، نرجع هيكلاً فارغاً صالحاً
    const subjects = await this.getSubjects();
    const meta = subjects.find((s) => s.code === code) || {
      code,
      name_ar: code.toUpperCase(),
      name_en: code.toUpperCase(),
      term: 1,
      professor_name: "",
      accent_color: "#f5b13d"
    };

    return {
      meta,
      lectures: [],
      slides: [],
      emergency: undefined,
      tables: [],
      summary: undefined,
      question_models: [],
      questions: []
    };
  },

  /**
   * حفظ الحزمة المسترجعة محلياً في IndexedDB للتحميل اللحظي
   */
  async persistBundleToIndexedDB(bundle: SubjectBundle): Promise<void> {
    const {
      meta,
      lectures,
      slides,
      emergency,
      tables,
      summary,
      definitions,
      glossary,
      patterns,
      lab,
      question_models,
      questions
    } = bundle;

    await db.transaction(
      "rw",
      [
        db.subjects,
        db.lectures,
        db.slides,
        db.study_modules,
        db.question_models,
        db.questions
      ],
      async () => {
        if (meta) await db.subjects.put(meta);
        if (lectures && lectures.length > 0) await db.lectures.bulkPut(lectures);
        if (slides && slides.length > 0) await db.slides.bulkPut(slides);
        if (question_models && question_models.length > 0) {
          const modelsWithCode = question_models.map((m) => ({ ...m, subject_code: meta.code }));
          await db.question_models.bulkPut(modelsWithCode);
        }
        if (questions && questions.length > 0) await db.questions.bulkPut(questions);

        const now = new Date().toISOString();
        if (emergency) {
          await db.study_modules.put({
            id: `${meta.code}_emergency_cram`,
            subject_code: meta.code,
            module_type: "emergency_cram",
            payload: emergency,
            version: 1,
            updated_at: now
          });
        }
        if (tables) {
          await db.study_modules.put({
            id: `${meta.code}_explanatory_tables`,
            subject_code: meta.code,
            module_type: "explanatory_tables",
            payload: tables,
            version: 1,
            updated_at: now
          });
        }
        if (summary) {
          await db.study_modules.put({
            id: `${meta.code}_summary`,
            subject_code: meta.code,
            module_type: "summary",
            payload: summary,
            version: 1,
            updated_at: now
          });
        }
        if (definitions) {
          await db.study_modules.put({
            id: `${meta.code}_definitions`,
            subject_code: meta.code,
            module_type: "definitions",
            payload: definitions,
            version: 1,
            updated_at: now
          });
        }
        if (glossary) {
          await db.study_modules.put({
            id: `${meta.code}_glossary`,
            subject_code: meta.code,
            module_type: "glossary",
            payload: glossary,
            version: 1,
            updated_at: now
          });
        }
        if (patterns) {
          await db.study_modules.put({
            id: `${meta.code}_patterns`,
            subject_code: meta.code,
            module_type: "patterns",
            payload: patterns,
            version: 1,
            updated_at: now
          });
        }
        if (lab) {
          await db.study_modules.put({
            id: `${meta.code}_lab`,
            subject_code: meta.code,
            module_type: "lab",
            payload: lab,
            version: 1,
            updated_at: now
          });
        }
      }
    );
  },

  /**
   * المزامنة الذكية للفرق فقط مع Supabase (updated_at > last_sync)
   */
  async syncDeltaFromSupabase(subjectCode: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const syncKey = `${SYNC_KEY_PREFIX}${subjectCode}`;
      const lastSync = localStorage.getItem(syncKey) || "1970-01-01T00:00:00Z";

      // فحص الأسئلة المحدثة بعد آخر مزامنة
      const { data: updatedQuestions, error } = await supabase
        .from("questions")
        .select("*")
        .eq("subject_code", subjectCode)
        .gt("updated_at", lastSync);

      if (error) throw error;

      if (updatedQuestions && updatedQuestions.length > 0) {
        await db.questions.bulkPut(updatedQuestions);
        console.info(`[Sync] Synced ${updatedQuestions.length} updated questions for ${subjectCode}`);
      }

      localStorage.setItem(syncKey, new Date().toISOString());
    } catch (err) {
      console.warn(`[Sync] Supabase sync skipped or failed for ${subjectCode}:`, err);
    }
  },

  /**
   * جلب تقدم ومحفوظات الطالب
   */
  async getUserProgress(subjectCode: string): Promise<UserStudyProgress> {
    const saved = await db.user_study_progress.get(subjectCode);
    if (saved) return saved;

    const initial: UserStudyProgress = {
      subject_code: subjectCode,
      memorized_tables: [],
      answered_questions: {},
      exam_history: [],
      updated_at: new Date().toISOString()
    };
    await db.user_study_progress.put(initial);
    return initial;
  },

  /**
   * حفظ إجابة سؤال مع المزامنة التوأمية الثنائية اللحظية (Twin Sync)
   */
  async saveAnswer(
    subjectCode: string,
    questionId: string,
    selectedAnswer: number,
    isCorrect: boolean,
    twinGroupId?: string
  ): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    const now = new Date().toISOString();

    const record = {
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      answered_at: now
    };

    progress.answered_questions[questionId] = record;

    // المزامنة التوأمية: إذا كان السؤال جزءاً من توأم، نعكس الإجابة على جميع توائمه في المادة
    if (twinGroupId) {
      const twins = await db.questions.where("twin_group_id").equals(twinGroupId).toArray();
      for (const t of twins) {
        progress.answered_questions[t.id] = record;
      }
    }

    progress.updated_at = now;
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * حفظ أو إلغاء حفظ جدول في المفضلة
   */
  async toggleMemorizedTable(subjectCode: string, tableId: string): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    const idx = progress.memorized_tables.indexOf(tableId);
    if (idx >= 0) {
      progress.memorized_tables.splice(idx, 1);
    } else {
      progress.memorized_tables.push(tableId);
    }
    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * حفظ أو إلغاء إتقان تعريف مصطلح (Definitions Bank)
   */
  async toggleMasteredDefinition(subjectCode: string, definitionId: string): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    const list = progress.mastered_definitions || [];
    const idx = list.indexOf(definitionId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(definitionId);
    progress.mastered_definitions = list;
    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * حفظ أو إلغاء مراجعة قسم من ملخص الملخص
   */
  async toggleReviewedSection(subjectCode: string, sectionId: string): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    const list = progress.reviewed_sections || [];
    const idx = list.indexOf(sectionId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(sectionId);
    progress.reviewed_sections = list;
    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * حفظ أو إلغاء مراجعة جزء من الملخص النظري
   */
  async toggleReviewedPart(subjectCode: string, partId: string): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    const list = progress.reviewed_parts || [];
    const idx = list.indexOf(partId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(partId);
    progress.reviewed_parts = list;
    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * حفظ أو إلغاء تعليم سؤال للمراجعة السريعة
   */
  async toggleFlaggedQuestion(subjectCode: string, questionId: string): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    const list = progress.flagged_questions || [];
    const idx = list.indexOf(questionId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(questionId);
    progress.flagged_questions = list;
    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * تسجيل نتيجة امتحان جديد
   */
  async recordExamResult(
    subjectCode: string,
    result: { total: number; score: number; timeSpentSec: number; mode: string }
  ): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    progress.exam_history.unshift({
      date: new Date().toISOString(),
      ...result
    });
    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * إضافة أو إزالة علامة لونية لسؤال مع مزامنة التوائم
   */
  async toggleBookmark(
    subjectCode: string,
    questionId: string,
    color: string,
    twinGroupId?: string
  ): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    if (!progress.bookmarks) progress.bookmarks = {};

    const cur = progress.bookmarks[questionId] || [];
    const idx = cur.indexOf(color);
    let next: string[];
    if (idx >= 0) {
      next = cur.filter((c) => c !== color);
    } else {
      next = [...cur, color];
    }

    if (next.length === 0) {
      delete progress.bookmarks[questionId];
    } else {
      progress.bookmarks[questionId] = next;
    }

    // مزامنة التوأم
    if (twinGroupId) {
      const twins = await db.questions.where("twin_group_id").equals(twinGroupId).toArray();
      for (const t of twins) {
        if (next.length === 0) {
          delete progress.bookmarks[t.id];
        } else {
          progress.bookmarks[t.id] = [...next];
        }
      }
    }

    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * إلغاء اختيار إجابات نموذج محدد أو البنك بالكامل
   */
  async resetModelAnswers(subjectCode: string, modelId: string): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    if (modelId === "all") {
      progress.answered_questions = {};
    } else {
      const qs = await db.questions.where("model_id").equals(modelId).toArray();
      for (const q of qs) {
        delete progress.answered_questions[q.id];
      }
    }
    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  /**
   * تصفير كامل المحفوظات والتقدم لمقرر معين
   */
  async resetSubjectProgress(subjectCode: string): Promise<UserStudyProgress> {
    const fresh: UserStudyProgress = {
      subject_code: subjectCode,
      memorized_tables: [],
      answered_questions: {},
      bookmarks: {},
      exam_history: [],
      reviewed_sections: [],
      reviewed_parts: [],
      reviewed_capsules: [],
      mastered_definitions: [],
      flagged_questions: [],
      updated_at: new Date().toISOString()
    };
    await db.user_study_progress.put(fresh);
    return fresh;
  }
};

// ==============================================================================
// المنصة التعليمية الموحدة — محول البيانات ثنائي المصدر (Dual-Source Adapter)
// Dexie IndexedDB + Offline JSON Bundles + Lazy Supabase Delta Sync + Backup I/O
// ==============================================================================

import { db } from "./db";
import { safeJsonParse } from "./textUtils";
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

export const APP_DATA_VERSION = 19;

const SYNC_KEY_PREFIX = "unified_sync_";
const BUNDLE_VERSION_KEY = "unified_bundle_version_";
const CUSTOM_SUBJECTS_KEY = "unified_custom_subjects";
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

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") || ct.includes("+json") || ct === "";
}

function normalizeOptText(text?: string): string {
  return String(text || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getCustomSubjects(): SubjectMeta[] {
  return safeJsonParse<SubjectMeta[]>(localStorage.getItem(CUSTOM_SUBJECTS_KEY), []);
}

function mergeWithCustomSubjects(base: SubjectMeta[]): SubjectMeta[] {
  const custom = getCustomSubjects();
  if (custom.length === 0) return base;
  const existingCodes = new Set(base.map((s) => s.code));
  const extra = custom.filter((s) => s?.code && !existingCodes.has(s.code));
  return [...extra, ...base];
}

const DEFAULT_SUBJECTS: SubjectMeta[] = [
  {
    code: "toc",
    name_ar: "نظرية الحوسبة",
    name_en: "Theory of Computation",
    term: 1,
    professor_name: "د. رويدا العامري",
    accent_color: "#f5b13d",
    icon_name: "cpu",
    is_active: true,
    page_layout: "slides"
  },
  {
    code: "rm",
    name_ar: "منهجية البحث العلمي",
    name_en: "Research Methodology",
    term: 1,
    professor_name: "أ.د. مالك الجبري",
    accent_color: "#38bdf8",
    icon_name: "compass",
    is_active: true,
    page_layout: "slides"
  },
  {
    code: "sec",
    name_ar: "أمن المعلومات والشبكات",
    name_en: "Information Security",
    term: 1,
    professor_name: "د. عبدالواسع العزاني",
    accent_color: "#fb7185",
    icon_name: "shield",
    is_active: true,
    page_layout: "slides"
  },
  {
    code: "se",
    name_ar: "هندسة البرمجيات",
    name_en: "Software Engineering",
    term: 1,
    professor_name: "د. عمار الجوفي",
    accent_color: "#34d399",
    icon_name: "layers",
    is_active: true,
    page_layout: "slides"
  },
  {
    code: "pm",
    name_ar: "إدارة المشاريع",
    name_en: "Project Management",
    term: 2,
    professor_name: "د. منصور نعمان",
    accent_color: "#eab308",
    icon_name: "award",
    is_active: true,
    page_layout: "slides"
  },
  {
    code: "phy",
    name_ar: "فيزياء (الحوسبة الكمية)",
    name_en: "Physics (Quantum Computing)",
    term: 2,
    professor_name: "د. محمد شكري",
    accent_color: "#22d3ee",
    icon_name: "cpu",
    is_active: true,
    page_layout: "book"
  }
];

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

export interface FullProgressBackup {
  backup_version: number;
  exported_at: string;
  subjects: Record<string, UserStudyProgress>;
}

type ProgressListField =
  | "memorized_tables"
  | "mastered_definitions"
  | "reviewed_sections"
  | "reviewed_parts"
  | "flagged_questions";

function extractModulesFromRecords(
  records: Array<{ module_type: string; payload: unknown }>
): Pick<
  SubjectBundle,
  "emergency" | "tables" | "summary" | "definitions" | "glossary" | "patterns" | "lab"
> {
  const out: Pick<
    SubjectBundle,
    "emergency" | "tables" | "summary" | "definitions" | "glossary" | "patterns" | "lab"
  > = {};
  for (const m of records) {
    if (m.module_type === "emergency_cram") out.emergency = m.payload as SummaryOfSummaryData;
    else if (m.module_type === "explanatory_tables") out.tables = m.payload as ExplanatoryTable[];
    else if (m.module_type === "summary") out.summary = m.payload as TheoreticalSummaryData;
    else if (m.module_type === "definitions") out.definitions = m.payload as DefinitionBank;
    else if (m.module_type === "glossary") out.glossary = m.payload as GlossaryData;
    else if (m.module_type === "patterns") out.patterns = m.payload as QuestionPatternsData;
    else if (m.module_type === "lab") out.lab = m.payload as LabAppendix;
  }
  return out;
}

function fallbackSubjectMeta(code: string): SubjectMeta {
  return (
    subjectsCache.find((s) => s.code === code) || {
      code,
      name_ar: code.toUpperCase(),
      name_en: code.toUpperCase(),
      term: 1,
      professor_name: "",
      accent_color: "#f5b13d"
    }
  );
}

async function toggleProgressListItem(
  subjectCode: string,
  field: ProgressListField,
  itemId: string
): Promise<UserStudyProgress> {
  const progress = await DataService.getUserProgress(subjectCode);
  const current = progress[field] ? [...progress[field]!] : [];
  const idx = current.indexOf(itemId);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(itemId);
  progress[field] = current;
  progress.updated_at = new Date().toISOString();
  await db.user_study_progress.put(progress);
  return progress;
}

export const DataService = {
  async getSubjects(): Promise<SubjectMeta[]> {
    try {
      const res = await fetch(resolveDataPath(`data/subjects.json?v=${APP_DATA_VERSION}`), {
        cache: "no-cache"
      });
      if (res.ok && isJsonResponse(res)) {
        const fetched: SubjectMeta[] = await res.json();
        const merged = mergeWithCustomSubjects(fetched);
        subjectsCache = merged;
        await db.subjects.bulkPut(merged);
        return merged;
      }
    } catch (err) {
      console.warn("Could not fetch subjects.json, using cached manifest", err);
    }

    const cached = await db.subjects.toArray();
    if (cached.length > 0) {
      const merged = mergeWithCustomSubjects(cached);
      subjectsCache = merged;
      return merged;
    }

    const fallback = mergeWithCustomSubjects(DEFAULT_SUBJECTS);
    subjectsCache = fallback;
    await db.subjects.bulkPut(fallback);
    return fallback;
  },

  async saveCustomSubject(subject: SubjectMeta): Promise<SubjectMeta[]> {
    const existing = getCustomSubjects().filter((s) => s.code !== subject.code);
    const updatedCustom = [subject, ...existing];
    localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(updatedCustom));
    await db.subjects.put(subject);
    subjectsCache = [subject, ...subjectsCache.filter((s) => s.code !== subject.code)];
    return subjectsCache;
  },

  async loadSubjectBundle(
    code: string,
    onDeltaSynced?: (updatedCount: number) => void
  ): Promise<SubjectBundle> {
    const [cachedLectures, cachedQuestions, cachedModels, cachedModules] = await Promise.all([
      db.lectures.where("subject_code").equals(code).sortBy("sort_order"),
      db.questions.where("subject_code").equals(code).toArray(),
      db.question_models.where("subject_code").equals(code).toArray(),
      db.study_modules.where("subject_code").equals(code).toArray()
    ]);

    const modules = extractModulesFromRecords(cachedModules);

    if (subjectsCache.length === 0) {
      await this.getSubjects();
    }
    const expectedVersion =
      subjectsCache.find((s) => s.code === code)?.bundle_version || 8;
    const cachedVersion = Number(localStorage.getItem(`${BUNDLE_VERSION_KEY}${code}`) || 0);
    const hasCachedContent = cachedLectures.length > 0 || cachedQuestions.length > 0;

    if (hasCachedContent && cachedVersion === expectedVersion) {
      const [subjectRecord, cachedSlides] = await Promise.all([
        db.subjects.get(code),
        db.slides.where("subject_code").equals(code).toArray()
      ]);

      this.syncDeltaFromSupabase(code)
        .then((count) => {
          if (count > 0 && onDeltaSynced) onDeltaSynced(count);
        })
        .catch((e) => console.debug("Delta sync skipped:", e));

      return {
        meta: subjectRecord || fallbackSubjectMeta(code),
        lectures: cachedLectures,
        slides: cachedSlides,
        ...modules,
        question_models: cachedModels,
        questions: cachedQuestions
      };
    }

    try {
      const res = await fetch(resolveDataPath(`data/${code}/bundle.json?v=${APP_DATA_VERSION}`), {
        cache: "no-cache"
      });
      if (res.ok && isJsonResponse(res)) {
        const bundle: SubjectBundle = await res.json();
        await this.persistBundleToIndexedDB(bundle);
        localStorage.setItem(
          `${BUNDLE_VERSION_KEY}${code}`,
          String(bundle.meta?.bundle_version || expectedVersion)
        );
        return bundle;
      }
    } catch (err) {
      console.warn(`Could not load data/${code}/bundle.json:`, err);
    }

    if (hasCachedContent) {
      const [subjectRecord, cachedSlides] = await Promise.all([
        db.subjects.get(code),
        db.slides.where("subject_code").equals(code).toArray()
      ]);
      return {
        meta: subjectRecord || fallbackSubjectMeta(code),
        lectures: cachedLectures,
        slides: cachedSlides,
        ...modules,
        question_models: cachedModels,
        questions: cachedQuestions
      };
    }

    const subjects = await this.getSubjects();
    const meta = subjects.find((s) => s.code === code) || fallbackSubjectMeta(code);

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

    const code = meta?.code;
    if (!code) return;

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
        // حذف السجلات السابقة للمقرر لمنع بقاء أسئلة أو شرائح محذوفة كأشباح بعد ترقية الحزمة
        await Promise.all([
          db.lectures.where("subject_code").equals(code).delete(),
          db.slides.where("subject_code").equals(code).delete(),
          db.question_models.where("subject_code").equals(code).delete(),
          db.questions.where("subject_code").equals(code).delete(),
          db.study_modules.where("subject_code").equals(code).delete()
        ]);

        await db.subjects.put(meta);
        if (lectures?.length) await db.lectures.bulkPut(lectures);
        if (slides?.length) await db.slides.bulkPut(slides);
        if (question_models?.length) {
          const modelsWithCode = question_models.map((m) => ({ ...m, subject_code: code }));
          await db.question_models.bulkPut(modelsWithCode);
        }
        if (questions?.length) await db.questions.bulkPut(questions);

        const now = new Date().toISOString();
        const moduleEntries: Array<{
          type:
            | "emergency_cram"
            | "explanatory_tables"
            | "summary"
            | "definitions"
            | "glossary"
            | "patterns"
            | "lab";
          payload: unknown;
        }> = [
          { type: "emergency_cram", payload: emergency },
          { type: "explanatory_tables", payload: tables },
          { type: "summary", payload: summary },
          { type: "definitions", payload: definitions },
          { type: "glossary", payload: glossary },
          { type: "patterns", payload: patterns },
          { type: "lab", payload: lab }
        ];

        for (const entry of moduleEntries) {
          if (entry.payload !== undefined) {
            await db.study_modules.put({
              id: `${code}_${entry.type}`,
              subject_code: code,
              module_type: entry.type,
              payload: entry.payload,
              version: meta.bundle_version || 1,
              updated_at: now
            });
          }
        }
      }
    );
  },

  async syncDeltaFromSupabase(subjectCode: string): Promise<number> {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      return 0;
    }

    try {
      const { supabase, isSupabaseConfigured } = await import("./supabase");
      if (!isSupabaseConfigured || !supabase) return 0;

      const syncKey = `${SYNC_KEY_PREFIX}${subjectCode}`;
      const lastSync = localStorage.getItem(syncKey) || "1970-01-01T00:00:00Z";

      const { data: updatedQuestions, error } = await supabase
        .from("questions")
        .select("*")
        .eq("subject_code", subjectCode)
        .gt("updated_at", lastSync);

      if (error) throw error;

      let count = 0;
      if (updatedQuestions && updatedQuestions.length > 0) {
        const validRows = updatedQuestions.filter(
          (row): row is UnifiedQuestion =>
            Boolean(
              row &&
                typeof row.id === "string" &&
                typeof row.subject_code === "string" &&
                typeof row.model_id === "string" &&
                (row.type === "essay" ||
                  (Array.isArray(row.options_en) &&
                    row.options_en.length >= 2 &&
                    typeof row.correct_answer === "number"))
            )
        );
        if (validRows.length > 0) {
          await db.questions.bulkPut(validRows);
          count = validRows.length;
        }
      }

      localStorage.setItem(syncKey, new Date().toISOString());
      return count;
    } catch (err) {
      console.warn(`[Sync] Supabase sync skipped or failed for ${subjectCode}:`, err);
      return 0;
    }
  },

  async getUserProgress(subjectCode: string): Promise<UserStudyProgress> {
    const saved = await db.user_study_progress.get(subjectCode);
    if (saved) return saved;

    const initial: UserStudyProgress = {
      subject_code: subjectCode,
      memorized_tables: [],
      answered_questions: {},
      bookmarks: {},
      exam_history: [],
      updated_at: new Date().toISOString()
    };
    await db.user_study_progress.put(initial);
    return initial;
  },

  async saveAnswer(
    subjectCode: string,
    questionId: string,
    selectedAnswer: number,
    isCorrect: boolean,
    twinGroupId?: string
  ): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    const now = new Date().toISOString();

    if (selectedAnswer < 0) {
      delete progress.answered_questions[questionId];
      if (twinGroupId) {
        const twins = await db.questions
          .where("twin_group_id")
          .equals(twinGroupId)
          .filter((q) => q.subject_code === subjectCode)
          .toArray();
        for (const t of twins) {
          delete progress.answered_questions[t.id];
        }
      }
    } else {
      progress.answered_questions[questionId] = {
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        answered_at: now
      };

      // مزامنة التوائم دلالياً (حسب نص الخيار / الإجابة الصحيحة الخاصة بالتوأم لا بنسخ رقم الفهرس الأعمى)
      if (twinGroupId) {
        const twins = await db.questions
          .where("twin_group_id")
          .equals(twinGroupId)
          .filter((q) => q.subject_code === subjectCode)
          .toArray();
        const sourceQ = twins.find((q) => q.id === questionId);
        const pickedText = normalizeOptText(sourceQ?.options_en?.[selectedAnswer]);

        for (const t of twins) {
          if (t.id === questionId || t.type === "essay") continue;
          if (isCorrect && t.correct_answer >= 0 && t.correct_answer < t.options_en.length) {
            progress.answered_questions[t.id] = {
              selected_answer: t.correct_answer,
              is_correct: true,
              answered_at: now
            };
          } else if (pickedText) {
            const matchedIdx = (t.options_en || []).findIndex(
              (opt) => normalizeOptText(opt) === pickedText
            );
            if (matchedIdx >= 0) {
              progress.answered_questions[t.id] = {
                selected_answer: matchedIdx,
                is_correct: matchedIdx === t.correct_answer,
                answered_at: now
              };
            }
          }
        }
      }
    }

    progress.updated_at = now;
    await db.user_study_progress.put(progress);
    return progress;
  },

  toggleMemorizedTable(subjectCode: string, tableId: string): Promise<UserStudyProgress> {
    return toggleProgressListItem(subjectCode, "memorized_tables", tableId);
  },

  toggleMasteredDefinition(subjectCode: string, definitionId: string): Promise<UserStudyProgress> {
    return toggleProgressListItem(subjectCode, "mastered_definitions", definitionId);
  },

  toggleReviewedSection(subjectCode: string, sectionId: string): Promise<UserStudyProgress> {
    return toggleProgressListItem(subjectCode, "reviewed_sections", sectionId);
  },

  toggleReviewedPart(subjectCode: string, partId: string): Promise<UserStudyProgress> {
    return toggleProgressListItem(subjectCode, "reviewed_parts", partId);
  },

  toggleFlaggedQuestion(subjectCode: string, questionId: string): Promise<UserStudyProgress> {
    return toggleProgressListItem(subjectCode, "flagged_questions", questionId);
  },

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

  async toggleBookmark(
    subjectCode: string,
    questionId: string,
    color: string,
    twinGroupId?: string
  ): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    if (!progress.bookmarks) progress.bookmarks = {};

    const cur = progress.bookmarks[questionId] || [];
    const next = cur.includes(color) ? cur.filter((c) => c !== color) : [...cur, color];

    if (next.length === 0) delete progress.bookmarks[questionId];
    else progress.bookmarks[questionId] = next;

    if (twinGroupId) {
      const twins = await db.questions
        .where("twin_group_id")
        .equals(twinGroupId)
        .filter((q) => q.subject_code === subjectCode)
        .toArray();
      for (const t of twins) {
        if (next.length === 0) delete progress.bookmarks[t.id];
        else progress.bookmarks[t.id] = [...next];
      }
    }

    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

  async resetModelAnswers(subjectCode: string, modelId: string): Promise<UserStudyProgress> {
    const progress = await this.getUserProgress(subjectCode);
    if (modelId === "all") {
      progress.answered_questions = {};
    } else {
      const qs = await db.questions
        .where("subject_code")
        .equals(subjectCode)
        .filter((q) => q.model_id === modelId)
        .toArray();
      for (const q of qs) {
        delete progress.answered_questions[q.id];
      }
    }
    progress.updated_at = new Date().toISOString();
    await db.user_study_progress.put(progress);
    return progress;
  },

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
  },

  async exportAllProgress(): Promise<FullProgressBackup> {
    const all = await db.user_study_progress.toArray();
    const subjects: Record<string, UserStudyProgress> = {};
    for (const row of all) {
      if (row.subject_code) subjects[row.subject_code] = row;
    }
    return {
      backup_version: 2,
      exported_at: new Date().toISOString(),
      subjects
    };
  },

  async importProgressBackup(
    raw: unknown,
    fallbackSubjectCode: string
  ): Promise<{ importedSubjects: string[]; activeProgress: UserStudyProgress }> {
    if (!raw || typeof raw !== "object") {
      throw new Error("ملف النسخة الاحتياطية غير صالح.");
    }
    const obj = raw as Record<string, unknown>;
    const records: UserStudyProgress[] = [];

    if (obj.subjects && typeof obj.subjects === "object" && !Array.isArray(obj.subjects)) {
      for (const [code, val] of Object.entries(obj.subjects as Record<string, unknown>)) {
        if (val && typeof val === "object") {
          records.push(normalizeImportedProgress(val as Partial<UserStudyProgress>, code));
        }
      }
    } else if (
      typeof obj.subject_code === "string" ||
      typeof obj.answered_questions === "object"
    ) {
      const code =
        typeof obj.subject_code === "string" && obj.subject_code.trim()
          ? obj.subject_code.trim()
          : fallbackSubjectCode;
      records.push(normalizeImportedProgress(obj as Partial<UserStudyProgress>, code));
    }

    if (records.length === 0) {
      throw new Error("لم يتم العثور على بيانات تقدم صالحة داخل الملف.");
    }

    await db.user_study_progress.bulkPut(records);
    const activeProgress = await this.getUserProgress(fallbackSubjectCode);
    return {
      importedSubjects: records.map((r) => r.subject_code),
      activeProgress
    };
  }
};

function normalizeImportedProgress(
  partial: Partial<UserStudyProgress>,
  subjectCode: string
): UserStudyProgress {
  return {
    subject_code: subjectCode,
    memorized_tables: Array.isArray(partial.memorized_tables) ? partial.memorized_tables : [],
    answered_questions:
      partial.answered_questions && typeof partial.answered_questions === "object"
        ? partial.answered_questions
        : {},
    bookmarks:
      partial.bookmarks && typeof partial.bookmarks === "object" ? partial.bookmarks : {},
    exam_history: Array.isArray(partial.exam_history) ? partial.exam_history : [],
    reviewed_sections: Array.isArray(partial.reviewed_sections) ? partial.reviewed_sections : [],
    reviewed_parts: Array.isArray(partial.reviewed_parts) ? partial.reviewed_parts : [],
    reviewed_capsules: Array.isArray(partial.reviewed_capsules) ? partial.reviewed_capsules : [],
    mastered_definitions: Array.isArray(partial.mastered_definitions)
      ? partial.mastered_definitions
      : [],
    flagged_questions: Array.isArray(partial.flagged_questions) ? partial.flagged_questions : [],
    last_visited_view: partial.last_visited_view,
    last_visited_slide: partial.last_visited_slide,
    updated_at: new Date().toISOString()
  };
}

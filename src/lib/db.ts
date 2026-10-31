import Dexie, { type Table } from "dexie";
import type {
  SubjectMeta,
  Lecture,
  SlideItem,
  ExplanatoryTable,
  SummaryOfSummaryData,
  TheoreticalSummaryData,
  QuestionModelInfo,
  UnifiedQuestion,
  UserStudyProgress
} from "../types";

export interface StudyModuleRecord {
  id: string; // e.g. "toc_emergency_cram", "toc_explanatory_tables"
  subject_code: string;
  module_type:
    | "summary"
    | "emergency_cram"
    | "explanatory_tables"
    | "definitions"
    | "glossary"
    | "patterns"
    | "lab"
    | "roadmap";
  payload: SummaryOfSummaryData | TheoreticalSummaryData | ExplanatoryTable[] | unknown;
  version: number;
  updated_at: string;
}

export class UnifiedStudyDatabase extends Dexie {
  subjects!: Table<SubjectMeta, string>;
  lectures!: Table<Lecture, [string, string]>;
  slides!: Table<SlideItem, [string, string]>;
  study_modules!: Table<StudyModuleRecord, string>;
  question_models!: Table<QuestionModelInfo & { subject_code: string }, [string, string]>;
  questions!: Table<UnifiedQuestion, string>;
  user_study_progress!: Table<UserStudyProgress, string>;

  constructor() {
    super("UnifiedStudyPlatformDB");

    this.version(1).stores({
      subjects: "code, term, is_active",
      lectures: "[subject_code+id], subject_code, id, sort_order",
      slides: "[subject_code+ref], subject_code, lecture_id, slide_num",
      study_modules: "id, subject_code, module_type, updated_at",
      question_models: "[subject_code+id], subject_code, id, kind",
      questions: "id, subject_code, model_id, orig_q_num, lecture_id, twin_group_id, updated_at",
      user_study_progress: "subject_code, updated_at"
    });
  }
}

export const db = new UnifiedStudyDatabase();

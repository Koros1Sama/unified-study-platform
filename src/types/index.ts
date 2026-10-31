// ==============================================================================
// المنصة التعليمية الموحدة — تعريفات النماذج والأنواع (TypeScript Types)
// Zero Emojis Standard · Strictly Typed Data Contracts
// ==============================================================================

export type SubjectCode = string;

export interface SubjectMeta {
  code: string;
  name_ar: string;
  name_en: string;
  term: number; // 1 or 2
  professor_name: string;
  accent_color: string;
  icon_name?: string;
  is_active?: boolean;
  lectures_count?: number;
  questions_count?: number;
  tables_count?: number;
  bundle_version?: number;
  has_lab?: boolean;
  lab_url?: string;
  lab_title?: string;
  data_status?: "full" | "theory-only" | "pending";
}

export interface Lecture {
  id: string; // e.g. "L1", "L2"
  subject_code: string;
  title_ar: string;
  title_en: string;
  sort_order: number;
  slides_count: number;
}

export interface SlideItem {
  subject_code: string;
  lecture_id: string;
  slide_num: number;
  ref: string; // e.g. "L1-S001"
  title?: string;
  image_url: string; // e.g. "/slides/toc/L1/slide_1.png"
  content_ar?: string;
  content_en?: string;
  notes_ar?: string;
}

// ------------------------------------------------------------------------------
// الركن الأول: ملخص الملخص (Summary of Summary)
// ------------------------------------------------------------------------------

export interface CapsuleItem {
  head: string;
  math?: string;
  body: string; // HTML string with strong, code.m-ltr
}

export interface CapsuleGroup {
  subtitle: string;
  layout: "cols-1" | "cols-2" | "cols-3";
  items: CapsuleItem[];
}

export interface Capsule {
  id: string;
  lec: string;
  title: string;
  refs: string[];
  groups: CapsuleGroup[];
}

export interface CapsuleSection {
  id: string;
  type: "capsules";
  nav_title: string;
  title: string;
  badge?: string;
  desc?: string;
  capsules: Capsule[];
}

export interface TableSection {
  id: string;
  type: "table";
  nav_title: string;
  title: string;
  badge?: string;
  desc?: string;
  head: string[];
  rows: string[][];
  callout?: {
    title: string;
    math: string;
    body: string;
  };
}

export interface TrapItem {
  num: string;
  title: string;
  math?: string;
  points: string[];
}

export interface TrapsGridSection {
  id: string;
  type: "traps_grid";
  nav_title: string;
  title: string;
  badge?: string;
  desc?: string;
  traps: TrapItem[];
}

export interface ShortcutItem {
  num: string;
  problem: string;
  rule: string;
  example_title?: string;
  example_math?: string;
  steps: string[];
}

export interface ShortcutsSection {
  id: string;
  type: "shortcuts";
  nav_title: string;
  title: string;
  badge?: string;
  desc?: string;
  shortcuts: ShortcutItem[];
}

export interface CramModel {
  id: string;
  name: string;
  fullName: string;
  chomskyType?: string;
  languageClass?: string;
  tupleSignature?: string;
  transitionFunction?: string;
  memory?: string;
  determinismRule?: string;
  canonicalExample?: string;
  examTrap?: string;
  [key: string]: string | undefined;
}

export interface CramQuizQuestion {
  q: string;
  badge?: string;
  options: string[];
  ans: number;
  tip: string;
  why: string;
}

export interface InteractiveCramSection {
  id: string;
  type: "interactive_cram_widget";
  nav_title: string;
  title: string;
  badge?: string;
  desc?: string;
  models: CramModel[];
  questions: CramQuizQuestion[];
}

export interface CramCardItem {
  num?: string;
  title: string;
  body: string;
  math?: string;
}

export interface CardsSection {
  id: string;
  type: "cards";
  nav_title: string;
  title: string;
  badge?: string;
  desc?: string;
  cards: CramCardItem[];
}

export interface TfTrapItem {
  n: number | string;
  is_true: boolean;
  verdict?: string;
  statement: string;
  trap: string;
  rule: string;
  ref?: string;
}

export interface TfListSection {
  id: string;
  type: "tf_list";
  nav_title: string;
  title: string;
  badge?: string;
  desc?: string;
  items: TfTrapItem[];
}

export interface TimelineStep {
  time: string;
  target: string;
  detail: string;
}

export interface TimelineSection {
  id: string;
  type: "timeline";
  nav_title: string;
  title: string;
  badge?: string;
  desc?: string;
  steps: TimelineStep[];
}

export type SummaryOfSummarySection =
  | CapsuleSection
  | TableSection
  | TrapsGridSection
  | ShortcutsSection
  | InteractiveCramSection
  | CardsSection
  | TfListSection
  | TimelineSection;

export interface SummaryOfSummaryData {
  title_ar: string;
  sub_ar: string;
  subtitle_ar?: string;
  doctor_tips?: string[];
  sections: SummaryOfSummarySection[];
}

// ------------------------------------------------------------------------------
// الركن الثاني: الجداول الشارحة (Explanatory Tables)
// ------------------------------------------------------------------------------

export interface TableColumn {
  key: string;
  label: string;
  ltr?: boolean;
}

export interface ExplanatoryTable {
  id: string;
  lec: string; // "L1"
  title: string;
  title_ar: string;
  desc?: string;
  note_ar?: string;
  refs: string[]; // ["L1-S009"]
  cols: TableColumn[];
  rows: string[][];
  imps: number[]; // 1 to 5 per row
}

// ------------------------------------------------------------------------------
// الركن الثالث: بنك الأسئلة والمشتتات (Questions & Distractors)
// ------------------------------------------------------------------------------

export interface DistractorDetail {
  why_wrong: string;
  when_correct: string;
}

export type DistractorAnalysisMap = Record<string, DistractorDetail | string>;

export interface QuestionModelInfo {
  id: string; // "m1", "b1"
  title_ar: string;
  kind: string; // "رسمي", "عملي", "تنبؤي AI"
  short_label?: string;
  origin_ar?: string;
  origin_tag?: string;
  origin_url?: string;
  origin_sources?: Array<{ label: string; url?: string }>;
  questions_count?: number;
}

export interface UnifiedQuestion {
  id: string; // Canonical ID: e.g. "toc:m1:1"
  subject_code: string;
  model_id: string;
  orig_q_num: number;
  type: "mcq" | "tf" | "essay";
  lecture_id?: string;
  slide_ref?: string;
  question_en: string;
  question_ar: string;
  options_en: string[];
  options_ar: string[];
  correct_answer: number; // 0-based
  why_correct: string;
  distractor_analysis: DistractorAnalysisMap;
  essay_answer_ar?: string;
  essay_answer_en?: string;
  image_url?: string;
  exam_tip?: string;
  is_ai_predicted?: boolean;
  twin_group_id?: string;
  tg_msg_id?: number;
  tg_url?: string;
  created_at?: string;
  updated_at?: string;
}

// ------------------------------------------------------------------------------
// الملخص النظري والربط التفاعلي (Summary & Interactive Links)
// ------------------------------------------------------------------------------

export interface InteractiveLink {
  id: string; // studio id
  tab?: string;
  label: string;
}

export interface SummaryBlock {
  id?: string;
  kind?: "p" | "table" | "list" | "warn" | "formula" | "tip";
  head?: string;
  title?: string;
  body: string;
  items?: string[];
  table_head?: string[];
  rows?: string[][];
  refs?: string[];
  callout?: string;
  interactive?: InteractiveLink | InteractiveLink[];
}

export interface SummaryPart {
  lec: string; // "L1"
  title: string;
  interactive?: InteractiveLink;
  blocks: SummaryBlock[];
}

export interface TheoreticalSummaryData {
  title_ar: string;
  sub_ar?: string;
  parts: SummaryPart[];
}

// ------------------------------------------------------------------------------
// بنك التعاريف والمعجم ثنائي اللغة (Definitions Bank & Curated Glossary Deck)
// ------------------------------------------------------------------------------

/**
 * نظام مستويات الأهمية الثلاثي للمصطلحات والمعجم (Tiered Importance System):
 * 1: مفاهيم امتحانية حتمية / درجة أولى (Must-Know Core / Tier 1)
 * 2: مفاهيم داعمة ومصطلحات رئيسية / درجة ثانية (Supporting Concepts / Tier 2)
 * 3: مصطلحات تخصصية تكميلية / درجة ثالثة (Supplementary Technical Terms / Tier 3)
 */
export type ImportanceTier = 1 | 2 | 3;
export type GlossaryImportance = ImportanceTier;

export interface DefinitionTrigger {
  en: string;
  ar: string;
}

export interface DefinitionItem {
  id: string;
  lec: string;
  term_en: string;
  term_ar: string;
  category: string;
  importance: ImportanceTier | number;
  def_en: string;
  def_ar: string;
  triggers: DefinitionTrigger[];
  exam_pitfall: {
    en: string;
    ar: string;
  };
  ref: string;
}

export interface DefinitionBank {
  title_ar: string;
  sub_ar?: string;
  items: DefinitionItem[];
}

export interface GlossaryTermMeta {
  arabic: string;
  importance?: ImportanceTier;
  category?: string;
  context?: string;
  ref?: string;
}

export type GlossaryWordValue = string | GlossaryTermMeta;

export interface GlossaryItem {
  id?: string;
  term_en: string;
  term_ar: string;
  importance: ImportanceTier;
  kind?: "word" | "phrase";
  category?: string;
  context?: string;
  ref?: string;
}

export interface GlossaryData {
  title_ar: string;
  sub_ar?: string;
  words?: Record<string, GlossaryWordValue>;
  phrases?: Record<string, GlossaryWordValue>;
  items?: GlossaryItem[];
  curated_items?: GlossaryItem[];
}

// ------------------------------------------------------------------------------
// مختبر أنماط الحل (Pattern Lab)
// ------------------------------------------------------------------------------

export interface PatternCase {
  m: string;
  n: number;
  q: string;
  q_ar?: string;
  ans: string;
  ans_ar?: string;
  ans_letter?: string;
  note?: string;
  trap_type?: string;
  trigger_word?: string;
}

export interface PatternRule {
  id: string;
  title: string;
  subtitle?: string;
  rule: string;
  trigger?: string;
  accuracy?: string;
  total?: number;
  cases?: PatternCase[];
  exceptions?: PatternCase[];
}

export interface QuestionPatternsData {
  title_ar: string;
  sub_ar?: string;
  rules: PatternRule[];
}

export interface PatternAnalysis {
  id: string;
  title: string;
  rule: string;
  count: number;
  examples: UnifiedQuestion[];
  severity: "high" | "medium" | "low";
}

// ------------------------------------------------------------------------------
// الملحق العملي (Practical Lab Appendix)
// ------------------------------------------------------------------------------

export interface LabLecture {
  id: string;
  title_ar: string;
  title_en: string;
  slides_count: number;
}

export interface LabAppendix {
  title_ar: string;
  sub_ar?: string;
  professor_name?: string;
  external_url?: string;
  sessions: LabLecture[];
  slides: SlideItem[];
}

// ------------------------------------------------------------------------------
// حالة المستخدم والمحفوظات (User Study Progress)
// ------------------------------------------------------------------------------

export interface QuestionAnswerRecord {
  selected_answer: number;
  is_correct: boolean;
  answered_at: string;
}

export interface UserStudyProgress {
  subject_code: string;
  memorized_tables: string[]; // Table IDs
  answered_questions: Record<string, QuestionAnswerRecord>; // key is canonical question id
  bookmarks?: Record<string, string[]>; // key is question id, value is array of colors: ["red", "yellow", "green", "blue"]
  exam_history: Array<{
    date: string;
    total: number;
    score: number;
    timeSpentSec: number;
    mode: string;
  }>;
  reviewed_sections?: string[];
  reviewed_parts?: string[];
  reviewed_capsules?: string[];
  mastered_definitions?: string[];
  flagged_questions?: string[];
  last_visited_view?: string;
  last_visited_slide?: string;
  updated_at: string;
}

// ------------------------------------------------------------------------------
// إعدادات وتفضيلات البنك (Settings & Bookmarks)
// ------------------------------------------------------------------------------

export type ExplanationMode = "always" | "wrong_only" | "manual";
export type BookmarkColor = "red" | "yellow" | "green" | "blue";
export type BookmarkLabels = Record<BookmarkColor, string>;

export interface ShuffleSettings {
  shuffleChoices: boolean;
  shuffleQuestions: boolean;
  seed: number;
}

// ------------------------------------------------------------------------------
// أوضاع التكبير والثيمات
// ------------------------------------------------------------------------------

export type ZenZoomLevel = 0 | 1 | 2; // 0: Normal, 1: Focus (no sidebar), 2: Fullscreen Zen

export type ActiveView =
  | "dashboard"
  | "slides"
  | "summary"
  | "emergency"
  | "tables"
  | "questions"
  | "explorer"
  | "exam"
  | "interactive"
  | "definitions"
  | "glossary"
  | "patterns"
  | "lab";

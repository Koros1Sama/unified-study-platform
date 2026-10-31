-- ==============================================================================
-- المنصة التعليمية الموحدة — مخطط قاعدة بيانات Supabase (PostgreSQL)
-- UNIFIED STUDY PLATFORM — CORE DATABASE SCHEMA
-- Zero Emojis Standard · High Performance Indexed Storage · Row Level Security
-- ==============================================================================

-- تفعيل ملحق UUID التلقائي
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. جدول المواد الدراسية (subjects)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  code TEXT PRIMARY KEY,                       -- e.g. 'toc', 'rm', 'se', 'sec', 'ap', 'hci', 'ai'
  name_ar TEXT NOT NULL,                       -- اسم المادة بالعربية
  name_en TEXT NOT NULL,                       -- اسم المادة بالإنجليزية
  term INT NOT NULL DEFAULT 1,                 -- الفصل الدراسي (1 = الترم الأول, 2 = الترم الثاني)
  professor_name TEXT NOT NULL,                -- اسم أستاذ المقرر
  accent_color TEXT NOT NULL DEFAULT '#f5b13d',-- اللون المميز للمادة
  icon_name TEXT DEFAULT 'book',               -- معرّف أيقونة SVG المعيارية
  is_active BOOLEAN DEFAULT true,              -- تفعيل المادة في البوابة
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. جدول المحاضرات (lectures)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lectures (
  subject_code TEXT REFERENCES subjects(code) ON DELETE CASCADE,
  id TEXT NOT NULL,                            -- معرّف المحاضرة e.g. 'L1', 'L2'
  title_ar TEXT NOT NULL,                      -- عنوان المحاضرة بالعربية
  title_en TEXT NOT NULL,                      -- عنوان المحاضرة بالإنجليزية
  sort_order INT NOT NULL DEFAULT 1,           -- ترتيب العرض
  slides_count INT DEFAULT 0,                  -- عدد السلايدات
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (subject_code, id)
);

CREATE INDEX IF NOT EXISTS idx_lectures_subject_sort ON lectures(subject_code, sort_order);

-- ------------------------------------------------------------------------------
-- 3. جدول الشرائح والسلايدات (slides)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slides (
  subject_code TEXT REFERENCES subjects(code) ON DELETE CASCADE,
  lecture_id TEXT NOT NULL,
  slide_num INT NOT NULL,
  title TEXT,                                  -- عنوان الشريحة الأصلي
  image_url TEXT NOT NULL,                     -- مسار الصورة الثابت e.g. '/slides/toc/L1/slide_1.png'
  content_ar TEXT,                             -- الترجمة العربية للشريحة
  content_en TEXT,                             -- المحتوى الإنجليزي للشريحة
  notes_ar TEXT,                               -- الشرح والوقفة الامتحانية المفصلة
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (subject_code, lecture_id, slide_num)
);

CREATE INDEX IF NOT EXISTS idx_slides_subject_lecture ON slides(subject_code, lecture_id);

-- ------------------------------------------------------------------------------
-- 4. جدول الوحدات الدراسية المجمعة (study_modules)
-- يشمل: ملخص الملخص (emergency_cram), الجداول الشارحة (explanatory_tables),
-- الملخص النظري (summary), والقاموس (glossary)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_modules (
  id TEXT PRIMARY KEY,                         -- e.g. 'toc_summary_of_summary', 'toc_tables', 'toc_summary'
  subject_code TEXT REFERENCES subjects(code) ON DELETE CASCADE,
  module_type TEXT CHECK (module_type IN ('summary', 'emergency_cram', 'explanatory_tables', 'glossary', 'roadmap')) NOT NULL,
  payload JSONB NOT NULL,                      -- البيانات الهيكلية الكاملة بصيغة JSON
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_modules_subject_type ON study_modules(subject_code, module_type);

-- ------------------------------------------------------------------------------
-- 5. جدول نماذج بنوك الأسئلة (question_models)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_models (
  subject_code TEXT REFERENCES subjects(code) ON DELETE CASCADE,
  id TEXT NOT NULL,                            -- e.g. 'm1', 'b1', 't1'
  title_ar TEXT NOT NULL,                      -- اسم النموذج بالعربية
  kind TEXT NOT NULL DEFAULT 'رسمي',           -- نوع النموذج: رسمي, تدريبي, عملي, تنبؤي AI
  origin_ar TEXT,                              -- مصدر وتوثيق النموذج
  origin_url TEXT,
  questions_count INT DEFAULT 0,
  sort_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (subject_code, id)
);

-- ------------------------------------------------------------------------------
-- 6. جدول الأسئلة الموحدة (questions)
-- يعتمد المعرّف الكانوني الثابت: (subject_code, model_id, orig_q_num)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,                         -- معرّف كانوني ثابت e.g. 'toc:m1:1' أو 'rm:b1:45'
  subject_code TEXT REFERENCES subjects(code) ON DELETE CASCADE,
  model_id TEXT NOT NULL,                      -- معرّف النموذج e.g. 'm1'
  orig_q_num INT NOT NULL,                     -- رقم السؤال في نموذجه الأصلي
  type TEXT CHECK (type IN ('mcq', 'tf', 'essay')) NOT NULL DEFAULT 'mcq',
  lecture_id TEXT,                             -- المحاضرة المرتبطة e.g. 'L1'
  slide_ref TEXT,                              -- مرجع السلايد e.g. 'L1-S014'
  question_en TEXT NOT NULL,                   -- نص السؤال الأصلي بالإنجليزية
  question_ar TEXT NOT NULL,                   -- الترجمة العربية الحرفية المباشرة
  options_en JSONB NOT NULL,                   -- مصفوفة خيارات الإنجليزية
  options_ar JSONB NOT NULL,                   -- مصفوفة خيارات العربية
  correct_answer INT NOT NULL,                 -- مؤشر الإجابة الصحيحة (0-based)
  why_correct TEXT NOT NULL,                   -- التعليل العلمي الحتمي للصواب
  distractor_analysis JSONB NOT NULL,          -- تفنيد كل مشتت: why_wrong و when_correct
  exam_tip TEXT,                               -- نصيحة الحل السريع والكلمات المفتاحية Triggers
  is_ai_predicted BOOLEAN DEFAULT false,       -- هل السؤال مولّد بالذكاء الاصطناعي
  twin_group_id TEXT,                          -- معرّف التوأم لدمج المكررات (B1_TWINS / later_twins)
  tg_msg_id INT,                               -- توثيق رسالة تيليجرام
  tg_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_model ON questions(subject_code, model_id);
CREATE INDEX IF NOT EXISTS idx_questions_twin_group ON questions(twin_group_id);
CREATE INDEX IF NOT EXISTS idx_questions_updated_at ON questions(updated_at);

-- ------------------------------------------------------------------------------
-- 7. جدول تقدم الطالب والمحفوظات (user_study_progress)
-- يدعم العمل المحلي الأوفلاين والتزامن التلقائي عند تسجيل الدخول
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_study_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_code TEXT REFERENCES subjects(code) ON DELETE CASCADE,
  memorized_tables JSONB DEFAULT '[]'::jsonb,  -- مصفوفة معرّفات الجداول المحفوظة
  answered_questions JSONB DEFAULT '{}'::jsonb,-- إجابات الطالب ونتائجه
  exam_history JSONB DEFAULT '[]'::jsonb,      -- سجل الامتحانات التجريبية
  last_visited_view TEXT DEFAULT 'slides',
  last_visited_slide TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject_code)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_subject ON user_study_progress(user_id, subject_code);

-- ==============================================================================
-- سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
-- ==============================================================================

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_progress ENABLE ROW LEVEL SECURITY;

-- قراءة عامة مفتوحة للجميع لمحتوى المقررات والأسئلة (Zero-Friction Student Access)
CREATE POLICY "Public read access for subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public read access for lectures" ON lectures FOR SELECT USING (true);
CREATE POLICY "Public read access for slides" ON slides FOR SELECT USING (true);
CREATE POLICY "Public read access for study_modules" ON study_modules FOR SELECT USING (true);
CREATE POLICY "Public read access for question_models" ON question_models FOR SELECT USING (true);
CREATE POLICY "Public read access for questions" ON questions FOR SELECT USING (true);

-- إدارة بيانات الطالب مقتصرة على صاحب الحساب
CREATE POLICY "Users can manage own study progress" ON user_study_progress
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- دوال التحديث التلقائي لحقل updated_at
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subjects_modtime BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_lectures_modtime BEFORE UPDATE ON lectures FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_slides_modtime BEFORE UPDATE ON slides FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_study_modules_modtime BEFORE UPDATE ON study_modules FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_question_models_modtime BEFORE UPDATE ON question_models FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_questions_modtime BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_user_study_progress_modtime BEFORE UPDATE ON user_study_progress FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

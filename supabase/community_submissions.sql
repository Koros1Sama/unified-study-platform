-- ==============================================================================
-- المنصة التعليمية الموحدة — جداول بلاغات الأخطاء وطلبات إضافة المواد (Supabase)
-- Private Admin Review · Zero-Friction Student Submissions · Strict RLS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. جدول بلاغات أخطاء الترجمة والشرح والأسئلة (content_reports)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL DEFAULT '',
  view_type TEXT NOT NULL DEFAULT 'slides',
  item_ref TEXT NOT NULL DEFAULT '',
  item_label TEXT NOT NULL DEFAULT '',
  issue_type TEXT NOT NULL CHECK (issue_type IN ('translation', 'explanation', 'answer', 'image', 'other')),
  description TEXT NOT NULL DEFAULT '',
  page_url TEXT NOT NULL DEFAULT '',
  reporter_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'dismissed')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
  ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_subject
  ON public.content_reports (subject_code, created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. جدول طلبات إضافة مادة جديدة أو محتوى عبر رابط تيليجرام (subject_requests)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subject_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_kind TEXT NOT NULL CHECK (request_kind IN ('new_subject', 'add_to_subject')),
  target_subject_code TEXT NOT NULL DEFAULT '',
  subject_name_ar TEXT NOT NULL,
  professor_name TEXT NOT NULL DEFAULT '',
  term INT NOT NULL DEFAULT 2 CHECK (term IN (1, 2)),
  content_type TEXT NOT NULL DEFAULT 'full_course' CHECK (content_type IN ('full_course', 'slides', 'summary', 'questions', 'lab', 'other')),
  telegram_url TEXT NOT NULL CHECK (telegram_url ~* '^https?://(t\.me|telegram\.me)/'),
  notes TEXT NOT NULL DEFAULT '',
  requester_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_requests_status_created
  ON public.subject_requests (status, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. سياسات الأمان (RLS): إرسال مفتوح للطلاب، وقراءة/تعديل محصورة بسيرفر المشرف فقط
-- ------------------------------------------------------------------------------
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous report insert" ON public.content_reports;
CREATE POLICY "Allow anonymous report insert"
  ON public.content_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(subject_code) BETWEEN 1 AND 32
    AND char_length(description) <= 2000
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Allow anonymous subject request insert" ON public.subject_requests;
CREATE POLICY "Allow anonymous subject request insert"
  ON public.subject_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(subject_name_ar) BETWEEN 2 AND 160
    AND char_length(telegram_url) BETWEEN 14 AND 400
    AND char_length(notes) <= 2000
    AND status = 'pending'
  );

-- لا توجد سياسات SELECT أو UPDATE للعامة (anon/authenticated)؛
-- القراءة والموافقة تتم حصراً عبر Vercel Serverless API (/api/admin) باستخدام SUPABASE_SERVICE_ROLE_KEY.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT ON public.content_reports, public.subject_requests TO anon, authenticated;
GRANT ALL ON public.content_reports, public.subject_requests TO service_role;

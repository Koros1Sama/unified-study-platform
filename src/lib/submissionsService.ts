// ==============================================================================
// المنصة التعليمية الموحدة — خدمة بلاغات الأخطاء وطلبات المواد ولوحة المشرف
// Telegram Post Validation · Vercel API First · Lazy Supabase Fallback
// ==============================================================================

export type ReportIssueType = "translation" | "explanation" | "answer" | "image" | "other";
export type SubjectRequestKind = "new_subject" | "add_to_subject";
export type SubjectContentType = "full_course" | "slides" | "summary" | "questions" | "lab" | "other";

export interface ReportContext {
  subjectCode: string;
  subjectName: string;
  viewType: string;
  itemRef?: string;
  itemLabel?: string;
  defaultIssueType?: ReportIssueType;
}

export interface ReportSubmissionInput {
  subject_code: string;
  subject_name: string;
  view_type: string;
  item_ref: string;
  item_label: string;
  issue_type: ReportIssueType;
  description: string;
  page_url: string;
  reporter_name?: string;
  website?: string;
}

export interface SubjectRequestInput {
  request_kind: SubjectRequestKind;
  target_subject_code?: string;
  subject_name_ar: string;
  professor_name?: string;
  term: number;
  content_type: SubjectContentType;
  telegram_url: string;
  notes?: string;
  requester_name?: string;
  page_url?: string;
  website?: string;
}

export interface SubmissionResult {
  ok: boolean;
  id?: string | null;
  savedToDb?: boolean;
  sentToTelegram?: boolean;
  error?: string;
}

export interface ContentReportRecord {
  id: string;
  subject_code: string;
  subject_name: string;
  view_type: string;
  item_ref: string;
  item_label: string;
  issue_type: ReportIssueType;
  description: string;
  page_url: string;
  reporter_name: string;
  status: "pending" | "in_progress" | "resolved" | "dismissed";
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectRequestRecord {
  id: string;
  request_kind: SubjectRequestKind;
  target_subject_code: string;
  subject_name_ar: string;
  professor_name: string;
  term: number;
  content_type: SubjectContentType;
  telegram_url: string;
  notes: string;
  requester_name: string;
  status: "pending" | "approved" | "completed" | "rejected";
  admin_note: string;
  created_at: string;
  updated_at: string;
}

export interface AdminFetchResult {
  ok: boolean;
  configured?: boolean;
  supabaseReady?: boolean;
  telegramReady?: boolean;
  reports: ContentReportRecord[];
  requests: SubjectRequestRecord[];
  error?: string;
}

const TELEGRAM_POST_RE =
  /^https?:\/\/(?:t\.me|telegram\.me)\/(?:(?:s\/)?[a-zA-Z][a-zA-Z0-9_]{2,31}|c\/\d{5,})(?:\/\d+){1,2}(?:\?[^\s#]*)?$/i;

export function normalizeTelegramPostUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^(?:t\.me|telegram\.me)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function validateTelegramPostUrl(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeTelegramPostUrl(raw);
  if (!normalized) {
    return {
      valid: false,
      normalized: "",
      error: "رابط منشور تيليجرام إجباري لإرسال الطلب."
    };
  }
  if (!TELEGRAM_POST_RE.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "يرجى لصق رابط منشور تيليجرام صحيح (مثل: https://t.me/channel_name/123)."
    };
  }
  return { valid: true, normalized };
}

async function postToApi(payload: Record<string, unknown>): Promise<SubmissionResult | null> {
  try {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    // إذا كان الموقع مستضافاً على استضافة ثابتة بدون Serverless API نعود للبديل المباشر
    if (!ct.includes("application/json")) {
      return null;
    }
    const data = (await res.json()) as SubmissionResult;
    if (res.ok && data.ok) {
      return data;
    }
    return {
      ok: false,
      error: data.error || "تعذر إرسال البيانات حالياً."
    };
  } catch {
    return null;
  }
}

export async function submitContentReport(input: ReportSubmissionInput): Promise<SubmissionResult> {
  const apiResult = await postToApi({ kind: "report", ...input });
  if (apiResult) return apiResult;

  const { isSupabaseConfigured, supabase } = await import("./supabase");
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("content_reports").insert({
      subject_code: input.subject_code,
      subject_name: input.subject_name,
      view_type: input.view_type,
      item_ref: input.item_ref,
      item_label: input.item_label,
      issue_type: input.issue_type,
      description: input.description,
      page_url: input.page_url,
      reporter_name: input.reporter_name || "",
      status: "pending"
    });
    if (!error) {
      return { ok: true, savedToDb: true, sentToTelegram: false };
    }
    return { ok: false, error: "تعذر حفظ البلاغ في قاعدة البيانات حالياً. تأكد من اتصالك بالإنترنت." };
  }

  return {
    ok: false,
    error: "تعذر الاتصال بخدمة استلام البلاغات حالياً. يرجى المحاولة لاحقاً عند توفر الإنترنت."
  };
}

export async function submitSubjectRequest(input: SubjectRequestInput): Promise<SubmissionResult> {
  const check = validateTelegramPostUrl(input.telegram_url);
  if (!check.valid) {
    return { ok: false, error: check.error };
  }

  const normalizedInput = { ...input, telegram_url: check.normalized };
  const apiResult = await postToApi({ kind: "subject_request", ...normalizedInput });
  if (apiResult) return apiResult;

  const { isSupabaseConfigured, supabase } = await import("./supabase");
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("subject_requests").insert({
      request_kind: normalizedInput.request_kind,
      target_subject_code:
        normalizedInput.request_kind === "add_to_subject"
          ? normalizedInput.target_subject_code || ""
          : "",
      subject_name_ar: normalizedInput.subject_name_ar,
      professor_name: normalizedInput.professor_name || "",
      term: normalizedInput.term === 1 ? 1 : 2,
      content_type: normalizedInput.content_type,
      telegram_url: normalizedInput.telegram_url,
      notes: normalizedInput.notes || "",
      requester_name: normalizedInput.requester_name || "",
      status: "pending"
    });
    if (!error) {
      return { ok: true, savedToDb: true, sentToTelegram: false };
    }
    return { ok: false, error: "تعذر حفظ الطلب في قاعدة البيانات حالياً. تأكد من اتصالك بالإنترنت." };
  }

  return {
    ok: false,
    error: "تعذر الاتصال بخدمة استلام الطلبات حالياً. يرجى المحاولة لاحقاً عند توفر الإنترنت."
  };
}

export async function fetchAdminSubmissions(secret: string): Promise<AdminFetchResult> {
  try {
    const res = await fetch("/api/admin", {
      method: "GET",
      headers: { "x-admin-secret": secret }
    });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      return {
        ok: false,
        configured: false,
        reports: [],
        requests: [],
        error: "لوحة المراجعة تعمل عبر النسخة المنشورة على Vercel (Serverless API)."
      };
    }
    const data = (await res.json()) as Partial<AdminFetchResult>;
    return {
      ok: Boolean(res.ok && data.ok),
      configured: data.configured,
      supabaseReady: data.supabaseReady,
      telegramReady: data.telegramReady,
      reports: Array.isArray(data.reports) ? data.reports : [],
      requests: Array.isArray(data.requests) ? data.requests : [],
      error: data.error
    };
  } catch {
    return {
      ok: false,
      reports: [],
      requests: [],
      error: "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت."
    };
  }
}

export async function updateAdminSubmission(
  secret: string,
  payload: {
    table: "content_reports" | "subject_requests";
    id: string;
    status: string;
    admin_note?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify(payload)
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return { ok: Boolean(res.ok && data.ok), error: data.error };
  } catch {
    return { ok: false, error: "تعذر تحديث الحالة." };
  }
}

// ==============================================================================
// المنصة التعليمية الموحدة — Vercel Serverless API لبلاغات الأخطاء وطلبات المواد
// POST /api/submissions -> Validates -> Saves to Supabase -> Alerts Admin via Telegram
// ==============================================================================

const TELEGRAM_POST_RE =
  /^https?:\/\/(?:t\.me|telegram\.me)\/(?:(?:s\/)?[a-zA-Z][a-zA-Z0-9_]{2,31}|c\/\d{5,})(?:\/\d+){1,2}(?:\?[^\s#]*)?$/i;

const ALLOWED_ISSUE_TYPES = new Set(["translation", "explanation", "answer", "image", "other"]);
const ALLOWED_REQUEST_KINDS = new Set(["new_subject", "add_to_subject"]);
const ALLOWED_CONTENT_TYPES = new Set(["full_course", "slides", "summary", "questions", "lab", "other"]);

const ISSUE_LABELS = {
  translation: "خطأ في الترجمة",
  explanation: "خطأ في الشرح",
  answer: "خطأ في السؤال / الإجابة",
  image: "صورة مقطوعة أو غير واضحة",
  other: "مشكلة تقنية / أخرى"
};

const CONTENT_LABELS = {
  full_course: "منهج / مادة كاملة",
  slides: "سلايدات أو كتاب مرجعي",
  summary: "ملخصات أو جداول",
  questions: "نماذج وبنك أسئلة",
  lab: "ملحق عملي",
  other: "محتوى إضافي آخر"
};

function cleanText(val, maxLen = 500) {
  return String(val ?? "").trim().slice(0, maxLen);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeTelegramUrl(raw) {
  const trimmed = cleanText(raw, 400);
  if (!trimmed) return "";
  if (/^(?:t\.me|telegram\.me)\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
  return { url, key };
}

async function insertSupabaseRow(table, row) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return { saved: false, id: null, reason: "supabase_not_configured" };
  }
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return { saved: false, id: null, reason: `supabase_http_${res.status}`, detail: errText.slice(0, 240) };
  }
  const data = await res.json().catch(() => []);
  const inserted = Array.isArray(data) ? data[0] : data;
  return { saved: true, id: inserted?.id || null };
}

async function sendTelegramAlert(htmlMessage) {
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = (process.env.TELEGRAM_ADMIN_CHAT_ID || "").trim();
  if (!botToken || !chatId) {
    return { sent: false, reason: "telegram_not_configured" };
  }
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: htmlMessage,
      parse_mode: "HTML",
      disable_web_page_preview: false
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return { sent: false, reason: `telegram_http_${res.status}`, detail: errText.slice(0, 200) };
  }
  return { sent: true };
}

function buildAdminLink(req, pageUrl) {
  try {
    if (pageUrl && /^https?:\/\//i.test(pageUrl)) {
      const parsed = new URL(pageUrl);
      return `${parsed.origin}/#admin`;
    }
  } catch {}
  const host = req.headers?.host;
  return host ? `https://${host}/#admin` : "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON payload" });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "Missing request body" });
  }

  // Anti-spam honeypot
  if (cleanText(body.website, 50)) {
    return res.status(200).json({ ok: true, id: "accepted" });
  }

  const kind = cleanText(body.kind, 32);
  const adminUrl = buildAdminLink(req, cleanText(body.page_url, 400));

  if (kind === "report") {
    const subjectCode = cleanText(body.subject_code, 32);
    const subjectName = cleanText(body.subject_name, 140);
    const viewType = cleanText(body.view_type, 32) || "slides";
    const itemRef = cleanText(body.item_ref, 80);
    const itemLabel = cleanText(body.item_label, 180);
    const issueType = cleanText(body.issue_type, 32);
    const description = cleanText(body.description, 1500);
    const pageUrl = cleanText(body.page_url, 400);
    const reporterName = cleanText(body.reporter_name, 80);

    if (!subjectCode || !ALLOWED_ISSUE_TYPES.has(issueType)) {
      return res.status(400).json({ ok: false, error: "بيانات البلاغ غير مكتملة." });
    }
    if (issueType === "other" && description.length < 4) {
      return res.status(400).json({ ok: false, error: "يرجى كتابة وصف مختصر للمشكلة." });
    }

    const row = {
      subject_code: subjectCode,
      subject_name: subjectName || subjectCode.toUpperCase(),
      view_type: viewType,
      item_ref: itemRef,
      item_label: itemLabel,
      issue_type: issueType,
      description,
      page_url: pageUrl,
      reporter_name: reporterName,
      status: "pending"
    };

    const lines = [
      `<b>[بلاغ خطأ في المنصة]</b>`,
      `<b>المادة:</b> ${escapeHtml(row.subject_name)} (${escapeHtml(row.subject_code.toUpperCase())})`,
      `<b>النوع:</b> ${escapeHtml(ISSUE_LABELS[issueType] || issueType)}`
    ];
    if (itemRef || itemLabel) {
      lines.push(`<b>الموضع:</b> ${escapeHtml([itemRef, itemLabel].filter(Boolean).join(" — "))}`);
    }
    if (description) {
      lines.push(`<b>التفاصيل:</b> ${escapeHtml(description)}`);
    }
    if (reporterName) {
      lines.push(`<b>المُبلّغ:</b> ${escapeHtml(reporterName)}`);
    }
    if (pageUrl && /^https?:\/\//i.test(pageUrl)) {
      lines.push(`<a href="${escapeHtml(pageUrl)}">فتح الموضع مباشرة</a>`);
    }
    if (adminUrl) {
      lines.push(`<a href="${escapeHtml(adminUrl)}">لوحة المراجعة والموافقة</a>`);
    }

    const [dbRes, tgRes] = await Promise.all([
      insertSupabaseRow("content_reports", row),
      sendTelegramAlert(lines.join("\n"))
    ]);

    if (!dbRes.saved && !tgRes.sent) {
      return res.status(503).json({
        ok: false,
        error: "خدمة استلام البلاغات غير مفعّلة بعد على السيرفر (يرجى ربط Supabase أو بوت تيليجرام)."
      });
    }

    return res.status(200).json({
      ok: true,
      id: dbRes.id,
      savedToDb: dbRes.saved,
      sentToTelegram: tgRes.sent
    });
  }

  if (kind === "subject_request") {
    const requestKind = cleanText(body.request_kind, 32);
    const targetSubjectCode = cleanText(body.target_subject_code, 32);
    const subjectNameAr = cleanText(body.subject_name_ar, 160);
    const professorName = cleanText(body.professor_name, 120);
    const termRaw = Number(body.term);
    const term = termRaw === 1 ? 1 : 2;
    const contentType = cleanText(body.content_type, 32) || "full_course";
    const telegramUrl = normalizeTelegramUrl(body.telegram_url);
    const notes = cleanText(body.notes, 1500);
    const requesterName = cleanText(body.requester_name, 80);

    if (!ALLOWED_REQUEST_KINDS.has(requestKind)) {
      return res.status(400).json({ ok: false, error: "نوع الطلب غير صالح." });
    }
    if (subjectNameAr.length < 2) {
      return res.status(400).json({ ok: false, error: "يرجى تحديد اسم المادة المطلوبة." });
    }
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return res.status(400).json({ ok: false, error: "نوع المحتوى غير صالح." });
    }
    if (!TELEGRAM_POST_RE.test(telegramUrl)) {
      return res.status(400).json({
        ok: false,
        error: "يجب إدخال رابط منشور تيليجرام صالح (مثال: https://t.me/channel/123)."
      });
    }

    const row = {
      request_kind: requestKind,
      target_subject_code: requestKind === "add_to_subject" ? targetSubjectCode : "",
      subject_name_ar: subjectNameAr,
      professor_name: professorName,
      term,
      content_type: contentType,
      telegram_url: telegramUrl,
      notes,
      requester_name: requesterName,
      status: "pending"
    };

    const heading =
      requestKind === "new_subject"
        ? "[طلب تحويل منشور إلى مادة جديدة]"
        : "[طلب إضافة محتوى لمادة موجودة]";

    const lines = [
      `<b>${heading}</b>`,
      `<b>المادة:</b> ${escapeHtml(subjectNameAr)}${targetSubjectCode ? ` (${escapeHtml(targetSubjectCode.toUpperCase())})` : ""}`,
      `<b>المحتوى:</b> ${escapeHtml(CONTENT_LABELS[contentType] || contentType)} · الفصل ${term}`
    ];
    if (professorName) {
      lines.push(`<b>الأستاذ:</b> ${escapeHtml(professorName)}`);
    }
    lines.push(`<b>رابط تيليجرام:</b> <a href="${escapeHtml(telegramUrl)}">${escapeHtml(telegramUrl)}</a>`);
    if (notes) {
      lines.push(`<b>ملاحظات:</b> ${escapeHtml(notes)}`);
    }
    if (requesterName) {
      lines.push(`<b>مقدم الطلب:</b> ${escapeHtml(requesterName)}`);
    }
    if (adminUrl) {
      lines.push(`<a href="${escapeHtml(adminUrl)}">مراجعة الطلب والموافقة عليه</a>`);
    }

    const [dbRes, tgRes] = await Promise.all([
      insertSupabaseRow("subject_requests", row),
      sendTelegramAlert(lines.join("\n"))
    ]);

    if (!dbRes.saved && !tgRes.sent) {
      return res.status(503).json({
        ok: false,
        error: "خدمة استلام الطلبات غير مفعّلة بعد على السيرفر (يرجى ربط Supabase أو بوت تيليجرام)."
      });
    }

    return res.status(200).json({
      ok: true,
      id: dbRes.id,
      savedToDb: dbRes.saved,
      sentToTelegram: tgRes.sent
    });
  }

  return res.status(400).json({ ok: false, error: "نوع العملية غير مدعوم." });
}

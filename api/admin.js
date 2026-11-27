// ==============================================================================
// المنصة التعليمية الموحدة — Vercel Serverless API للوحة المراجعة والموافقة السرية
// GET /api/admin  -> Fetch pending/all subject_requests & content_reports
// PATCH /api/admin -> Approve / Reject / Resolve submission with admin note
// ==============================================================================

import crypto from "crypto";

const VALID_TABLES = {
  content_reports: new Set(["pending", "in_progress", "resolved", "dismissed"]),
  subject_requests: new Set(["pending", "approved", "completed", "rejected"])
};

function isValidSecret(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided), "utf8");
  const b = Buffer.from(String(expected), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getEnvConfig() {
  const adminSecret = (process.env.ADMIN_PANEL_SECRET || "").trim();
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const telegramReady = Boolean(
    (process.env.TELEGRAM_BOT_TOKEN || "").trim() &&
      (process.env.TELEGRAM_ADMIN_CHAT_ID || "").trim()
  );
  return { adminSecret, supabaseUrl, serviceKey, telegramReady };
}

async function fetchTable(supabaseUrl, serviceKey, table) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?select=*&order=created_at.desc&limit=120`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${table} error (${res.status}): ${text.slice(0, 180)}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const { adminSecret, supabaseUrl, serviceKey, telegramReady } = getEnvConfig();
  const supabaseReady = Boolean(supabaseUrl && serviceKey);

  if (!adminSecret) {
    return res.status(503).json({
      ok: false,
      configured: false,
      supabaseReady,
      telegramReady,
      error: "لم يتم ضبط متغير ADMIN_PANEL_SECRET في إعدادات Vercel بعد."
    });
  }

  const provided = String(req.headers["x-admin-secret"] || "").trim();
  if (!isValidSecret(provided, adminSecret)) {
    return res.status(401).json({
      ok: false,
      configured: true,
      error: "رمز المشرف غير صحيح."
    });
  }

  if (!supabaseReady) {
    return res.status(503).json({
      ok: false,
      configured: true,
      supabaseReady: false,
      telegramReady,
      error: "يلزم إضافة SUPABASE_SERVICE_ROLE_KEY في Vercel وتشغيل community_submissions.sql في Supabase."
    });
  }

  if (req.method === "GET") {
    try {
      const [reports, requests] = await Promise.all([
        fetchTable(supabaseUrl, serviceKey, "content_reports"),
        fetchTable(supabaseUrl, serviceKey, "subject_requests")
      ]);
      return res.status(200).json({
        ok: true,
        configured: true,
        supabaseReady: true,
        telegramReady,
        reports: Array.isArray(reports) ? reports : [],
        requests: Array.isArray(requests) ? requests : []
      });
    } catch (err) {
      return res.status(502).json({
        ok: false,
        configured: true,
        supabaseReady: false,
        telegramReady,
        error: err instanceof Error ? err.message : "تعذر قراءة البيانات من Supabase."
      });
    }
  }

  if (req.method === "PATCH") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ ok: false, error: "Invalid JSON payload" });
      }
    }
    const table = String(body?.table || "").trim();
    const id = String(body?.id || "").trim();
    const status = String(body?.status || "").trim();
    const adminNote = String(body?.admin_note ?? "").trim().slice(0, 600);

    const allowedStatuses = VALID_TABLES[table];
    if (!allowedStatuses || !id || !allowedStatuses.has(status)) {
      return res.status(400).json({ ok: false, error: "معاملات التحديث غير صالحة." });
    }

    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          status,
          admin_note: adminNote,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => "");
      return res.status(502).json({
        ok: false,
        error: `تعذر تحديث الحالة (${patchRes.status}): ${text.slice(0, 160)}`
      });
    }

    const updated = await patchRes.json().catch(() => []);
    return res.status(200).json({
      ok: true,
      record: Array.isArray(updated) ? updated[0] : updated
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

// ==============================================================================
// المنصة التعليمية الموحدة — لوحة المراجعة والموافقة السرية للمشرف (Admin Panel)
// Protected via Server-Side Secret · Approve Subject Requests · Resolve Reports
// ==============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import {
  fetchAdminSubmissions,
  updateAdminSubmission,
  type ContentReportRecord,
  type SubjectRequestRecord
} from "../../lib/submissionsService";

interface AdminReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToReportedItem?: (subjectCode: string, viewType: string, itemRef?: string) => void;
}

const SESSION_KEY = "usp_admin_session_secret";

const REPORT_STATUS_LABELS: Record<ContentReportRecord["status"], string> = {
  pending: "جديد",
  in_progress: "قيد الإصلاح",
  resolved: "تم الإصلاح",
  dismissed: "تم التجاهل"
};

const REQUEST_STATUS_LABELS: Record<SubjectRequestRecord["status"], string> = {
  pending: "بانتظار الموافقة",
  approved: "تمت الموافقة",
  completed: "تمت الإضافة",
  rejected: "مرفوض"
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  translation: "ترجمة",
  explanation: "شرح",
  answer: "سؤال/إجابة",
  image: "صورة",
  other: "أخرى"
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  full_course: "مادة كاملة",
  slides: "سلايدات/كتاب",
  summary: "ملخصات",
  questions: "بنك أسئلة",
  lab: "عملي",
  other: "محتوى إضافي"
};

export const AdminReviewModal: React.FC<AdminReviewModalProps> = ({
  isOpen,
  onClose,
  onJumpToReportedItem
}) => {
  const [secret, setSecret] = useState<string>(() => sessionStorage.getItem(SESSION_KEY) || "");
  const [secretInput, setSecretInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMeta, setStatusMeta] = useState<{ telegramReady?: boolean; supabaseReady?: boolean }>({});
  const [tab, setTab] = useState<"requests" | "reports">("requests");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending">("pending");
  const [requests, setRequests] = useState<SubjectRequestRecord[]>([]);
  const [reports, setReports] = useState<ContentReportRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async (token: string) => {
    if (!token.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    const res = await fetchAdminSubmissions(token.trim());
    setLoading(false);
    setStatusMeta({ telegramReady: res.telegramReady, supabaseReady: res.supabaseReady });

    if (!res.ok) {
      setAuthenticated(false);
      setErrorMsg(res.error || "تعذر الدخول للوحة المشرف.");
      if (res.configured && res.error?.includes("غير صحيح")) {
        sessionStorage.removeItem(SESSION_KEY);
        setSecret("");
      }
      return;
    }

    sessionStorage.setItem(SESSION_KEY, token.trim());
    setSecret(token.trim());
    setAuthenticated(true);
    setRequests(res.requests);
    setReports(res.reports);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (secret) {
      loadData(secret);
    }
  }, [isOpen, secret, loadData]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(secretInput);
  };

  const handleUpdate = async (
    table: "subject_requests" | "content_reports",
    id: string,
    status: string
  ) => {
    if (!secret || busyId) return;
    setBusyId(id);
    const res = await updateAdminSubmission(secret, { table, id, status });
    setBusyId(null);
    if (!res.ok) {
      setErrorMsg(res.error || "تعذر تحديث الحالة.");
      return;
    }
    if (table === "subject_requests") {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: status as SubjectRequestRecord["status"] } : r))
      );
    } else {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: status as ContentReportRecord["status"] } : r))
      );
    }
  };

  const pendingRequestsCount = requests.filter((r) => r.status === "pending").length;
  const pendingReportsCount = reports.filter((r) => r.status === "pending").length;

  const visibleRequests =
    statusFilter === "pending" ? requests.filter((r) => r.status === "pending") : requests;
  const visibleReports =
    statusFilter === "pending" ? reports.filter((r) => r.status === "pending") : reports;

  return (
    <div
      id="adminReviewModal"
      className="usp-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="لوحة المراجعة والموافقة للمشرف"
      onClick={onClose}
    >
      <div className="card usp-modal-card usp-admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usp-sub-head">
          <div className="usp-sub-title-wrap">
            <span className="usp-sub-icon is-acc">
              <Icons.Shield size={18} />
            </span>
            <div>
              <h2>لوحة المراجعة والموافقة (المشرف)</h2>
              <p>مراجعة طلبات إضافة المواد من تيليجرام ومعالجة بلاغات الأخطاء بشكل خاص.</p>
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="إغلاق">
            <Icons.Cross size={16} />
          </button>
        </div>

        {!authenticated ? (
          <form onSubmit={handleLogin} className="usp-sub-form" style={{ maxWidth: 420, margin: "12px auto" }}>
            <div className="usp-field">
              <label htmlFor="adminSecretInput">رمز الدخول السري (ADMIN_PANEL_SECRET)</label>
              <input
                id="adminSecretInput"
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="أدخل رمز المشرف..."
                autoFocus
                required
              />
            </div>

            {errorMsg && (
              <div className="usp-sub-error" role="alert">
                <Icons.Alert size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="usp-sub-actions">
              <button type="button" className="btn btn-sm" onClick={onClose}>
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                <Icons.Shield size={14} />
                <span>{loading ? "جارٍ التحقق..." : "فتح اللوحة"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="usp-admin-body">
            <div className="usp-admin-toolbar">
              <div className="usp-kind-tabs" style={{ flex: "1 1 auto" }}>
                <button
                  type="button"
                  className={`usp-kind-tab ${tab === "requests" ? "active" : ""}`}
                  onClick={() => setTab("requests")}
                >
                  <span>طلبات المواد ({pendingRequestsCount} جديد / {requests.length})</span>
                </button>
                <button
                  type="button"
                  className={`usp-kind-tab ${tab === "reports" ? "active" : ""}`}
                  onClick={() => setTab("reports")}
                >
                  <span>بلاغات الأخطاء ({pendingReportsCount} جديد / {reports.length})</span>
                </button>
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`fchip ${statusFilter === "pending" ? "on" : ""}`}
                  onClick={() => setStatusFilter("pending")}
                >
                  المعلقة فقط
                </button>
                <button
                  type="button"
                  className={`fchip ${statusFilter === "all" ? "on" : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  الكل
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => loadData(secret)}
                  disabled={loading}
                  title="تحديث القائمة"
                >
                  <Icons.Rotate size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    sessionStorage.removeItem(SESSION_KEY);
                    setSecret("");
                    setSecretInput("");
                    setAuthenticated(false);
                  }}
                >
                  خروج
                </button>
              </div>
            </div>

            <div className="usp-admin-health">
              <span className={`usp-health-dot ${statusMeta.supabaseReady ? "is-ok" : "is-warn"}`}>
                Supabase: {statusMeta.supabaseReady ? "متصل" : "غير مضبوط"}
              </span>
              <span className={`usp-health-dot ${statusMeta.telegramReady ? "is-ok" : "is-warn"}`}>
                إشعارات تيليجرام: {statusMeta.telegramReady ? "مفعّلة" : "غير مضبوطة بعد"}
              </span>
            </div>

            {errorMsg && (
              <div className="usp-sub-error" role="alert">
                <Icons.Alert size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {tab === "requests" ? (
              visibleRequests.length === 0 ? (
                <div className="usp-admin-empty">لا توجد طلبات مواد في هذا التصنيف حالياً.</div>
              ) : (
                <div className="usp-admin-list">
                  {visibleRequests.map((req) => (
                    <div key={req.id} className="usp-admin-item">
                      <div className="usp-admin-item-head">
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span className={`usp-status-pill is-${req.status}`}>
                            {REQUEST_STATUS_LABELS[req.status]}
                          </span>
                          <span className="usp-ctx-chip">
                            {req.request_kind === "new_subject" ? "مادة جديدة" : "إضافة لمادة"}
                          </span>
                          <span className="usp-ctx-chip is-muted">
                            {CONTENT_TYPE_LABELS[req.content_type] || req.content_type} · ترم {req.term}
                          </span>
                        </div>
                        <span className="usp-admin-date">
                          {new Date(req.created_at).toLocaleString("ar-EG")}
                        </span>
                      </div>

                      <div className="usp-admin-title">
                        {req.subject_name_ar}
                        {req.professor_name ? ` — ${req.professor_name}` : ""}
                      </div>

                      <a
                        href={req.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="usp-admin-link"
                        dir="ltr"
                      >
                        <Icons.Jump size={13} />
                        <span>{req.telegram_url}</span>
                      </a>

                      {req.notes && <p className="usp-admin-desc">{req.notes}</p>}
                      {req.requester_name && (
                        <div className="usp-admin-meta">مقدم الطلب: {req.requester_name}</div>
                      )}

                      <div className="usp-admin-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={busyId === req.id}
                          onClick={() => handleUpdate("subject_requests", req.id, "approved")}
                        >
                          <Icons.Check size={13} />
                          <span>موافقة</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busyId === req.id}
                          onClick={() => handleUpdate("subject_requests", req.id, "completed")}
                        >
                          <span>تمت الإضافة</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busyId === req.id}
                          onClick={() => handleUpdate("subject_requests", req.id, "rejected")}
                        >
                          <Icons.Cross size={13} />
                          <span>رفض</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : visibleReports.length === 0 ? (
              <div className="usp-admin-empty">لا توجد بلاغات أخطاء في هذا التصنيف حالياً.</div>
            ) : (
              <div className="usp-admin-list">
                {visibleReports.map((rep) => (
                  <div key={rep.id} className="usp-admin-item">
                    <div className="usp-admin-item-head">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span className={`usp-status-pill is-${rep.status}`}>
                          {REPORT_STATUS_LABELS[rep.status]}
                        </span>
                        <span className="usp-ctx-chip">{rep.subject_name || rep.subject_code.toUpperCase()}</span>
                        <span className="usp-ctx-chip is-muted">
                          {ISSUE_TYPE_LABELS[rep.issue_type] || rep.issue_type}
                        </span>
                        {rep.item_ref && <span className="usp-ctx-chip is-ref">{rep.item_ref}</span>}
                      </div>
                      <span className="usp-admin-date">
                        {new Date(rep.created_at).toLocaleString("ar-EG")}
                      </span>
                    </div>

                    {rep.item_label && <div className="usp-admin-title">{rep.item_label}</div>}
                    {rep.description && <p className="usp-admin-desc">{rep.description}</p>}
                    {rep.reporter_name && (
                      <div className="usp-admin-meta">المُبلّغ: {rep.reporter_name}</div>
                    )}

                    <div className="usp-admin-actions">
                      {onJumpToReportedItem && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            onClose();
                            onJumpToReportedItem(rep.subject_code, rep.view_type, rep.item_ref);
                          }}
                        >
                          <Icons.Jump size={13} />
                          <span>فتح الموضع</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={busyId === rep.id}
                        onClick={() => handleUpdate("content_reports", rep.id, "resolved")}
                      >
                        <Icons.Check size={13} />
                        <span>تم الإصلاح</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busyId === rep.id}
                        onClick={() => handleUpdate("content_reports", rep.id, "in_progress")}
                      >
                        <span>قيد المعالجة</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busyId === rep.id}
                        onClick={() => handleUpdate("content_reports", rep.id, "dismissed")}
                      >
                        <span>تجاهل</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

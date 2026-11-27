// ==============================================================================
// المنصة التعليمية الموحدة — نافذة الإبلاغ عن خطأ في الترجمة أو الشرح أو المحتوى
// Unobtrusive · Context-Aware (Auto Subject/Slide/Question Ref) · Zero Emojis
// ==============================================================================

import React, { useEffect, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import {
  submitContentReport,
  type ReportContext,
  type ReportIssueType
} from "../../lib/submissionsService";

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: ReportContext | null;
  onSuccessToast?: (msg: string) => void;
}

const ISSUE_OPTIONS: Array<{ id: ReportIssueType; label: string; hint: string }> = [
  { id: "translation", label: "خطأ في الترجمة", hint: "ترجمة غير دقيقة أو نص متداخل" },
  { id: "explanation", label: "خطأ في الشرح", hint: "شرح ناقص أو معلومة بحاجة لتعديل" },
  { id: "answer", label: "خطأ في سؤال / إجابة", hint: "إجابة نموذجية خاطئة أو خيار مكرر" },
  { id: "image", label: "صورة غير واضحة", hint: "صفحة مقطوعة أو غير محمّلة" },
  { id: "other", label: "مشكلة أخرى", hint: "خلل تقني أو اقتراح تحسين" }
];

const VIEW_LABELS: Record<string, string> = {
  slides: "الشرائح / الكتاب",
  summary: "الملخص النظري",
  emergency: "ملخص الملخص",
  tables: "جداول المقارنة",
  questions: "بنك الأسئلة",
  explorer: "المستكشف",
  exam: "محاكي الاختبار",
  definitions: "بنك التعاريف",
  glossary: "المعجم",
  patterns: "أنماط الأسئلة",
  lab: "الملحق العملي",
  interactive: "التفاعلي"
};

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  context,
  onSuccessToast
}) => {
  const [issueType, setIssueType] = useState<ReportIssueType>("translation");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIssueType(context?.defaultIssueType || (context?.viewType === "questions" ? "answer" : "translation"));
    setDescription("");
    setWebsite("");
    setErrorMsg(null);
    setSubmitted(false);
    setSubmitting(false);
  }, [isOpen, context]);

  if (!isOpen || !context) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (issueType === "other" && description.trim().length < 4) {
      setErrorMsg("يرجى كتابة وصف مختصر للمشكلة حتى نتمكن من إصلاحها.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await submitContentReport({
      subject_code: context.subjectCode,
      subject_name: context.subjectName,
      view_type: context.viewType,
      item_ref: context.itemRef || "",
      item_label: context.itemLabel || "",
      issue_type: issueType,
      description: description.trim(),
      page_url: window.location.href,
      reporter_name: reporterName.trim(),
      website
    });

    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || "تعذر إرسال البلاغ حالياً. يرجى المحاولة مجدداً.");
      return;
    }

    setSubmitted(true);
    onSuccessToast?.("شكراً لك! تم استلام بلاغك وسيتم مراجعته وإصلاحه.");
  };

  return (
    <div
      id="reportIssueModal"
      className="usp-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="الإبلاغ عن خطأ في المحتوى"
      onClick={onClose}
    >
      <div className="card usp-modal-card usp-submission-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usp-sub-head">
          <div className="usp-sub-title-wrap">
            <span className="usp-sub-icon is-warn">
              <Icons.Flag size={18} />
            </span>
            <div>
              <h2>الإبلاغ عن خطأ أو ملاحظة</h2>
              <p>ساعدنا في رفع دقة الترجمة والشرح — يُرسل البلاغ مباشرة للمشرف.</p>
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="إغلاق">
            <Icons.Cross size={16} />
          </button>
        </div>

        {/* شريط السياق الملتقط تلقائياً */}
        <div className="usp-sub-context">
          <span className="usp-ctx-chip">{context.subjectName}</span>
          <span className="usp-ctx-chip is-muted">{VIEW_LABELS[context.viewType] || context.viewType}</span>
          {context.itemRef && <span className="usp-ctx-chip is-ref">{context.itemRef}</span>}
          {context.itemLabel && (
            <span className="usp-ctx-label" title={context.itemLabel}>
              {context.itemLabel}
            </span>
          )}
        </div>

        {submitted ? (
          <div className="usp-sub-success">
            <div className="usp-sub-success-ic">
              <Icons.Check size={24} />
            </div>
            <h3>تم استلام بلاغك بنجاح</h3>
            <p>شكراً لمساهمتك في تحسين المنصة. تم تسجيل الموضع تلقائياً وسيتم فحصه وتصحيحه في أقرب وقت.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              إغلاق والعودة للمذاكرة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="usp-sub-form">
            {/* حقل مخفي لمنع السبام */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0 }}
            />

            <div className="usp-field">
              <label>نوع الخطأ أو الملاحظة</label>
              <div className="usp-issue-grid">
                {ISSUE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`usp-issue-opt ${issueType === opt.id ? "active" : ""}`}
                    onClick={() => setIssueType(opt.id)}
                  >
                    <b>{opt.label}</b>
                    <span>{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="usp-field">
              <label htmlFor="reportDescInput">
                تفاصيل الخطأ {issueType === "other" ? "(مطلوب)" : "(اختياري — لكن يساعدنا كثيراً)"}
              </label>
              <textarea
                id="reportDescInput"
                rows={3}
                maxLength={1500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: الجملة الثانية في الشريحة مترجمة بشكل خاطئ، أو الإجابة الصحيحة هي B بدلاً من C..."
              />
            </div>

            <div className="usp-field">
              <label htmlFor="reportNameInput">اسمك أو معرّف تيليجرام (اختياري)</label>
              <input
                id="reportNameInput"
                type="text"
                maxLength={80}
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="اختياري — للتواصل معك إن لزم"
              />
            </div>

            {errorMsg && (
              <div className="usp-sub-error" role="alert">
                <Icons.Alert size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="usp-sub-actions">
              <button type="button" className="btn btn-sm" onClick={onClose} disabled={submitting}>
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                <Icons.Send size={14} />
                <span>{submitting ? "جارٍ الإرسال..." : "إرسال البلاغ"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

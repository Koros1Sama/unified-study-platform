// ==============================================================================
// المنصة التعليمية الموحدة — نافذة طلب إضافة مادة جديدة أو محتوى عبر رابط تيليجرام
// Mandatory Telegram Post Link · Admin Approval Queue · Zero Emojis
// ==============================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import {
  submitSubjectRequest,
  validateTelegramPostUrl,
  type SubjectContentType,
  type SubjectRequestKind
} from "../../lib/submissionsService";
import type { SubjectMeta } from "../../types";

interface RequestSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectMeta[];
  currentSubjectCode: string;
  onSuccessToast?: (msg: string) => void;
}

const CONTENT_TYPE_OPTIONS: Array<{ id: SubjectContentType; label: string }> = [
  { id: "slides", label: "سلايدات / كتاب مرجعي" },
  { id: "summary", label: "ملخصات أو جداول" },
  { id: "questions", label: "نماذج وبنك أسئلة" },
  { id: "lab", label: "ملحق عملي" },
  { id: "other", label: "محتوى إضافي آخر" }
];

export const RequestSubjectModal: React.FC<RequestSubjectModalProps> = ({
  isOpen,
  onClose,
  subjects,
  currentSubjectCode,
  onSuccessToast
}) => {
  const [requestKind, setRequestKind] = useState<SubjectRequestKind>("new_subject");
  const [targetCode, setTargetCode] = useState<string>(currentSubjectCode);
  const [subjectNameAr, setSubjectNameAr] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [term, setTerm] = useState<number>(2);
  const [contentType, setContentType] = useState<SubjectContentType>("slides");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTargetCode(currentSubjectCode || subjects[0]?.code || "");
    setErrorMsg(null);
    setSubmitted(false);
    setSubmitting(false);
    setWebsite("");
  }, [isOpen, currentSubjectCode, subjects]);

  const tgValidation = useMemo(() => validateTelegramPostUrl(telegramUrl), [telegramUrl]);

  if (!isOpen) return null;

  const selectedExisting = subjects.find((s) => s.code === targetCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const finalSubjectName =
      requestKind === "add_to_subject"
        ? selectedExisting?.name_ar || targetCode
        : subjectNameAr.trim();

    if (finalSubjectName.length < 2) {
      setErrorMsg("يرجى إدخال اسم المادة المطلوبة.");
      return;
    }

    if (!tgValidation.valid) {
      setErrorMsg(tgValidation.error || "يجب إدخال رابط منشور تيليجرام صالح.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await submitSubjectRequest({
      request_kind: requestKind,
      target_subject_code: requestKind === "add_to_subject" ? targetCode : "",
      subject_name_ar: finalSubjectName,
      professor_name:
        requestKind === "add_to_subject"
          ? selectedExisting?.professor_name || ""
          : professorName.trim(),
      term: requestKind === "add_to_subject" ? selectedExisting?.term || 2 : term,
      content_type: requestKind === "new_subject" ? "full_course" : contentType,
      telegram_url: tgValidation.normalized,
      notes: notes.trim(),
      requester_name: requesterName.trim(),
      page_url: window.location.href,
      website
    });

    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error || "تعذر إرسال الطلب حالياً. يرجى المحاولة مجدداً.");
      return;
    }

    setSubmitted(true);
    setSubjectNameAr("");
    setProfessorName("");
    setTelegramUrl("");
    setNotes("");
    onSuccessToast?.("تم إرسال طلبك بنجاح! سيراجعه المشرف ويوافق عليه قريباً.");
  };

  return (
    <div
      id="requestSubjectModal"
      className="usp-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="طلب إضافة مادة أو محتوى من تيليجرام"
      onClick={onClose}
    >
      <div className="card usp-modal-card usp-submission-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usp-sub-head">
          <div className="usp-sub-title-wrap">
            <span className="usp-sub-icon is-acc">
              <Icons.Plus size={18} />
            </span>
            <div>
              <h2>طلب إضافة مادة أو محتوى جديد</h2>
              <p>أرسل رابط منشور تيليجرام لتحويله إلى منهج كامل أو إضافته لمادة حالية بعد موافقة المشرف.</p>
            </div>
          </div>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="إغلاق">
            <Icons.Cross size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="usp-sub-success">
            <div className="usp-sub-success-ic">
              <Icons.Check size={24} />
            </div>
            <h3>تم إرسال طلبك للمراجعة</h3>
            <p>وصل رابط المنشور إلى المشرف وبانتظار الموافقة والتحويل. سيظهر المحتوى في المنصة فور اعتماده.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="usp-sub-form">
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

            {/* اختيار نوع الطلب: مادة جديدة أم إضافة لمادة موجودة */}
            <div className="usp-kind-tabs" role="tablist" aria-label="نوع الطلب">
              <button
                type="button"
                role="tab"
                aria-selected={requestKind === "new_subject"}
                className={`usp-kind-tab ${requestKind === "new_subject" ? "active" : ""}`}
                onClick={() => setRequestKind("new_subject")}
              >
                <Icons.BookOpen size={15} />
                <span>تحويل إلى مادة جديدة</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={requestKind === "add_to_subject"}
                className={`usp-kind-tab ${requestKind === "add_to_subject" ? "active" : ""}`}
                onClick={() => setRequestKind("add_to_subject")}
              >
                <Icons.Plus size={15} />
                <span>إضافة لمادة موجودة</span>
              </button>
            </div>

            {requestKind === "new_subject" ? (
              <div className="usp-sub-grid">
                <div className="usp-field">
                  <label htmlFor="reqSubjName">اسم المادة المطلوبة *</label>
                  <input
                    id="reqSubjName"
                    type="text"
                    required
                    maxLength={160}
                    value={subjectNameAr}
                    onChange={(e) => setSubjectNameAr(e.target.value)}
                    placeholder="مثال: نظم التشغيل / قواعد البيانات"
                  />
                </div>
                <div className="usp-field">
                  <label htmlFor="reqProfName">اسم أستاذ المقرر (اختياري)</label>
                  <input
                    id="reqProfName"
                    type="text"
                    maxLength={120}
                    value={professorName}
                    onChange={(e) => setProfessorName(e.target.value)}
                    placeholder="مثال: د. فلان الفلاني"
                  />
                </div>
                <div className="usp-field">
                  <label htmlFor="reqTerm">الفصل الدراسي</label>
                  <select id="reqTerm" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
                    <option value={1}>الفصل الأول (ترم 1)</option>
                    <option value={2}>الفصل الثاني (ترم 2)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="usp-sub-grid">
                <div className="usp-field">
                  <label htmlFor="reqTargetSubj">اختر المادة المراد الإضافة إليها *</label>
                  <select
                    id="reqTargetSubj"
                    value={targetCode}
                    onChange={(e) => setTargetCode(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name_ar} ({s.code.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="usp-field">
                  <label htmlFor="reqContentType">نوع المحتوى المضاف</label>
                  <select
                    id="reqContentType"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as SubjectContentType)}
                  >
                    {CONTENT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* حقل رابط منشور تيليجرام الإجباري */}
            <div className="usp-field">
              <label htmlFor="reqTelegramUrl">رابط منشور تيليجرام للمحتوى المطلوب *</label>
              <input
                id="reqTelegramUrl"
                type="url"
                dir="ltr"
                required
                maxLength={400}
                value={telegramUrl}
                onChange={(e) => setTelegramUrl(e.target.value)}
                placeholder="https://t.me/channel_name/1234"
                style={{ textAlign: "left", fontFamily: "var(--fm)" }}
              />
              <div className={`usp-tg-hint ${telegramUrl.trim() ? (tgValidation.valid ? "is-ok" : "is-bad") : ""}`}>
                {telegramUrl.trim() ? (
                  tgValidation.valid ? (
                    <>
                      <Icons.Check size={13} />
                      <span>رابط منشور تيليجرام صالح وجاهز للإرسال.</span>
                    </>
                  ) : (
                    <>
                      <Icons.Alert size={13} />
                      <span>{tgValidation.error}</span>
                    </>
                  )
                ) : (
                  <span>انسخ رابط المنشور مباشرة من تيليجرام (يدعم القنوات العامة والخاصة والمواضيع).</span>
                )}
              </div>
            </div>

            <div className="usp-sub-grid">
              <div className="usp-field">
                <label htmlFor="reqNotes">ملاحظات إضافية (اختياري)</label>
                <input
                  id="reqNotes"
                  type="text"
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: يشمل محاضرات L1 إلى L6 ونماذج العام الماضي"
                />
              </div>
              <div className="usp-field">
                <label htmlFor="reqRequester">اسمك أو معرّف تيليجرام (اختياري)</label>
                <input
                  id="reqRequester"
                  type="text"
                  maxLength={80}
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="اختياري"
                />
              </div>
            </div>

            <div className="usp-approval-note">
              <Icons.Shield size={15} />
              <span>يصل الطلب للمشرف للمراجعة والموافقة قبل تحويله ونشره في المنصة.</span>
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
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={submitting || !tgValidation.valid}
              >
                <Icons.Send size={14} />
                <span>{submitting ? "جارٍ الإرسال..." : "إرسال الطلب للموافقة"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

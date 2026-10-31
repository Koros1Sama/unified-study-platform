// ==============================================================================
// المنصة التعليمية الموحدة — الملحق العملي المعزول (Isolated Lab Appendix)
// Sec_Lab_Viewer data: sessions + slides. Never mixed with theory search/progress.
// Zero Emojis.
// ==============================================================================

import React, { useMemo, useState } from "react";
import { Icons } from "../icons/SvgIcons";
import { LightboxModal } from "../slides/LightboxModal";
import { resolveAssetUrl } from "../../lib/dataService";
import type { LabAppendix } from "../../types";

interface LabAppendixViewProps {
  data?: LabAppendix;
  subjectName?: string;
}

export const LabAppendixView: React.FC<LabAppendixViewProps> = ({ data, subjectName }) => {
  const [activeSession, setActiveSession] = useState<string>(() => data?.sessions?.[0]?.id || "all");
  const [query, setQuery] = useState("");
  const [showNotes, setShowNotes] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const sessions = data?.sessions || [];
  const slides = data?.slides || [];

  const filteredSlides = useMemo(() => {
    const q = query.trim().toLowerCase();
    return slides.filter((slide) => {
      if (activeSession !== "all" && slide.lecture_id !== activeSession) return false;
      if (!q) return true;
      return [slide.title, slide.content_ar, slide.content_en, slide.notes_ar, slide.ref]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [slides, activeSession, query]);

  if (!data || slides.length === 0) {
    return (
      <div className="pending-box" style={{ margin: "40px auto", maxWidth: 620 }}>
        <div className="pb-ic"><Icons.Lab size={34} /></div>
        <div className="pb-t">لا يوجد ملحق عملي منفصل لهذه المادة</div>
        <div className="pb-s">
          يُعزل الجانب العملي في ملحق مستقل حتى لا يزاحم مراجعة الاختبار النهائي النظري.
        </div>
      </div>
    );
  }

  const openSlide = (slideRef: string) => {
    const idx = filteredSlides.findIndex((slide) => slide.ref === slideRef);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setLightboxOpen(true);
    }
  };

  return (
    <div id="labView" className="lab-view">
      <div className="def-hero lab-hero">
        <div className="def-kicker">
          <span className="dot" />
          <span>ملحق معملي معزول تماماً عن النظري</span>
        </div>
        <h1 className="def-title">{data.title_ar || "الملحق العملي"}</h1>
        {data.sub_ar && <p className="def-sub">{data.sub_ar}</p>}

        <div className="def-hero-stats">
          <div className="def-stat"><b>{sessions.length}</b><span>جلسة عملية</span></div>
          <div className="def-stat"><b>{slides.length}</b><span>شريحة معملية</span></div>
          <div className="def-stat"><b>{data.professor_name || "—"}</b><span>المشرف العملي</span></div>
          <div className="def-stat"><b>{filteredSlides.length}</b><span>شريحة معروضة</span></div>
        </div>

        {data.external_url && (
          <a className="btn btn-sm lab-external" href={data.external_url} target="_blank" rel="noopener noreferrer">
            <Icons.Jump size={14} />
            <span>فتح عارض المعمل المستقل</span>
          </a>
        )}
      </div>

      <div className="lab-isolation-note">
        <Icons.Warning size={16} />
        <span>
          هذا الملحق للفهم والتطبيق العملي فقط ولا يدخل في نطاق البحث أو التقدم النظري للمادة
          {subjectName ? ` (${subjectName})` : ""}.
        </span>
      </div>

      <div className="def-toolbar">
        <div className="def-search">
          <Icons.Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في شروح المعمل، الأوامر، الأدوات، ومواضيع الجلسات..."
            aria-label="بحث المعمل"
          />
          {query && (
            <button type="button" className="def-search-clear" onClick={() => setQuery("")} aria-label="مسح البحث">
              <Icons.Cross size={15} />
            </button>
          )}
        </div>
        <div className="def-tool-actions">
          <button
            type="button"
            className={`fchip ${showNotes ? "on" : ""}`}
            onClick={() => setShowNotes(!showNotes)}
          >
            الشرح العملي
          </button>
        </div>
      </div>

      <div className="def-chips">
        <button
          type="button"
          className={`fchip ${activeSession === "all" ? "on" : ""}`}
          onClick={() => setActiveSession("all")}
        >
          كل الجلسات ({slides.length})
        </button>
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className={`fchip ${activeSession === session.id ? "on" : ""}`}
            onClick={() => setActiveSession(session.id)}
          >
            {session.id}: {session.title_ar} ({session.slides_count})
          </button>
        ))}
      </div>

      <div className="lab-grid">
        {filteredSlides.map((slide) => (
          <article key={slide.ref} className="lab-slide-card">
            <button
              type="button"
              className="lab-slide-img"
              onClick={() => openSlide(slide.ref)}
              title={`تكبير شريحة ${slide.ref}`}
            >
              <img src={resolveAssetUrl(slide.image_url)} alt={slide.ref} loading="lazy" />
            </button>
            <div className="lab-slide-body">
              <div className="lab-slide-head">
                <span className="slide-ref">{slide.ref}</span>
                <span className="lab-session-chip">{slide.lecture_id}</span>
              </div>
              <div className="lab-slide-title" dir="ltr">{slide.title}</div>
              {showNotes && slide.content_ar && (
                <div className="lab-slide-text">{slide.content_ar}</div>
              )}
              {showNotes && slide.notes_ar && (
                <div className="lab-slide-notes">
                  <strong>تطبيق عملي: </strong>
                  {slide.notes_ar}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <LightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        slides={filteredSlides}
        currentIndex={currentIndex}
        onNavigate={setCurrentIndex}
      />
    </div>
  );
};


// ==============================================================================
// المنصة التعليمية الموحدة — استوديوهات المفاهيم (Concept Studios)
// React-native simulators for SEC & SE: crypto, access control, malware,
// process-model selection, McCabe complexity, V&V and risk exposure.
// Zero Emojis · 100% SVG/CSS line-art.
// ==============================================================================

import React, { useMemo, useState } from "react";
import { Icons } from "../icons/SvgIcons";

interface ConceptStudiosProps {
  subjectCode: string;
  initialStudioId?: string;
  initialTabId?: string;
  onReturnToSummary?: () => void;
}

type StudioMeta = { id: string; title: string; desc: string; ref: string; tabs: string[] };

const SEC_STUDIOS: StudioMeta[] = [
  {
    id: "crypto_studio",
    title: "استوديو التشفير والتوقيع الرقمي",
    desc: "قيصر، تبادل مفتاح Diffie-Hellman، والتوقيع الرقمي مع محاكاة العبث والانتحال.",
    ref: "L4-S019",
    tabs: ["caesar", "dh", "signature"]
  },
  {
    id: "access_studio",
    title: "استوديو نماذج التحكم بالوصول",
    desc: "محاكي Bell-LaPadula و Biba: جرّب القراءة والكتابة واكتشف قاعدة NRU و NWD.",
    ref: "L3-S021",
    tabs: ["blp", "biba", "acm"]
  },
  {
    id: "malware_studio",
    title: "مختبر البرمجيات الخبيثة والذاكرة",
    desc: "مصفوفة تصنيف الفيروس/الدودة/حصان طروادة وبنية تجاوز سعة المخزن.",
    ref: "L5-S022",
    tabs: ["matrix", "stack"]
  }
];

const SE_STUDIOS: StudioMeta[] = [
  {
    id: "se_process",
    title: "مستشار نماذج العمليات",
    desc: "أدخل استقرار المتطلبات والمخاطر وحجم النظام لتحصل على النموذج الأنسب مع التعليل.",
    ref: "L2-S010",
    tabs: ["recommend"]
  },
  {
    id: "se_mccabe",
    title: "حاسبة التعقيد الدوري McCabe",
    desc: "احسب V(G) من عدد العقد والحواف والمكوّنات المتصلة، وصنّف خطر الدالة.",
    ref: "L8-S014",
    tabs: ["mccabe"]
  },
  {
    id: "se_verify",
    title: "استوديو Verification مقابل Validation",
    desc: "صنّف العبارات: هل تبني المنتج بطريقة صحيحة أم تبني المنتج الصحيح؟",
    ref: "L6-S008",
    tabs: ["verify"]
  },
  {
    id: "se_risk",
    title: "مصفوفة المخاطر الهندسية",
    desc: "حرك الاحتمالية والأثر لترى درجة التعرض للمخاطر وخطة التخفيف.",
    ref: "L5-S011",
    tabs: ["risk"]
  }
];

function caesar(text: string, shift: number): string {
  return text.replace(/[a-z]/gi, (char) => {
    const base = char <= "Z" ? 65 : 97;
    const code = char.charCodeAt(0) - base;
    return String.fromCharCode(((code + shift + 26) % 26) + base);
  });
}

function modPow(base: number, exp: number, mod: number): number {
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e = Math.floor(e / 2);
  }
  return result;
}

function hashPreview(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < text.length; i++) {
    h1 ^= text.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ text.charCodeAt(i), 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

const MALWARE_ROWS = [
  { type: "Virus", host: "نعم", spread: "يلحق نفسه بملف مضيف", behavior: "يتطلب تشغيل الملف المصاب", key: "Host + attachment" },
  { type: "Worm", host: "لا", spread: "ينتشر ذاتياً عبر الشبكة", behavior: "يستهلك النطاق ويصيب الأجهزة", key: "Self-replicating" },
  { type: "Trojan", host: "لا", spread: "يتخفى داخل برنامج شرعي", behavior: "باب خلفي أو سرقة بيانات", key: "Disguised" },
  { type: "Logic Bomb", host: "نعم", spread: "لا ينتشر", behavior: "ينفجر عند شرط زمني/حدثي", key: "Trigger condition" },
  { type: "Rootkit", host: "نعم", spread: "لا ينتشر", behavior: "يخفي وجود المهاجم والملفات", key: "Stealth / persistence" },
  { type: "Ransomware", host: "لا", spread: "تشفير وطلب فدية", behavior: "يعطل التوافر ويطلب دفعاً", key: "Encryption + extortion" }
];

function normalizeStudioForSubject(subjectCode: string, id?: string): string | undefined {
  if (!id) return undefined;
  const lower = id.toLowerCase();
  if (subjectCode === "sec") {
    if (lower.includes("crypto")) return "crypto_studio";
    if (lower.includes("model") || lower.includes("access")) return "access_studio";
    if (lower.includes("memory") || lower.includes("malware") || lower.includes("stack")) return "malware_studio";
    return undefined;
  }
  if (subjectCode === "se") {
    if (/l5|risk/.test(lower)) return "se_risk";
    if (/l6|verify|validation/.test(lower)) return "se_verify";
    if (/l8|mccabe|cyclomatic/.test(lower)) return "se_mccabe";
    return "se_process";
  }
  return undefined;
}

function normalizeTabForStudio(tab: string | undefined, tabs: string[]): string {
  if (!tab) return tabs[0] || "";
  const map: Record<string, string> = {
    "diffie-hellman": "dh",
    "digital-signature": "signature",
    "bell-lapadula": "blp",
    "acm-matrix": "acm",
    "buffer-overflow": "stack",
    "malware-matrix": "matrix"
  };
  const mapped = map[tab] || tab;
  return tabs.includes(mapped) ? mapped : tabs[0] || "";
}

export const ConceptStudios: React.FC<ConceptStudiosProps> = ({
  subjectCode,
  initialStudioId,
  initialTabId,
  onReturnToSummary
}) => {
  const studios = subjectCode === "sec" ? SEC_STUDIOS : subjectCode === "se" ? SE_STUDIOS : [];
  const normalizedId = normalizeStudioForSubject(subjectCode, initialStudioId);
  const initial = studios.find((studio) => studio.id === normalizedId) || studios[0];
  const initialTab = normalizeTabForStudio(initialTabId, initial?.tabs || []);
  const [activeStudio, setActiveStudio] = useState(initial?.id || "");
  const [activeTab, setActiveTab] = useState(initialTab);

  const current = studios.find((studio) => studio.id === activeStudio) || studios[0];

  if (!current) {
    return (
      <div className="pending-box" style={{ margin: "40px auto", maxWidth: 620 }}>
        <div className="pb-ic"><Icons.Interactive size={34} /></div>
        <div className="pb-t">لا توجد استوديوهات مفاهيم لهذه المادة</div>
        <div className="pb-s">تتوفر الاستوديوهات التفاعلية في التخصصات التي تحتوي على محاكيات معتمدة.</div>
      </div>
    );
  }

  return (
    <div id="conceptStudios">
      <div className="headline">
        <div className="kicker">
          <span className="dot" />
          <span>محاكيات تفاعلية مرتبطة بملخص المادة</span>
        </div>
        <h1>الاستوديوهات التفاعلية</h1>
        <p className="sub">
          جرّب المفاهيم بنفسك، راقب أثر تغيير المتغيرات، ثم عُد إلى الملخص في نفس الموضع.
        </p>
      </div>

      {onReturnToSummary && (
        <button type="button" className="ref-chip int-chip" style={{ marginBottom: 14 }} onClick={onReturnToSummary}>
          <Icons.ArrowRight size={13} />
          <span>العودة إلى الملخص</span>
        </button>
      )}

      <div className="studio-grid">
        {studios.map((studio) => (
          <button
            key={studio.id}
            type="button"
            className={`studio-card ${studio.id === activeStudio ? "active" : ""}`}
            onClick={() => {
              setActiveStudio(studio.id);
              setActiveTab(studio.tabs[0]);
            }}
          >
            <span className="studio-card-icon"><Icons.Interactive size={18} /></span>
            <span className="studio-card-title">{studio.title}</span>
            <span className="studio-card-desc">{studio.desc}</span>
            <span className="studio-card-ref">{studio.ref}</span>
          </button>
        ))}
      </div>

      <div className="card studio-stage">
        <div className="studio-stage-head">
          <div>
            <h2>{current.title}</h2>
            <p>{current.desc}</p>
          </div>
          <span className="ref-chip">{current.ref}</span>
        </div>

        <div className="int-tabs-bar studio-tabs">
          {current.tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`int-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {studioTabLabel(tab)}
            </button>
          ))}
        </div>

        {activeStudio === "crypto_studio" && activeTab === "caesar" && <CaesarStudio />}
        {activeStudio === "crypto_studio" && activeTab === "dh" && <DiffieHellmanStudio />}
        {activeStudio === "crypto_studio" && activeTab === "signature" && <SignatureStudio />}
        {activeStudio === "access_studio" && <AccessStudio mode={activeTab as "blp" | "biba"} />}
        {activeStudio === "malware_studio" && activeTab === "matrix" && <MalwareMatrix />}
        {activeStudio === "malware_studio" && activeTab === "stack" && <StackStudio />}
        {activeStudio === "se_process" && <ProcessStudio />}
        {activeStudio === "se_mccabe" && <McCabeStudio />}
        {activeStudio === "se_verify" && <VerifyStudio />}
        {activeStudio === "se_risk" && <RiskStudio />}
      </div>
    </div>
  );
};

function studioTabLabel(tab: string): string {
  const map: Record<string, string> = {
    caesar: "شفرة قيصر",
    dh: "تبادل المفتاح",
    signature: "التوقيع الرقمي",
    blp: "Bell-LaPadula",
    biba: "Biba",
    acm: "مصفوفة ACM",
    matrix: "مصفوفة البرمجيات",
    stack: "تجاوز المخزن",
    recommend: "التوصية",
    mccabe: "حاسبة McCabe",
    verify: "V & V",
    risk: "مصفوفة المخاطر"
  };
  return map[tab] || tab;
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  suffix
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <label className="studio-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <b dir="ltr">{value}{suffix || ""}</b>
    </label>
  );
}

function CaesarStudio() {
  const [text, setText] = useState("hello world");
  const [shift, setShift] = useState(3);
  const [decrypt, setDecrypt] = useState(false);
  const output = useMemo(() => caesar(text, decrypt ? -shift : shift), [text, shift, decrypt]);

  return (
    <div className="studio-body">
      <div className="studio-controls">
        <label className="studio-text">
          <span>النص الأصلي</span>
          <input value={text} onChange={(e) => setText(e.target.value)} dir="ltr" />
        </label>
        <Slider label="المفتاح (الإزاحة)" value={shift} min={0} max={25} onChange={setShift} />
        <div className="exam-pills">
          <button type="button" className={`fchip ${!decrypt ? "on" : ""}`} onClick={() => setDecrypt(false)}>تشفير</button>
          <button type="button" className={`fchip ${decrypt ? "on" : ""}`} onClick={() => setDecrypt(true)}>فك التشفير</button>
        </div>
      </div>

      <div className="studio-output">
        <span className="studio-output-label">الناتج</span>
        <div className="studio-output-value" dir="ltr">{output}</div>
        <div className="studio-note">
          فضاء المفاتيح لشفرة قيصر = 25 مفتاحاً فقط، لذلك تُكسر بالهجوم الشامل (Brute Force) خلال ثوانٍ.
        </div>
      </div>

      <div className="studio-brute">
        <div className="studio-brute-title">محاولات فك التشفير الممكنة</div>
        <div className="studio-brute-grid">
          {[1, 2, 3, 5, 8, 13].map((k) => (
            <div key={k} className="studio-brute-item">
              <span>مفتاح {k}</span>
              <code className="m-ltr">{caesar(output, -k)}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiffieHellmanStudio() {
  const [p, setP] = useState(23);
  const [g, setG] = useState(5);
  const [a, setA] = useState(6);
  const [b, setB] = useState(15);
  const [mitm, setMitm] = useState(false);
  const [mPrev, setMPrev] = useState(4);

  const A = modPow(g, a, p);
  const B = modPow(g, b, p);
  const sharedA = modPow(B, a, p);
  const sharedB = modPow(A, b, p);
  const mPubA = modPow(g, mPrev, p);
  const mitmSharedAlice = modPow(mPubA, a, p);
  const mitmSharedBob = modPow(mPubA, b, p);

  return (
    <div className="studio-body">
      <div className="dh-grid">
        <div className="dh-party">
          <h4>Alice — الخاص a</h4>
          <Slider label="المفتاح الخاص a" value={a} min={2} max={p - 2} onChange={setA} />
          <div className="dh-calc">A = g^a mod p = <code className="m-ltr">{A}</code></div>
          <div className="dh-shared">المفتاح المشترك = <code className="m-ltr">{mitm ? mitmSharedAlice : sharedA}</code></div>
        </div>
        <div className="dh-party">
          <h4>Bob — الخاص b</h4>
          <Slider label="المفتاح الخاص b" value={b} min={2} max={p - 2} onChange={setB} />
          <div className="dh-calc">B = g^b mod p = <code className="m-ltr">{B}</code></div>
          <div className="dh-shared">المفتاح المشترك = <code className="m-ltr">{mitm ? mitmSharedBob : sharedB}</code></div>
        </div>
      </div>

      <div className="studio-controls studio-inline">
        <Slider label="p" value={p} min={5} max={47} onChange={(n) => { setP(n); setA(Math.min(a, n - 2)); setB(Math.min(b, n - 2)); }} />
        <Slider label="g" value={g} min={2} max={Math.max(2, p - 1)} onChange={setG} />
        <button type="button" className={`fchip ${mitm ? "on" : ""}`} onClick={() => setMitm(!mitm)}>
          <Icons.Warning size={13} />
          تفعيل Man-in-the-Middle
        </button>
      </div>

      {mitm && (
        <div className="studio-warning">
          <Icons.Warning size={16} />
          <div>
            <b>هجوم الرجل في المنتصف:</b> يعترض المهاجم A و B ويستبدلهما بمفتاحه العام
            <code className="m-ltr" style={{ marginInline: 6 }}>{mPubA}</code>
            (خاصه m={mPrev}). لذلك يختلف المفتاح المشترك لدى الطرفين، ويلزم التصديق بالمفاتيح العامة.
            <div style={{ marginTop: 8 }}>
              <Slider label="مفتاح المهاجم m" value={mPrev} min={2} max={Math.max(2, p - 2)} onChange={setMPrev} />
            </div>
          </div>
        </div>
      )}

      {!mitm && (
        <div className="studio-note">
          المفتاح المشترك النهائي هو نفسه لدى الطرفين: <code className="m-ltr">{sharedA}</code>. القيمة العامة
          <code className="m-ltr" style={{ marginInline: 6 }}>A</code> و
          <code className="m-ltr" style={{ marginInline: 6 }}>B</code> تُرسل علناً، لكن حساب المفتاح يتطلب لوغاريتم
          متقطع صعب.
        </div>
      )}
    </div>
  );
}

function SignatureStudio() {
  const [message, setMessage] = useState("transfer 100");
  const [tampered, setTampered] = useState(false);
  const [impostor, setImpostor] = useState(false);

  const sent = tampered ? message.replace(/\d+/, (n) => String(Number(n) + 900)) : message;
  const trueHash = hashPreview(message);
  const receivedHash = hashPreview(sent);
  const signerKey = impostor ? "FAKE-PRIVATE-KEY" : "ALICE-PRIVATE-KEY";
  const verifyKey = impostor ? "ALICE-PUBLIC-KEY" : "ALICE-PUBLIC-KEY";
  const signatureValid = !impostor;
  const integrityValid = trueHash === receivedHash;
  const accepted = signatureValid && integrityValid;

  return (
    <div className="studio-body">
      <div className="sign-grid">
        <div className="studio-controls">
          <label className="studio-text">
            <span>الرسالة الأصلية</span>
            <input value={message} onChange={(e) => setMessage(e.target.value)} dir="ltr" />
          </label>
          <div className="exam-pills">
            <button type="button" className={`fchip ${tampered ? "on" : ""}`} onClick={() => setTampered(!tampered)}>
              <Icons.Warning size={13} /> العبث بالرسالة
            </button>
            <button type="button" className={`fchip ${impostor ? "on" : ""}`} onClick={() => setImpostor(!impostor)}>
              <Icons.Cross size={13} /> انتحال المرسل
            </button>
          </div>
        </div>

        <div className="sign-steps">
          <div className="sign-step">
            <span className="sign-step-num">1</span>
            <div>
              <b>Hash للرسالة المرسلة</b>
              <code className="m-ltr sign-hash">{receivedHash}</code>
            </div>
          </div>
          <div className="sign-step">
            <span className="sign-step-num">2</span>
            <div>
              <b>توقيع الهاش بالمفتاح الخاص</b>
              <code className="m-ltr sign-hash">{signerKey} → SIG</code>
            </div>
          </div>
          <div className="sign-step">
            <span className="sign-step-num">3</span>
            <div>
              <b>التحقق بالمفتاح العام</b>
              <code className="m-ltr sign-hash">{verifyKey} → {signatureValid ? "VALID" : "INVALID"}</code>
            </div>
          </div>
        </div>
      </div>

      <div className={`studio-result ${accepted ? "ok" : "err"}`}>
        <Icons.Check size={16} />
        <span>
          {accepted
            ? "قُبلت الرسالة: التوقيع صحيح والنزاهة محفوظة (Hash مطابق)."
            : !signatureValid
              ? "رُفضت الرسالة: المفتاح العام لا يطابق المفتاح الخاص المستخدم في التوقيع (انتحال)."
              : "رُفضت الرسالة: الهاش تغيّر بعد العبث، فكشف التحقق انتهاك النزاهة."}
        </span>
      </div>

      <div className="studio-note">
        التوقيع الرقمي يوفر المصادقة والنزاهة وعدم الإنكار، لكنه لا يوفر السرية وحده؛ السرية تحتاج تشفير الرسالة
        نفسها بمفتاح المستلم العام.
      </div>
    </div>
  );
}

function AccessStudio({ mode }: { mode: "blp" | "biba" | "acm" }) {
  if (mode === "acm") return <AcmStudio />;
  const levels = ["عام", "سري", "سري للغاية"];
  const [subjectLevel, setSubjectLevel] = useState(2);
  const [objectLevel, setObjectLevel] = useState(1);
  const [operation, setOperation] = useState<"read" | "write">("read");

  const noReadUp = subjectLevel >= objectLevel;
  const noWriteDown = subjectLevel <= objectLevel;
  const allowed = mode === "blp"
    ? operation === "read" ? noReadUp : noWriteDown
    : operation === "read" ? noWriteDown : noReadUp;

  return (
    <div className="studio-body">
      <div className="access-levels">
        {levels.map((level, idx) => (
          <div key={level} className={`access-level ${idx === subjectLevel ? "is-subject" : ""} ${idx === objectLevel ? "is-object" : ""}`}>
            <span className="access-level-num">{idx}</span>
            <span>{level}</span>
            <div className="access-markers">
              {idx === subjectLevel && <span>الذات</span>}
              {idx === objectLevel && <span>الكائن</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="studio-controls">
        <Slider label="مستوى تصريح الذات" value={subjectLevel} min={0} max={2} onChange={setSubjectLevel} />
        <Slider label="تصنيف الكائن" value={objectLevel} min={0} max={2} onChange={setObjectLevel} />
        <div className="exam-pills">
          <button type="button" className={`fchip ${operation === "read" ? "on" : ""}`} onClick={() => setOperation("read")}>قراءة (Read)</button>
          <button type="button" className={`fchip ${operation === "write" ? "on" : ""}`} onClick={() => setOperation("write")}>كتابة (Write)</button>
        </div>
      </div>

      <div className={`studio-result ${allowed ? "ok" : "err"}`}>
        {allowed ? <Icons.Check size={16} /> : <Icons.Cross size={16} />}
        <span>
          {mode === "blp" ? "Bell-LaPadula (السرية)" : "Biba (النزاهة)"}: العملية{" "}
          {allowed ? "مسموحة" : "مرفوضة"} —{" "}
          {mode === "blp"
            ? operation === "read"
              ? "قاعدة No Read Up: لا قراءة للأعلى."
              : "قاعدة No Write Down: لا كتابة للأسفل."
            : operation === "read"
              ? "قاعدة No Read Down: لا قراءة للأسفل."
              : "قاعدة No Write Up: لا كتابة للأعلى."}
        </span>
      </div>

      <div className="studio-compare">
        <div className="studio-compare-col">
          <h4>BLP — السرية</h4>
          <ul>
            <li>Simple Security: لا قراءة للأعلى (NRU)</li>
            <li>*-Property: لا كتابة للأسفل (NWD)</li>
            <li>يمنع تسريب الأسرار للأسفل</li>
          </ul>
        </div>
        <div className="studio-compare-col">
          <h4>Biba — النزاهة</h4>
          <ul>
            <li>Simple Integrity: لا قراءة للأسفل (NRD)</li>
            <li>Integrity *-Property: لا كتابة للأعلى (NWU)</li>
            <li>يمنع تلوث البيانات النظيفة بالمنخفضة</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AcmStudio() {
  const [viewMode, setViewMode] = useState<"acl" | "cap">("acl");
  const rows = [
    { s: "Alice", a: "R/W", b: "R", c: "—" },
    { s: "Bob", a: "R", b: "—", c: "R/W" },
    { s: "Carol", a: "—", b: "R/W", c: "R" }
  ];

  return (
    <div className="studio-body">
      <div className="exam-pills">
        <button
          type="button"
          className={`fchip ${viewMode === "acl" ? "on" : ""}`}
          onClick={() => setViewMode("acl")}
        >
          ACL — قوائم لكل كائن
        </button>
        <button
          type="button"
          className={`fchip ${viewMode === "cap" ? "on" : ""}`}
          onClick={() => setViewMode("cap")}
        >
          Capabilities — تذاكر لكل ذات
        </button>
      </div>

      <div className="tbl-wrap">
        <table className="tbl acm-table">
          <thead>
            <tr>
              <th>الذات \ الكائن</th>
              <th>ملف A</th>
              <th>ملف B</th>
              <th>سجل C</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.s}>
                <td><b>{row.s}</b></td>
                <td><code className="m-ltr">{row.a}</code></td>
                <td><code className="m-ltr">{row.b}</code></td>
                <td><code className="m-ltr">{row.c}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="studio-note">
        {viewMode === "acl"
          ? "في ACL يُخزَّن لكل كائن قائمة بمن يملك صلاحية عليه؛ البحث عن صلاحيات ذات واحدة يتطلب مسح كل الكائنات."
          : "في Capabilities تُخزَّن لكل ذات تذكرة بما تملكه من كائنات؛ التحقق من صلاحية ذات سريع، لكن سحب الصلاحية من كل الأذونات أصعب."}
      </div>
    </div>
  );
}

function MalwareMatrix() {
  const [selected, setSelected] = useState(0);
  const row = MALWARE_ROWS[selected];

  return (
    <div className="studio-body">
      <div className="malware-table-wrap">
        <table className="tbl malware-table">
          <thead>
            <tr>
              <th>الصنف</th>
              <th>يحتاج مضيفاً؟</th>
              <th>الانتشار</th>
              <th>السلوك</th>
              <th>الكلمة المفتاحية</th>
            </tr>
          </thead>
          <tbody>
            {MALWARE_ROWS.map((item, idx) => (
              <tr key={item.type} className={idx === selected ? "is-selected" : ""} onClick={() => setSelected(idx)}>
                <td><b>{item.type}</b></td>
                <td>{item.host}</td>
                <td>{item.spread}</td>
                <td>{item.behavior}</td>
                <td><code className="m-ltr">{item.key}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="malware-detail">
        <div className="malware-detail-head">
          <Icons.Warning size={16} />
          <b>{row.type}</b>
          <span className="ref-chip">{row.key}</span>
        </div>
        <p>
          {row.type === "Virus" && "الفيروس يلحق نسخته بملف مضيف ولا يعمل إلا عند تشغيل الملف المصاب؛ لذلك الكلمة المفتاحية في السؤال هي attachment/host."}
          {row.type === "Worm" && "الدودة تنتشر ذاتياً عبر الشبكة دون تدخل المستخدم، وتستهلك موارد الشبكة؛ لا تحتاج ملفاً مضيفاً."}
          {row.type === "Trojan" && "حصان طروادة يتخفى كبرنامج شرعي ولا يتكاثر ذاتياً؛ يفتح باباً خلفياً أو يسرق بيانات."}
          {row.type === "Logic Bomb" && "القنبلة المنطقية لا تنتشر، بل تنتظر شرطاً (تاريخ/حدث) لتنفيذ السلوك الخبيث."}
          {row.type === "Rootkit" && "الروتكِت يخفي وجود المهاجم وأدواته على النظام، ويحقق الاستمرارية (persistence)."}
          {row.type === "Ransomware" && "برامج الفدية تشفر الملفات وتطلب فدية؛ تهاجم التوافر عبر منع الوصول للبيانات."}
        </p>
      </div>
    </div>
  );
}

function StackStudio() {
  const [inputSize, setInputSize] = useState(12);
  const buffer = 8;
  const overflow = Math.max(0, inputSize - buffer);
  const saved = overflow > 0 ? "RET = 0x41414141" : "RET = 0x00401000";

  return (
    <div className="studio-body">
      <div className="stack-wrap">
        <div className="stack-frame">
          <div className="stack-cell stack-ret">العنوان المحفوظ (RET)</div>
          <div className="stack-cell stack-saved">EBP المحفوظ</div>
          <div className="stack-buffer">
            {Array.from({ length: Math.max(inputSize, buffer) }).map((_, idx) => (
              <span key={idx} className={`stack-byte ${idx < buffer ? "in-buffer" : "overwrite"}`}>
                {idx < buffer ? "A" : "A"}
              </span>
            ))}
          </div>
          <div className="stack-cell stack-top">أعلى المخزن → نمو إلى العناوين الأعلى</div>
        </div>
        <div className="stack-meta">
          <div>حجم المخزن: <b>{buffer} بايت</b></div>
          <div>حجم المدخل: <b>{inputSize} بايت</b></div>
          <div className={overflow > 0 ? "err" : "ok"}>
            {overflow > 0 ? `تجاوز بمقدار ${overflow} بايت — كتابة فوق EBP/RET` : "داخل الحدود الآمنة"}
          </div>
          <code className="m-ltr">{saved}</code>
        </div>
      </div>

      <Slider label="طول المدخل" value={inputSize} min={1} max={24} onChange={setInputSize} suffix=" بايت" />

      <div className="studio-note">
        تجاوز سعة المخزن يحدث عند نسخ بيانات أكبر من المساحة المحجوزة دون تحقق من الحدود (bounds check)، ما يسمح
        بالكتابة فوق عنوان العودة وتغيير مسار التنفيذ.
      </div>
    </div>
  );
}

function ProcessStudio() {
  const [stability, setStability] = useState(70);
  const [risk, setRisk] = useState(50);
  const [size, setSize] = useState(50);
  const [speed, setSpeed] = useState(50);

  const recommendation = useMemo(() => {
    if (risk >= 70 && stability < 60) {
      return { model: "Spiral Model", why: "المخاطر العالية مع متطلبات غير مستقرة تجعل التكرار القائم على تحليل المخاطر هو الأنسب." };
    }
    if (speed >= 70 && stability >= 50) {
      return { model: "RAD Model", why: "الحاجة للتسليم السريع خلال 60-90 يوماً مع نطاق مستقر تدفع نحو التطوير السريع." };
    }
    if (stability >= 75 && risk < 40) {
      return { model: "Waterfall", why: "المتطلبات مفهومة ومستقرة والمخاطر منخفضة، فالتسلسل الخطي واضح وقابل للإدارة." };
    }
    if (size >= 65) {
      return { model: "Incremental / Agile", why: "النظام كبير، لذا تقسيمه إلى إصدارات تزايدية يقلل المخاطر ويسمح بتغذية راجعة مبكرة." };
    }
    return { model: "Agile / Iterative", why: "توازن معتدل مع حاجة للتغذية الراجعة المستمرة والتكيّف مع التغيير." };
  }, [stability, risk, size, speed]);

  return (
    <div className="studio-body">
      <div className="studio-controls studio-two-col">
        <Slider label="استقرار المتطلبات" value={stability} min={0} max={100} onChange={setStability} suffix="%" />
        <Slider label="مستوى المخاطر" value={risk} min={0} max={100} onChange={setRisk} suffix="%" />
        <Slider label="حجم النظام" value={size} min={0} max={100} onChange={setSize} suffix="%" />
        <Slider label="الحاجة لسرعة التسليم" value={speed} min={0} max={100} onChange={setSpeed} suffix="%" />
      </div>

      <div className="studio-result ok">
        <Icons.Target size={16} />
        <span><b>النموذج المقترح: {recommendation.model}</b> — {recommendation.why}</span>
      </div>

      <div className="studio-compare">
        <div className="studio-compare-col">
          <h4>Waterfall</h4>
          <p>متطلبات ثابتة، تسلسل خطي، توثيق كثيف.</p>
        </div>
        <div className="studio-compare-col">
          <h4>Spiral</h4>
          <p>تكرار + تحليل مخاطر صريح في كل دورة.</p>
        </div>
        <div className="studio-compare-col">
          <h4>RAD</h4>
          <p>نماذج أولية سريعة وتسليم خلال 60-90 يوماً.</p>
        </div>
        <div className="studio-compare-col">
          <h4>Agile</h4>
          <p>دورات قصيرة، تغذية راجعة، تكيّف مع التغيير.</p>
        </div>
      </div>
    </div>
  );
}

function McCabeStudio() {
  const [edges, setEdges] = useState(12);
  const [nodes, setNodes] = useState(10);
  const [components, setComponents] = useState(1);
  const vg = edges - nodes + 2 * components;
  const risk = vg <= 10 ? "منخفض" : vg <= 20 ? "متوسط" : "مرتفع";

  return (
    <div className="studio-body">
      <div className="mccabe-grid">
        <div className="studio-controls">
          <Slider label="عدد الحواف E" value={edges} min={2} max={60} onChange={setEdges} />
          <Slider label="عدد العقد N" value={nodes} min={1} max={50} onChange={setNodes} />
          <Slider label="المكوّنات المتصلة P" value={components} min={1} max={6} onChange={setComponents} />
        </div>
        <div className="mccabe-result">
          <div className="mccabe-formula" dir="ltr">V(G) = E − N + 2P</div>
          <div className="mccabe-calc" dir="ltr">V(G) = {edges} − {nodes} + 2×{components} = <b>{vg}</b></div>
          <div className={`studio-result ${vg <= 20 ? "ok" : "err"}`}>
            <Icons.Warning size={16} />
            <span>التعقيد الدوري: <b>{vg}</b> — مستوى الخطر: <b>{risk}</b></span>
          </div>
          <div className="studio-note">
            كل مسار مستقل إضافي يحتاج اختباراً واحداً على الأقل. عند تجاوز V(G)=20 يصبح الكود مرشحاً لإعادة الهيكلة.
          </div>
        </div>
      </div>
    </div>
  );
}

const VV_STATEMENTS = [
  { text: "مراجعة متطلبات المستخدم للتأكد من أنها تعبر عن احتياجاته الحقيقية", type: "validation" },
  { text: "فحص أن الكود يطابق تصميم الوحدة (Unit Test مقابل التصميم)", type: "verification" },
  { text: "عرض النموذج الأولي على المستخدم للتأكد من أنه يريد هذا المنتج", type: "validation" },
  { text: "التأكد من أن البرنامج مبني وفق المواصفات المكتوبة", type: "verification" },
  { text: "اختبار قبول المستخدم UAT في بيئته الحقيقية", type: "validation" },
  { text: "مراجعة الكود البرمجي (Code Review) للتحقق من الالتزام بالمعايير", type: "verification" }
];

function VerifyStudio() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const score = VV_STATEMENTS.reduce((sum, item, idx) => sum + (answers[idx] === item.type ? 1 : 0), 0);

  return (
    <div className="studio-body">
      <div className="vv-intro">
        <b>Verification:</b> "Are we building the product right?" — مطابقة المواصفات والتصميم.
        <br />
        <b>Validation:</b> "Are we building the right product?" — تلبية احتياج المستخدم الحقيقي.
      </div>

      <div className="vv-list">
        {VV_STATEMENTS.map((item, idx) => {
          const picked = answers[idx];
          const correct = picked === item.type;
          return (
            <div key={idx} className={`vv-item ${checked ? (correct ? "is-correct" : "is-wrong") : ""}`}>
              <div className="vv-text">{item.text}</div>
              <div className="vv-actions">
                <button
                  type="button"
                  className={`fchip ${picked === "verification" ? "on" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [idx]: "verification" }))}
                >
                  Verification
                </button>
                <button
                  type="button"
                  className={`fchip ${picked === "validation" ? "on" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [idx]: "validation" }))}
                >
                  Validation
                </button>
                {checked && (
                  <span className={`vv-mark ${correct ? "ok" : "err"}`}>
                    {correct ? "صحيح" : `الصواب: ${item.type === "verification" ? "Verification" : "Validation"}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="studio-inline-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setChecked(true)}>
          تصحيح الإجابات
        </button>
        <button type="button" className="btn btn-sm" onClick={() => { setAnswers({}); setChecked(false); }}>
          إعادة
        </button>
        {checked && <span className={`studio-score ${score === VV_STATEMENTS.length ? "ok" : ""}`}>{score} / {VV_STATEMENTS.length}</span>}
      </div>
    </div>
  );
}

function RiskStudio() {
  const [probability, setProbability] = useState(60);
  const [impact, setImpact] = useState(70);
  const exposure = Math.round((probability * impact) / 100);
  const level = exposure >= 60 ? "مرتفع" : exposure >= 30 ? "متوسط" : "منخفض";
  const pBand = probability >= 75 ? 0 : probability >= 50 ? 1 : probability >= 25 ? 2 : 3;
  const iBand = impact >= 80 ? 3 : impact >= 55 ? 2 : impact >= 30 ? 1 : 0;
  const mitigation = level === "مرتفع"
    ? "تجنّب أو نقل المخاطرة: نموذج حلزوني، نماذج أولية، ومراجعات معمارية مبكرة."
    : level === "متوسط"
      ? "تخفيف: اختبارات تكامل، مراقبة مستمرة، وخطة بديلة (Contingency)."
      : "قبول مع مراقبة دورية وتوثيق في سجل المخاطر.";

  return (
    <div className="studio-body">
      <div className="risk-grid">
        <div className="studio-controls">
          <Slider label="احتمالية الحدوث" value={probability} min={0} max={100} onChange={setProbability} suffix="%" />
          <Slider label="شدة الأثر" value={impact} min={0} max={100} onChange={setImpact} suffix="%" />
          <div className="studio-result ok">
            <Icons.Warning size={16} />
            <span>درجة التعرض (Exposure = P × I): <b>{exposure}%</b> — المستوى: <b>{level}</b></span>
          </div>
        </div>

        <div className="risk-matrix">
          {[90, 60, 30, 0].map((p, pIdx) => (
            <div key={p} className="risk-matrix-row">
              {[10, 40, 70, 100].map((i, iIdx) => {
                const cell = Math.round((p * i) / 100);
                const cellLevel = cell >= 60 ? "high" : cell >= 30 ? "mid" : "low";
                const active = pIdx === pBand && iIdx === iBand;
                return (
                  <div key={i} className={`risk-cell ${cellLevel} ${active ? "active" : ""}`}>
                    {cell}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="risk-axis">الأثر ← · الاحتمالية ↑</div>
        </div>
      </div>

      <div className="studio-note">
        <b>خطة التعامل: </b>{mitigation}
      </div>
    </div>
  );
}

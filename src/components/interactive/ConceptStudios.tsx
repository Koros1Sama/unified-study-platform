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

const PM_STUDIOS: StudioMeta[] = [
  {
    id: "pm_approach",
    title: "مستشار مناهج التطوير الخمسة",
    desc: "حدد استقرار المتطلبات ووتيرة التغيير وطبيعة التسليم لاكتشاف المنهج الأنسب مع السند العلمي.",
    ref: "L1-S013",
    tabs: ["approach"]
  },
  {
    id: "pm_principles",
    title: "مختبر المبادئ الستة لـ PMBOK 8",
    desc: "محاكي المبادئ وسلسلة خلق القيمة وفحص التطبيق الحقيقي مقابل الشكلي مع سيناريوهات عملية.",
    ref: "L2-S002",
    tabs: ["principles", "value_chain"]
  }
];

const PHY_STUDIOS: StudioMeta[] = [
  {
    id: "qc_gates",
    title: "محاكي الكيوبت وبوابات باولي وهادامارد",
    desc: "اختر الحالة الابتدائية وطبق البوابات الكمية (X, Y, Z, H, S) مع تتبع الاحتمالات ومتجه بلوخ لحظياً.",
    ref: "L8-S010",
    tabs: ["gates"]
  },
  {
    id: "qc_entanglement",
    title: "مختبر التشابك الكمي وحالات بيل (ad = bc)",
    desc: "اختبر قابلية الفصل لحالات ثنائية الكيوبت واحسب درجة النقاء Tr(rho^2) وعدد شميدت وإنتروبيا فون نيومان.",
    ref: "L7-S011",
    tabs: ["entanglement"]
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
  if (subjectCode === "pm") {
    if (/l2|principle|value|authentic|hospital/.test(lower)) return "pm_principles";
    return "pm_approach";
  }
  if (subjectCode === "phy") {
    if (/entangl|bell|schmidt|density|l5|l7|l10/.test(lower)) return "qc_entanglement";
    return "qc_gates";
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
    "malware-matrix": "matrix",
    "value-chain": "value_chain",
    "hospital-case": "principles"
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
  const studios =
    subjectCode === "sec"
      ? SEC_STUDIOS
      : subjectCode === "se"
      ? SE_STUDIOS
      : subjectCode === "pm"
      ? PM_STUDIOS
      : subjectCode === "phy"
      ? PHY_STUDIOS
      : [];
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
        {activeStudio === "pm_approach" && <PmApproachStudio />}
        {activeStudio === "pm_principles" && activeTab === "principles" && <PmPrinciplesStudio />}
        {activeStudio === "pm_principles" && activeTab === "value_chain" && <PmValueChainStudio />}
        {activeStudio === "qc_gates" && <QcGatesStudio />}
        {activeStudio === "qc_entanglement" && <QcEntanglementStudio />}
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
    risk: "مصفوفة المخاطر",
    approach: "مستشار المناهج الخمسة",
    principles: "المبادئ وسيناريوهات الفحص",
    value_chain: "سلسلة خلق القيمة",
    gates: "محاكي البوابات الكمية",
    entanglement: "مختبر التشابك وحالات بيل"
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

function PmApproachStudio() {
  const [stability, setStability] = useState(75);
  const [changeRate, setChangeRate] = useState(20);
  const [risk, setRisk] = useState(30);
  const [delivery, setDelivery] = useState(25);

  const recommendation = useMemo(() => {
    if (stability >= 70 && changeRate <= 35 && delivery <= 40) {
      return {
        approach_ar: "النهج التنبؤي (Predictive / Waterfall)",
        curve: "منحنى خطي متسلسل: تكلفة التغيير ترتفع باطراد كلما تقدم الوقت",
        characteristics: [
          "تخطيط كامل ومسبق للنطاق والجدول والميزانية قبل بدء التنفيذ.",
          "تسليم المخرج النهائي كدفعة واحدة في نهاية دورة حياة المشروع.",
          "يناسب المشاريع ذات المتطلبات الثابتة والحلول التقنية المجربة والمعروفة مسبقا."
        ],
        ref: "L1-S013",
        badge: "شلالي خطي"
      };
    }
    if (changeRate >= 65 || (delivery >= 65 && stability < 50)) {
      return {
        approach_ar: "النهج التكيفي / الرشيق (Adaptive / Agile)",
        curve: "منحنى تكرارات قصيرة (1-4 أسابيع): تكلفة التغيير تظل منخفضة ومسطحة",
        characteristics: [
          "تكرارات ودورات تسليم قصيرة جدا تسمح بالتغذية الراجعة اللحظية من العميل.",
          "النطاق يتطور باستمرار، بينما الوقت والتكلفة محكومان بالصناديق الزمنية (Timeboxes).",
          "يناسب المشاريع ذات عدم اليقين العالي والابتكار والتحول الرقمي السريع."
        ],
        ref: "L1-S013",
        badge: "رشيق متكيف"
      };
    }
    if (delivery >= 60 && stability >= 50) {
      return {
        approach_ar: "النهج التزايدي (Incremental)",
        curve: "منحنى تسليم الدفعات: قيمة ملموسة متاحة للاستخدام مبكرا مع كل إصدار",
        characteristics: [
          "تقسيم النظام الكلي إلى أجزاء ومكونات وظيفية مكتملة تسلم على دفعات متعاقبة.",
          "كل دفعة تضيف ميزات جديدة صالحة للاستخدام المباشر لدى المستفيد.",
          "يحقق عائدا مبكرا على الاستثمار (Early ROI) ويقلل مخاطر الانتظار الطويل."
        ],
        ref: "L1-S013",
        badge: "تزايدي تراكمي"
      };
    }
    if (stability < 50 && changeRate <= 50) {
      return {
        approach_ar: "النهج التكراري (Iterative)",
        curve: "منحنى تحسين النموذج: تعميق الفهم عبر تكرارات النمذجة المتعاقبة",
        characteristics: [
          "تطوير حل المشكلة وتحسينه عبر جولات مراجعة متعاقبة وملاحظات المستفيدين.",
          "التسليم الفعلي للنظام يكتمل في نهاية الدورات بعد استقرار وتأكيد التصميم.",
          "يناسب المشاريع المعقدة التي تحتاج لاكتشاف الحل واختباره بالنماذج الأولية."
        ],
        ref: "L1-S013",
        badge: "تكراري استكشافي"
      };
    }
    return {
      approach_ar: "النهج الهجين (Hybrid Approach)",
      curve: "منحنى مركب: يجمع بين استقرار التخطيط التنبؤي ومرونة التنفيذ التكيفي",
      characteristics: [
        "مزج مدروس بين العناصر التنبؤية والتكيفية وفق مقتضيات كل حزمة عمل في المشروع.",
        "تخطيط تنبؤي للبنية التحتية والمتطلبات التنظيمية الصارمة مع تطوير رشيق للميزات المتغيرة.",
        "النهج الأكثر شيوعا في المؤسسات الحديثة لملاءمته للمشاريع المتشابكة."
      ],
      ref: "L1-S013",
      badge: "هجين متوازن"
    };
  }, [stability, changeRate, risk, delivery]);

  return (
    <div className="studio-body">
      <div className="studio-controls studio-two-col">
        <Slider label="استقرار ووضوح المتطلبات" value={stability} min={0} max={100} onChange={setStability} suffix="%" />
        <Slider label="وتيرة التغيير المتوقعة" value={changeRate} min={0} max={100} onChange={setChangeRate} suffix="%" />
        <Slider label="مستوى المخاطر والتعقيد التقني" value={risk} min={0} max={100} onChange={setRisk} suffix="%" />
        <Slider label="الحاجة لتسليم قيمة مبكرة على دفعات" value={delivery} min={0} max={100} onChange={setDelivery} suffix="%" />
      </div>

      <div className="studio-result ok" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.Target size={18} />
            <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>المنهج الموصى به: {recommendation.approach_ar}</span>
          </div>
          <span className="ref-chip">{recommendation.badge} · {recommendation.ref}</span>
        </div>
        <p style={{ margin: 0, fontSize: "0.88rem", opacity: 0.9 }}>{recommendation.curve}</p>
        <ul style={{ margin: "4px 0 0", paddingRight: 20, fontSize: "0.85rem", display: "grid", gap: 4 }}>
          {recommendation.characteristics.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="studio-compare">
        <div className="studio-compare-col">
          <h4>التنبؤي (Predictive)</h4>
          <p>متطلبات واضحة، تخطيط شامل، تسليم دفعة واحدة في النهاية.</p>
        </div>
        <div className="studio-compare-col">
          <h4>التكراري (Iterative)</h4>
          <p>تكرار للتعلم وتحسين الحل، تسليم نهائي بعد نضج النموذج.</p>
        </div>
        <div className="studio-compare-col">
          <h4>التزايدي (Incremental)</h4>
          <p>تسليم مكونات مكتملة على دفعات؛ كل دفعة تضيف قيمة مباشرة.</p>
        </div>
        <div className="studio-compare-col">
          <h4>التكيفي (Adaptive)</h4>
          <p>دورات قصيرة 1-4 أسابيع، ترحيب بالتغيير، وتغذية راجعة فورية.</p>
        </div>
        <div className="studio-compare-col">
          <h4>الهجين (Hybrid)</h4>
          <p>دمج مدروس بين التنبؤي للأجزاء الثابتة والتكيفي للمتغيرات.</p>
        </div>
      </div>
    </div>
  );
}

const PM_PRINCIPLES_DATA = [
  {
    id: "systems",
    name_ar: "الشمولية (Systems View)",
    core: "رؤية المشروع كعنصر داخل نظام كلي يتفاعل مع بيئته وأهدافه الاستراتيجية.",
    authentic: "دراسة أثر قرارات المشروع على باقي أقسام المنظمة وتجنب التحسين المحلي الضار.",
    superficial: "عزل فريق المشروع والتركيز على إنجاز المهام الذاتية حتى لو أضرت بسير العمل العام.",
    domain: "الحوكمة وأصحاب المصلحة",
    ref: "L2-S004"
  },
  {
    id: "value",
    name_ar: "التركيز على القيمة (Focus on Value)",
    core: "القيمة هي الغاية الكبرى، والمخرجات مجرد وسيلة لتحقيق النتائج والفوائد.",
    authentic: "تقييم كل مهمة بمدى مساهمتها في تقديم منفعة صافية قابلة للقياس للمستفيد.",
    superficial: "الافتخار بتسليم مخرجات مطابقة للجدول رغم عدم استخدام المستفيدين لها أو زوال جدواها.",
    domain: "المالية والنطاق",
    ref: "L2-S008"
  },
  {
    id: "quality",
    name_ar: "تضمين الجودة (Embed Quality)",
    core: "بناء الجودة في صلب العمليات عبر الوقاية المستمرة لا الفحص المتأخر.",
    authentic: "مراجعات النظراء، الاختبارات الآلية، والتحقق الدوري من معايير القبول أولا بأول.",
    superficial: "تأجيل اختبار الجودة لمرحلة التسليم النهائي والاعتماد على ترقيع العيوب تحت ضغط الوقت.",
    domain: "النطاق والموارد",
    ref: "L2-S011"
  },
  {
    id: "accountability",
    name_ar: "القيادة بمساءلة (Lead with Accountability)",
    core: "تحديد ملكية القرارات بنزاهة وشفافية وتطبيق مصفوفة RACI بحزم.",
    authentic: "المساءلة عن النتائج وليس مجرد الحضور، والشفافية التامة في نقل الحقائق للراعي بلا إخفاء.",
    superficial: "تبادل اللوم عند تعثر المشروع، أو احتكار القرارات مع التهرب من المسؤولية عند الإخفاق.",
    domain: "الحوكمة وأصحاب المصلحة",
    ref: "L2-S015"
  },
  {
    id: "sustainability",
    name_ar: "دمج الاستدامة (Integrate Sustainability)",
    core: "مراعاة المحصلة الثلاثية (البيئة، المجتمع، الاقتصاد) ودورة حياة المنتج الكاملة.",
    authentic: "حساب تكلفة التشغيل والصيانة والأثر البيئي لعشر سنوات قادمة وليس تكلفة البناء فقط.",
    superficial: "تقليص تكاليف البناء بحلول رديئة تضاعف تكاليف الصيانة وتستهلك طاقة مفرطة لاحقا.",
    domain: "الموارد والمالية",
    ref: "L2-S019"
  },
  {
    id: "teams",
    name_ar: "تمكين الفرق (Build Empowered Teams)",
    core: "توفير الأمان النفسي وتفويض الصلاحيات الفنية وتشجيع التنظيم الذاتي.",
    authentic: "القيادة الخادمة، تفويض الصلاحيات، وتشجيع التجربة والتعلم من الأخطاء بأمان.",
    superficial: "الرقابة الدقيقة الخانقة (Micro-management) واشتراط موافقة المدير على كل جزئية بسيطة.",
    domain: "الموارد والجدول",
    ref: "L2-S023"
  }
];

const PM_SCENARIOS = [
  {
    id: 1,
    principle: "التركيز على القيمة",
    scenario: "مدير مشروع سلم منصة برمجية في موعدها وضمن الميزانية، لكن الطلاب لم يستخدموها لتعقيد واجهتها. اعتبر المدير مشروعه ناجحا بنسبة 100%.",
    isAuthentic: false,
    explanation: "تطبيق شكلي؛ فالمشروع وسيلة لتقديم القيمة، وتوليد مخرجات لا تحقق فوائد عملية للمستفيدين يعتبر فشلا في تحقيق غاية المشروع."
  },
  {
    id: 2,
    principle: "تضمين الجودة",
    scenario: "فريق برمجي ينفذ مراجعة النظراء واختبارات الوحدة يوميا قبل دمج أي كود لاكتشاف الأخطاء مبكرا بدلا من انتظار فحص نهاية المشروع.",
    isAuthentic: true,
    explanation: "تطبيق حقيقي؛ يجسد بناء الجودة بالوقاية والتحقق المستمر (Prevention over Inspection) ويقلل تكلفة إصلاح العيوب."
  },
  {
    id: 3,
    principle: "تمكين الفرق",
    scenario: "مدير يلزم كل مبرمج بطلب إذنه الخطي قبل تغيير سطر واحد في الكود، ويرفض تفويض أي قرار تقني لأعضاء الفريق.",
    isAuthentic: false,
    explanation: "تطبيق شكلي وخانق؛ يمثل الرقابة الدقيقة (Micro-management) ويهدم الأمان النفسي والمبادرة والتمكين."
  },
  {
    id: 4,
    principle: "دمج الاستدامة",
    scenario: "مستشفى اختار نظاما شمسيا عالي التكلفة التأسيسية لأنه يقلل تكاليف الكهرباء والانبعاثات على مدار 15 عاما قادمة.",
    isAuthentic: true,
    explanation: "تطبيق حقيقي لمبدأ الاستدامة؛ يراعي دورة حياة المنتج الكاملة (Whole Life Cycle) والمحصلة الثلاثية للأثر."
  }
];

function PmPrinciplesStudio() {
  const [selectedPrinciple, setSelectedPrinciple] = useState(PM_PRINCIPLES_DATA[0].id);
  const [userAnswers, setUserAnswers] = useState<Record<number, boolean>>({});
  const [checked, setChecked] = useState(false);

  const current = PM_PRINCIPLES_DATA.find((p) => p.id === selectedPrinciple) || PM_PRINCIPLES_DATA[0];

  const handleSelectAnswer = (scenarioId: number, answer: boolean) => {
    setUserAnswers((prev) => ({ ...prev, [scenarioId]: answer }));
    setChecked(false);
  };

  const score = useMemo(() => {
    return PM_SCENARIOS.filter((s) => userAnswers[s.id] === s.isAuthentic).length;
  }, [userAnswers]);

  return (
    <div className="studio-body">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 16 }}>
        {PM_PRINCIPLES_DATA.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`btn btn-sm ${p.id === selectedPrinciple ? "btn-primary" : ""}`}
            onClick={() => setSelectedPrinciple(p.id)}
            style={{ textAlign: "center", padding: "8px 6px", fontSize: "0.82rem" }}
          >
            {p.name_ar.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 16, background: "var(--sf2)", border: "1px solid var(--ln)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)" }}>{current.name_ar}</h3>
          <span className="ref-chip">{current.ref} · مجال: {current.domain}</span>
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-m)", marginBottom: 12 }}>{current.core}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 12, borderRadius: "var(--r-s)", background: "color-mix(in srgb, #22c55e 10%, var(--sf))", border: "1px solid #22c55e" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.85rem", fontWeight: 700, color: "#16a34a" }}>التطبيق الحقيقي الصادق</h4>
            <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.45 }}>{current.authentic}</p>
          </div>
          <div style={{ padding: 12, borderRadius: "var(--r-s)", background: "color-mix(in srgb, #ef4444 10%, var(--sf))", border: "1px solid #ef4444" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.85rem", fontWeight: 700, color: "#dc2626" }}>التطبيق الشكلي الزائف</h4>
            <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.45 }}>{current.superficial}</p>
          </div>
        </div>
      </div>

      <div className="headline" style={{ marginTop: 24, marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>اختبار تشخيص الممارسة: حقيقي أم شكلي؟</h4>
        <p className="sub" style={{ fontSize: "0.82rem" }}>صنف الممارسات التالية لتتأكد من إتقانك لمعايير الدكتور منصور نعمان في الامتحان.</p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {PM_SCENARIOS.map((s) => {
          const selected = userAnswers[s.id];
          const isCorrect = selected === s.isAuthentic;
          return (
            <div key={s.id} className="card" style={{ padding: 12, border: "1px solid var(--ln)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--acc)" }}>المبدأ: {s.principle}</span>
                {checked && (
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isCorrect ? "#16a34a" : "#dc2626" }}>
                    {isCorrect ? "إجابة صائبة" : "إجابة خاطئة"}
                  </span>
                )}
              </div>
              <p style={{ margin: "0 0 10px", fontSize: "0.86rem", color: "var(--ink)" }}>{s.scenario}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${selected === true ? "btn-primary" : ""}`}
                  onClick={() => handleSelectAnswer(s.id, true)}
                >
                  تطبيق حقيقي
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selected === false ? "btn-primary" : ""}`}
                  onClick={() => handleSelectAnswer(s.id, false)}
                >
                  تطبيق شكلي
                </button>
              </div>
              {checked && (
                <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--ink-m)", borderTop: "1px dashed var(--ln)", paddingTop: 6 }}>
                  <b>التعليل الأكاديمي: </b>{s.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setChecked(true)}
          disabled={Object.keys(userAnswers).length < PM_SCENARIOS.length}
        >
          فحص النتائج
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setUserAnswers({});
            setChecked(false);
          }}
        >
          إعادة
        </button>
        {checked && (
          <span className={`studio-score ${score === PM_SCENARIOS.length ? "ok" : ""}`}>
            {score} / {PM_SCENARIOS.length}
          </span>
        )}
      </div>
    </div>
  );
}

const VALUE_CHAIN_CASES = [
  {
    id: "univ",
    title: "منصة التسجيل الإلكتروني للجامعة",
    subtitle: "حالة دراسية معتمدة في شرائح الدكتور منصور نعمان",
    ref: "L1-S009",
    steps: [
      {
        stage_ar: "المخرجات المباشرة (Outputs)",
        stage_en: "Deliverables / Products",
        desc: "البرمجيات وقواعد البيانات وبوابة الويب وتطبيقات الهواتف التي طورها فريق المشروع وسلّمها رسميا.",
        trigger: "نظام إلكتروني مطور · بوابة ويب · قاعدة بيانات جاهزة"
      },
      {
        stage_ar: "النتائج التشغيلية (Outcomes)",
        stage_en: "Operational Behaviors",
        desc: "تغيّر سلوك الطلاب والموظفين؛ قيام الطلاب بالتسجيل ذاتيا من منازلهم بدلا من الطوابير الورقية المرهقة.",
        trigger: "اعتماد الطلاب على النظام · التسجيل عن بعد · تغير سلوك العمل"
      },
      {
        stage_ar: "الفوائد القابلة للقياس (Benefits)",
        stage_en: "Measurable Gains",
        desc: "تقليص فترة التسجيل من أسبوعين إلى 3 أيام، تقليل استخدام الورق بنسبة 90%، وخفض الأخطاء البشرية بنسبة 80%.",
        trigger: "تقليص الوقت بنسبة مقاسة · وفر مالي موثق · انخفاض معدل الأخطاء"
      },
      {
        stage_ar: "القيمة الصافية المستدامة (Value)",
        stage_en: "Realized Net Value",
        desc: "تحسين السمعة الأكاديمية للجامعة، رفع مستوى رضا الطلاب، وتعزيز القدرة التنافسية واستقطاب طلاب جدد.",
        trigger: "المنفعة الصافية · السمعة المؤسسية · الرضا الشامل للمستفيدين"
      }
    ]
  },
  {
    id: "hospital",
    title: "نظام السجلات الصحية الموحد للمستشفى",
    subtitle: "دراسة حالة المحاضرة الثانية (حالة المستشفى PMBOK 8)",
    ref: "L2-S026",
    steps: [
      {
        stage_ar: "المخرجات المباشرة (Outputs)",
        stage_en: "Electronic Health Record (EHR)",
        desc: "نظام السجلات الطبية الرقمي، الخوادم الآمنة، وواجهات أجهزة الفحص والأشعة بالمستشفى.",
        trigger: "النظام البرمجي للمستشفى · تركيب الخوادم وأجهزة القراءة"
      },
      {
        stage_ar: "النتائج التشغيلية (Outcomes)",
        stage_en: "Clinical Practice Change",
        desc: "استخدام الأطباء والتمريض للنظام في توثيق الفحوصات والوصول الفوري لملفات المرضى بين الأقسام.",
        trigger: "استخدام الأطباء للملفات الرقمية · التنسيق الفوري بين العيادات"
      },
      {
        stage_ar: "الفوائد القابلة للقياس (Benefits)",
        stage_en: "Healthcare Metrics",
        desc: "تقليل الأخطاء الدوائية بنسبة 65%، خفض زمن انتظار المرضى بنسبة 45%، وتسريع صدور التحاليل المخبرية.",
        trigger: "انخفاض الأخطاء الطبية · تقليص زمن الانتظار · تسريع النتائج"
      },
      {
        stage_ar: "القيمة الصافية المستدامة (Value)",
        stage_en: "Health Impact & Life Saved",
        desc: "إنقاذ الأرواح، تحسين جودة الرعاية الصحية، ورفع ثقة المجتمع في المنظومة الصحية للمستشفى.",
        trigger: "إنقاذ حياة المرضى · ثقة المجتمع ورضا المرضى · الجدوى الصحية العامة"
      }
    ]
  }
];

function PmValueChainStudio() {
  const [selectedCase, setSelectedCase] = useState("univ");
  const [activeStep, setActiveStep] = useState(0);

  const currentCase = VALUE_CHAIN_CASES.find((c) => c.id === selectedCase) || VALUE_CHAIN_CASES[0];
  const step = currentCase.steps[activeStep];

  return (
    <div className="studio-body">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {VALUE_CHAIN_CASES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`btn btn-sm ${c.id === selectedCase ? "btn-primary" : ""}`}
            onClick={() => {
              setSelectedCase(c.id);
              setActiveStep(0);
            }}
          >
            {c.title}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 16, background: "var(--sf2)", border: "1px solid var(--ln)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>{currentCase.title}</h3>
          <span className="ref-chip">{currentCase.ref}</span>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-m)" }}>{currentCase.subtitle}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {currentCase.steps.map((s, idx) => (
          <button
            key={idx}
            type="button"
            className={`btn btn-sm ${idx === activeStep ? "btn-primary" : ""}`}
            onClick={() => setActiveStep(idx)}
            style={{
              padding: "10px 6px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}
          >
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>المرحلة {idx + 1}</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>{s.stage_ar.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 18, border: "2px solid var(--acc)", background: "var(--sf)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--acc)" }}>
            {step.stage_ar}
          </h4>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", fontFamily: "monospace" }}>{step.stage_en}</span>
        </div>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--ink)", marginBottom: 14 }}>
          {step.desc}
        </p>
        <div style={{ padding: 10, borderRadius: "var(--r-s)", background: "var(--sf2)", border: "1px dashed var(--ln)" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--acc)", display: "block", marginBottom: 4 }}>
            مفتاح قناص الخيارات في الامتحان (5-Second Trigger):
          </span>
          <span style={{ fontSize: "0.84rem", color: "var(--ink)" }}>{step.trigger}</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
          disabled={activeStep === 0}
        >
          السابق
        </button>
        <span style={{ fontSize: "0.82rem", color: "var(--ink-m)", alignSelf: "center" }}>
          المرحلة {activeStep + 1} من {currentCase.steps.length}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setActiveStep((prev) => Math.min(currentCase.steps.length - 1, prev + 1))}
          disabled={activeStep === currentCase.steps.length - 1}
        >
          التالي
        </button>
      </div>
    </div>
  );
}

type CNum = { re: number; im: number };
const cMul = (a: CNum, b: CNum): CNum => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cConj = (a: CNum): CNum => ({ re: a.re, im: -a.im });
const cAbs2 = (a: CNum): number => a.re * a.re + a.im * a.im;
const fmtC = (z: CNum): string => {
  const r = Math.abs(z.re) < 1e-4 ? 0 : Number(z.re.toFixed(3));
  const im = Math.abs(z.im) < 1e-4 ? 0 : Number(z.im.toFixed(3));
  if (im === 0) return String(r);
  if (r === 0) return im === 1 ? "i" : im === -1 ? "-i" : `${im}i`;
  return `${r}${im >= 0 ? "+" : ""}${im}i`;
};

function QcGatesStudio() {
  const [alpha, setAlpha] = useState<CNum>({ re: 1, im: 0 });
  const [beta, setBeta] = useState<CNum>({ re: 0, im: 0 });
  const [history, setHistory] = useState<string[]>([]);

  const applyInit = (name: string, a: CNum, b: CNum) => {
    setAlpha(a);
    setBeta(b);
    setHistory([name]);
  };

  const applyGate = (gate: "X" | "Y" | "Z" | "H" | "S" | "T") => {
    const s2 = 1 / Math.SQRT2;
    let na = alpha;
    let nb = beta;
    if (gate === "X") {
      na = beta;
      nb = alpha;
    } else if (gate === "Y") {
      na = cMul({ re: 0, im: -1 }, beta);
      nb = cMul({ re: 0, im: 1 }, alpha);
    } else if (gate === "Z") {
      na = alpha;
      nb = { re: -beta.re, im: -beta.im };
    } else if (gate === "H") {
      na = { re: (alpha.re + beta.re) * s2, im: (alpha.im + beta.im) * s2 };
      nb = { re: (alpha.re - beta.re) * s2, im: (alpha.im - beta.im) * s2 };
    } else if (gate === "S") {
      na = alpha;
      nb = cMul({ re: 0, im: 1 }, beta);
    } else if (gate === "T") {
      na = alpha;
      nb = cMul({ re: Math.cos(Math.PI / 4), im: Math.sin(Math.PI / 4) }, beta);
    }
    setAlpha(na);
    setBeta(nb);
    setHistory((prev) => [...prev.slice(-7), gate]);
  };

  const p0 = cAbs2(alpha);
  const p1 = cAbs2(beta);
  const cross = cMul(cConj(alpha), beta);
  const sx = Number((2 * cross.re).toFixed(3));
  const sy = Number((2 * cross.im).toFixed(3));
  const sz = Number((p0 - p1).toFixed(3));

  return (
    <div className="studio-body">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <button type="button" className="btn btn-sm" onClick={() => applyInit("|0>", { re: 1, im: 0 }, { re: 0, im: 0 })}>|0&gt;</button>
        <button type="button" className="btn btn-sm" onClick={() => applyInit("|1>", { re: 0, im: 0 }, { re: 1, im: 0 })}>|1&gt;</button>
        <button type="button" className="btn btn-sm" onClick={() => applyInit("|+>", { re: 1 / Math.SQRT2, im: 0 }, { re: 1 / Math.SQRT2, im: 0 })}>|+&gt;</button>
        <button type="button" className="btn btn-sm" onClick={() => applyInit("|->", { re: 1 / Math.SQRT2, im: 0 }, { re: -1 / Math.SQRT2, im: 0 })}>|-&gt;</button>
        <button type="button" className="btn btn-sm" onClick={() => applyInit("|+i>", { re: 1 / Math.SQRT2, im: 0 }, { re: 0, im: 1 / Math.SQRT2 })}>(|0&gt;+i|1&gt;)/sqrt(2)</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {(["X", "Y", "Z", "H", "S", "T"] as const).map((g) => (
          <button key={g} type="button" className="btn btn-primary btn-sm" onClick={() => applyGate(g)} dir="ltr">
            {g} Gate
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 16, background: "var(--sf2)", border: "1px solid var(--ln)", marginBottom: 14 }}>
        <div style={{ fontSize: "0.82rem", color: "var(--ink-m)", marginBottom: 6 }}>
          مسار العمليات: <code className="m-ltr">{history.length ? history.join(" -> ") : "|0>"}</code>
        </div>
        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--acc)", fontFamily: "var(--fm)" }} dir="ltr">
          |psi&gt; = ({fmtC(alpha)})|0&gt; + ({fmtC(beta)})|1&gt;
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 4 }}>
              <span>احتمال القياس |0&gt;</span>
              <b dir="ltr">{(p0 * 100).toFixed(1)}%</b>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: "var(--sf)", overflow: "hidden", border: "1px solid var(--ln)" }}>
              <div style={{ width: `${Math.min(100, p0 * 100)}%`, height: "100%", background: "var(--acc)" }} />
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 4 }}>
              <span>احتمال القياس |1&gt;</span>
              <b dir="ltr">{(p1 * 100).toFixed(1)}%</b>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: "var(--sf)", overflow: "hidden", border: "1px solid var(--ln)" }}>
              <div style={{ width: `${Math.min(100, p1 * 100)}%`, height: "100%", background: "#38bdf8" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="studio-note" dir="ltr" style={{ textAlign: "left" }}>
        Bloch Vector S = (&lt;X&gt;, &lt;Y&gt;, &lt;Z&gt;) = ({sx}, {sy}, {sz}) | |S|^2 = {(sx * sx + sy * sy + sz * sz).toFixed(3)} (Pure State = 1)
      </div>
    </div>
  );
}

const BELL_PRESETS = [
  { id: "b00", label: "Bell |beta_00> = (|00>+|11>)/sqrt(2)", a: 0.7071, b: 0, c: 0, d: 0.7071 },
  { id: "b01", label: "Bell |beta_01> = (|01>+|10>)/sqrt(2)", a: 0, b: 0.7071, c: 0.7071, d: 0 },
  { id: "b10", label: "Bell |beta_10> = (|00>-|11>)/sqrt(2)", a: 0.7071, b: 0, c: 0, d: -0.7071 },
  { id: "b11", label: "Singlet |beta_11> = (|01>-|10>)/sqrt(2)", a: 0, b: 0.7071, c: -0.7071, d: 0 },
  { id: "prod", label: "Product |++> = (|00>+|01>+|10>+|11>)/2", a: 0.5, b: 0.5, c: 0.5, d: 0.5 },
  { id: "partial", label: "Partial Entangled (0.8|00>+0.6|11>)", a: 0.8, b: 0, c: 0, d: 0.6 }
];

function QcEntanglementStudio() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [d, setD] = useState(1);

  const norm = Math.sqrt(a * a + b * b + c * c + d * d) || 1;
  const na = a / norm;
  const nb = b / norm;
  const nc = c / norm;
  const nd = d / norm;

  const ad = na * nd;
  const bc = nb * nc;
  const diff = Math.abs(ad - bc);
  const isSeparable = diff < 0.015;

  // Reduced density matrix rho_A = Tr_B(|psi><psi|)
  const r00 = na * na + nb * nb;
  const r01 = na * nc + nb * nd;
  const r11 = nc * nc + nd * nd;
  const trRhoA2 = r00 * r00 + 2 * r01 * r01 + r11 * r11;
  const det = r00 * r11 - r01 * r01;
  const disc = Math.sqrt(Math.max(0, 1 - 4 * det));
  const lam1 = (1 + disc) / 2;
  const lam2 = (1 - disc) / 2;
  const schmidtNumber = (lam1 > 1e-4 ? 1 : 0) + (lam2 > 1e-4 ? 1 : 0);
  const h = (x: number) => (x > 1e-6 ? -x * Math.log2(x) : 0);
  const entropy = h(lam1) + h(lam2);

  return (
    <div className="studio-body">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {BELL_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-sm"
            dir="ltr"
            onClick={() => { setA(p.a); setB(p.b); setC(p.c); setD(p.d); }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="studio-controls studio-two-col">
        <Slider label="المعامل a (|00>)" value={Math.round(a * 10)} min={-10} max={10} onChange={(v) => setA(v / 10)} />
        <Slider label="المعامل b (|01>)" value={Math.round(b * 10)} min={-10} max={10} onChange={(v) => setB(v / 10)} />
        <Slider label="المعامل c (|10>)" value={Math.round(c * 10)} min={-10} max={10} onChange={(v) => setC(v / 10)} />
        <Slider label="المعامل d (|11>)" value={Math.round(d * 10)} min={-10} max={10} onChange={(v) => setD(v / 10)} />
      </div>

      <div className={`studio-result ${isSeparable ? "ok" : "err"}`}>
        <Icons.Target size={16} />
        <span>
          <b>{isSeparable ? "حالة قابلة للفصل (Product / Separable State)" : "حالة متشابكة (Entangled State)"}</b>
          {" — "}
          <code className="m-ltr">|ad - bc| = {diff.toFixed(4)}</code>
          {" | "}
          عدد شميدت: <code className="m-ltr">Sch = {schmidtNumber}</code>
        </span>
      </div>

      <div className="studio-compare" style={{ marginTop: 14 }}>
        <div className="studio-compare-col">
          <h4>معيار الفصل (ad = bc)</h4>
          <p dir="ltr">ad = {ad.toFixed(3)}, bc = {bc.toFixed(3)}</p>
        </div>
        <div className="studio-compare-col">
          <h4>نقاء الحالة المختزلة</h4>
          <p dir="ltr">Tr(rho_A^2) = {trRhoA2.toFixed(3)}</p>
        </div>
        <div className="studio-compare-col">
          <h4>القيم الذاتية لشميدت</h4>
          <p dir="ltr">lambda = {lam1.toFixed(3)}, {lam2.toFixed(3)}</p>
        </div>
        <div className="studio-compare-col">
          <h4>إنتروبيا التشابك</h4>
          <p dir="ltr">S(rho_A) = {entropy.toFixed(3)} bits</p>
        </div>
      </div>
    </div>
  );
}

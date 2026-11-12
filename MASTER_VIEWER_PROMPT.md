# الدستور المعماري الشامل لبناء المقررات في المنصة التعليمية الموحدة (React Unified Study Platform — Master Specification v7.0)

> **الإصدار السابع (v7.0 — معمارية React 19 + TypeScript الموحدة المحسوبة هندسياً ورياضياً):**
> هذه الوثيقة هي المرجع الهندسي الأعلى (Single Source of Truth) لبناء وتوليد وتدقيق ونشر أي مقرر جامعي داخل المنصة الأكاديمية الموحدة **`Unified_Study_Platform`**.
> تم إلغاء النمط القديم القائم على استنساخ قوالب HTML منفصلة (`Viewer_TEMPLATE`) نهائياً؛ كافة المقررات تُبنى وتُدمج مباشرة في تطبيق **React 19 + TypeScript + Vite + Dexie IndexedDB** الموحد تحت مسار `D:/Collage/CS3/All/HW/Unified_Study_Platform`.

---

## 0. القواعد الحاكمة الصارمة (Ironclad Architectural Laws)

1. **معمارية المنصة الموحدة بـ React حصراً (100% React Native Architecture):**
   - جميع المقررات تعمل داخل تطبيق React واحد (`Unified_Study_Platform`) يقرأ فهرس المقررات من `public/data/subjects.json`، ويحمّل حزمة كل مقرر كملف JSON مهيكل واحد من `public/data/{code}/bundle.json`، ويخزنها أوفلاين في **Dexie.js (IndexedDB)** و**Cache Storage API** عبر عامل الخدمة ثنائي الطبقة `public/sw.js`.
   - يُمنع إنشاء صفحات HTML مستقلة لكل مادة أو الاعتماد على متغيرات `window.TOC_*` في وقت التشغيل داخل المتصفح؛ وإنما تُولَّد الحزمة الموحدة `bundle.json` مباشرة أو عبر محرك التجميع `scripts/build-bundles.mjs`.

2. **الوضع العربي الخالص للمقررات العربية (`arabic_only: true` — Arabic-Native Course Mode):**
   - **قاعدة حاسمة:** إذا صرّح المستخدم أن المادة الفلانية **اختبارها عربي وسلايداتها عربي** (أو ضُبط الحقل `arabic_only: true` في تعريف المقرر)، **يُلغى فوراً وبشكل كامل كل ما له علاقة بالترجمة** على مستويين:
     1. **على مستوى الوكلاء وتوليد البيانات (Data & Multi-Agent Pipeline):**
        - إلغاء استخراج أو توليد ترجمة السلايدات (`L{n}_ar.js` أو `content_ar` كمقابل ترجمي).
        - إلغاء وكيل الترجمة الدفعية للأسئلة (`Batch_Translation_Agent` — المرحلة D) بالكامل.
        - إلغاء ازدواجية خيارات الأسئلة (`options_en` و`options_ar` يحتويان على مصفوفة الخيارات العربية المعتمدة فقط دون أي مصطلحات إنجليزية مقحمة بين أقواس).
        - إلغاء توليد قاموس المصطلحات الثنائي (`glossary` يكون `undefined`).
        - تعديل بوابات التحقق البرمجي (Gate 3 & Gate 4) تلقائياً عند `arabic_only: true` بحيث لا تطالب بترجمة مزدوجة أو قاموس ثنائي.
     2. **على مستوى واجهة React (`Unified_Study_Platform` UI):**
        - تثبيت وضع اللغة الفعلي تلقائياً على `"ar"` (`effectiveLanguageMode = "ar"`).
        - إخفاء مبدّل لغة الأسئلة (`ذكي / English / عربي`) وزر ترجمة السلايدات (`عربي`) من الشريط العلوي (`UnifiedAppHeader.tsx`).
        - إخفاء قسم «لغة أسئلة البنك» وزر «ترجمة تلقائية» من لوحة الإعدادات (`#setPanel`).
        - إخفاء شريحة «ترجمة الكل» وزر «ترجمة» (`.ar-btn`) ولوحة الترجمة (`.ar-panel`) من عارض السلايدات (`SlidesViewer.tsx`).
        - إخفاء أزرار الترجمة الفورية للخيارات (`.opt-tr`) والتمرير الذكي (`.hover-ar`) في بطاقة السؤال (`QuestionCard.tsx`)، وعرض نص السؤال والخيارات باتجاه عربي أصيل `RTL` (وحروف `ص / خ` لأسئلة الصواب والخطأ).
        - منع تكرار السطر الثاني للسؤال في مستكشف الأسئلة (`QuestionBankExplorer.tsx`)، وإخفاء زر «الترجمة العربية» في بنك التعاريف (`DefinitionsView.tsx`)، وإخفاء تبويب «قاموس المصطلحات» (`availableViews.glossary = false`).

3. **حظر الإيموجيات الشامل والنهائي (Zero Emojis Standard — 0% Tolerance):**
   - يُمنع منعاً باتاً وجود أي حرف إيموجي (Unicode Emoji) في أي ملف كود (`TSX`, `TS`, `CSS`, `JSON`, `MJS`) أو في نصوص البيانات أو الشروح أو رسائل الـ Git Commit أو الردود.
   - كافة الأيقونات تُستدعى حصراً من منظومة الرسوم المتجهية `src/components/icons/SvgIcons.tsx` (`Icons.*` بسمك خط موحد `strokeWidth="2"`).

4. **الفصل الحاسم بين «علامة» (Bookmark) و«تأجيل للمراجعة» (Exam Flag):**
   - في **بنك الأسئلة (`UnifiedQuestionBankView.tsx`)**: يُستخدم نظام **العلامات الملونة الموحد (`Bookmarks` — زر `علامة` ذو الألوان الأربعة: أحمر، أصفر، أخضر، أزرق)** مع إمكانية تخصيص أسمائها وتصفيتها. يُحظر وضع زر ثانٍ باسم «علم» بجانب «علامة» في بطاقة السؤال لمنع الازدواجية البصرية.
   - في **محاكي الاختبار (`ExamSimulator.tsx`)**: يُستخدم زر **«تأجيل للمراجعة» (`flagged`)** في شريط التنقل السفلي للامتحان لتمييز الأسئلة المؤجلة بنقطة برتقالية على لوحة أرقام الأسئلة (`exam-palette`) قبل التسليم النهائي.

5. **حصرية النظري للاختبارات النهائية وعزل المعامل (Theory-Only Final Exam Standard):**
   - المتن الأساسي في كافة الأقسام (السلايدات، الملخص النظري، خلاصة الطوارئ، الجداول، بنك الأسئلة، المستكشف، المحاكي، التعاريف، الأنماط) مخصص **للجانب النظري فقط**.
   - إذا وُجد محتوى عملي سابق لمقرر (مثل `sec`)، يُعزل تماماً في تبويب فرعي مستقل (`LabAppendixView.tsx` — «ملحق المعمل») ولا يختلط بأسئلة أو ملخصات النظري.

6. **المعيار الإلزامي للنشر السحابي بدون VPN (Zero-VPN GitHub Actions Cloud Deployment):**
   - **قاعدة عالمية لا تُكسر:** يُمنع منعاً باتاً تشغيل `npx vercel deploy` أو `vercel --prod` محلياً من جهاز المستخدم.
   - يتم النشر حصراً عبر دفع الكود إلى GitHub (`git push origin main`) ليعمل سير العمل السحابي `.github/workflows/deploy-vercel.yml` تلقائياً، مع مراقبته عبر `gh run watch`.

---

## 1. سجل المقررات المعتمد في المنصة الموحدة (Canonical Subject Registry)

يُدار سجل المقررات في `Unified_Study_Platform/scripts/build-bundles.mjs` ويُصدَّر إلى `public/data/subjects.json`:

| كود المقرر (`code`) | المجلد المصدري (`dir`) | اسم المقرر بالعربية (`name_ar`) | اسم المقرر بالإنجليزية (`name_en`) | أستاذ المقرر (`professor_name`) | الفصل (`term`) | اللون المميز (`accent_color`) | الأيقونة (`icon_name`) | وضع اللغة (`arabic_only`) | حالة المحتوى |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **`toc`** | `TOC_Slides_Viewer` | نظرية الحوسبة | Theory of Computation | د. رويدا العامري | `1` | `#f5b13d` | `cpu` | `false` | كامل (سلايدات + نظري + بنوك + استوديو) |
| **`rm`** | `RM_Viewer` | منهجية البحث العلمي | Research Methodology | أ.د. مالك الجبري | `1` | `#38bdf8` | `compass` | `false` | نظري وبنوك شاملة + استوديو + أنماط |
| **`sec`** | `Sec_Viewer` | أمن المعلومات والشبكات | Information Security | د. عبدالواسع العزاني | `1` | `#fb7185` | `shield` | `false` | كامل + استوديوهات + تعاريف + ملحق معمل |
| **`se`** | `SE_Viewer` | هندسة البرمجيات | Software Engineering | د. عمار الجوفي | `1` | `#34d399` | `layers` | `false` | كامل + استوديوهات هندسية + تعاريف |
| **`pm`** | `PM_Viewer` | إدارة المشاريع | Project Management | د. منصور نعمان | `2` | `#eab308` | `award` | `false` (أو `true` إذا صُرّح بعروبة الاختبار) | كامل (فصل ثانٍ `term: 2`) |
| **`ai`** | `AI_Viewer` | الذكاء الاصطناعي | Artificial Intelligence | د. عبدالكريم البعداني | `1` | `#a78bfa` | `brain` | حسب التصريح | بنوك أسئلة وملخصات |
| **`hci`** | `HCI_Viewer` | تفاعل الإنسان مع الحاسوب | Human-Computer Interaction | د. معتز الشرجبي | `1` | `#f472b6` | `layout` | حسب التصريح | كامل (سلايدات + نظري + بنوك) |
| **`ap`** | `AP_Viewer` | البرمجة المتقدمة | Advanced Programming | د. منير الدعيس | `1` | `#60a5fa` | `code` | حسب التصريح | كامل (نظري الاختبار النهائي) |

---

## 2. الهيكل المعماري لملفات المنصة (`Unified_Study_Platform` File Tree)

```text
Unified_Study_Platform/
├── public/
│   ├── sw.js                           # عامل الخدمة ثنائي الطبقة (Core App Shell + Runtime Slides/Bundles)
│   ├── manifest.json                   # إعدادات تطبيق الويب التقدمي (PWA)
│   ├── data/
│   │   ├── subjects.json               # فهرس المقررات المفعلة وبياناتها الوصفية (SubjectMeta[])
│   │   └── {code}/
│   │       └── bundle.json             # الحزمة الكاملة للمقرر (SubjectBundle)
│   └── slides/
│       └── {code}/
│           └── L{n}/
│               └── slide_{k}.webp      # صور الشرائح المحسنة بصيغة WebP (أو PNG)
├── scripts/
│   └── build-bundles.mjs               # المترجم الحتمي الذي يبني bundle.json و subjects.json وينسخ صور الشرائح
├── src/
│   ├── types/
│   │   └── index.ts                    # عقود TypeScript الصارمة لكافة هياكل البيانات والمكونات
│   ├── lib/
│   │   ├── db.ts                       # قاعدة بيانات Dexie.js (IndexedDB) للكاش المحلي وتقدم الطالب
│   │   ├── dataService.ts              # مدير جلب الحزم (Stale-While-Revalidate) ومزامنة التوائم والعلامات
│   │   └── scrollRestoration.ts        # محرك استعادة التمرير سداسي الإطارات وقنص الشرائح الفوري
│   ├── styles/
│   │   ├── canonical.css               # متغيرات الثيمات الـ 11 والتخطيط الكانوني (.topbar, .layout, .side, .main)
│   │   └── superset.css                # الإيقاع البصري الموحد للمكونات المتقدمة وتجاوب الجوال (@media <= 680px)
│   ├── components/
│   │   ├── common/
│   │   │   ├── UnifiedAppHeader.tsx    # الشريط العلوي، كبسولة التركيز/التكبير، ولوحة الإعدادات المنسدلة (#setPanel)
│   │   │   ├── CompanionNavigation.tsx # القائمة الجانبية المكتبية (.side) وشريط الأقسام السفلي للجوال
│   │   │   ├── PortalModal.tsx         # بوابة التبديل بين المقررات والفصول الدراسية (P)
│   │   │   ├── GlobalSearchModal.tsx   # الباحث الشامل العابر للأقسام (Ctrl+K أو /)
│   │   │   ├── OfflineManagerModal.tsx # محرك التنزيل الأوفلاين الذري المقاوم لتذبذب الشبكات
│   │   │   └── ShortcutsCheatsheetModal.tsx
│   │   ├── slides/
│   │   │   ├── SlidesViewer.tsx        # عارض الشرائح مع البحث الحي وشريط المحاضرات الأفقي
│   │   │   └── LightboxModal.tsx       # عارض التكبير مع الحفاظ على الزوم اليدوي ومزامنة موضع الإغلاق
│   │   ├── summary/
│   │   │   ├── TheoreticalSummaryView.tsx # الملخص النظري المفصل مع جدول المحتويات العائم
│   │   │   └── SummaryOfSummaryView.tsx   # خلاصة الطوارئ 80/20 بنمط «صاحب الدقيقة الأخيرة»
│   │   ├── tables/
│   │   │   └── ExplanatoryTablesView.tsx  # جداول المقارنات بفلتر افتراضي شامل (tblMin = 1)
│   │   ├── questions/
│   │   │   ├── UnifiedQuestionBankView.tsx # بنك الأسئلة الموحد مع مزامنة التوائم والعلامات الـ 4
│   │   │   ├── QuestionCard.tsx           # بطاقة السؤال (ذكي / عربي / إنجليزي / الاثنين) وتفنيد المشتتات
│   │   │   ├── QuestionBankExplorer.tsx   # مستكشف الأسئلة المتقدم (وضع مدمج + وضع كامل + تظليل فوري)
│   │   │   ├── ExamSimulator.tsx          # محاكي الاختبار النهائي مع المؤقت ولوحة الأرقام وتأجيل المراجعة
│   │   │   └── BookmarkLabelModal.tsx     # نافذة تسمية ألوان العلامات الأربع
│   │   ├── definitions/
│   │   │   └── DefinitionsView.tsx        # بنك التعاريف ثلاثي الدرجات (Tiers 1, 2, 3) ووضع الفلاش كارد
│   │   ├── glossary/
│   │   │   └── GlossaryView.tsx           # قاموس المصطلحات (يُخفى تلقائياً في المقررات العربية الخالصة)
│   │   ├── patterns/
│   │   │   └── PatternsLabView.tsx        # مختبر أنماط الدكتور والشفرات السريعة
│   │   ├── interactive/
│   │   │   ├── ConceptStudios.tsx         # الاستوديوهات التفاعلية المتجهية (SVG Vector Studios)
│   │   │   └── InteractiveStudioHost.tsx  # محاكيات الأوتوماتا والآلات الصورية
│   │   └── lab/
│   │       └── LabAppendixView.tsx        # ملحق المعمل المعزول (للمواد ذات العملي المسبق فقط)
│   └── App.tsx                         # النواة المركزية وإدارة الحالة والتوجيه بالـ Hash
```

---

## 3. العقود البرمجية الصارمة لهياكل البيانات (`src/types/index.ts` & `bundle.json`)

يجب أن يطابق ملف `public/data/{code}/bundle.json` العقود التالية بنسبة 100% دون أي حقول ناقصة أو أنواع مختلطة:

### 3.1 البيانات الوصفية للمقرر (`SubjectMeta`)
```typescript
export interface SubjectMeta {
  code: string;                  // كود المقرر بحروف صغيرة: "toc" | "rm" | "sec" | "se" | "pm"
  name_ar: string;               // الاسم العربي الرسمي
  name_en: string;               // الاسم الإنجليزي الرسمي
  term?: 1 | 2;                  // الفصل الدراسي (1 أو 2)
  professor_name: string;        // اسم أستاذ المقرر
  accent_color: string;          // لون الهوية بصيغة Hex (مثل "#eab308")
  icon_name?: string;            // اسم الأيقونة في SvgIcons
  is_active?: boolean;           // true دائماً للمقررات الجاهزة
  arabic_only?: boolean;         // true إذا كان المقرر واختباره بالعربية الخالصة (يلغي كل عناصر الترجمة)
  lectures_count?: number;       // إجمالي عدد المحاضرات
  questions_count?: number;      // إجمالي عدد الأسئلة في البنك
  tables_count?: number;         // إجمالي عدد جداول المقارنات
  bundle_version?: number;       // رقم إصدار الحزمة لإبطال الكاش الذكي
  has_lab?: boolean;             // true فقط إذا كان للمقرر ملحق عملي معزول
  lab_url?: string;
  lab_title?: string;
  data_status?: "full" | "theory-only" | "skeleton";
}
```

### 3.2 المحاضرات والشرائح (`Lecture` & `SlideItem`)
```typescript
export interface Lecture {
  id: string;                    // "L1", "L2", ...
  lecture_num: number;           // 1, 2, ...
  title_ar: string;              // عنوان المحاضرة بالعربية
  title_en: string;              // عنوان المحاضرة بالإنجليزية (أو مطابق للعربي في arabic_only)
  slides_count: number;          // عدد شرائح المحاضرة
}

export interface SlideItem {
  id: string;                    // "{code}-L1-S001"
  ref: string;                   // المرجع الكانوني: "L1-S001" (3 خانات رقمية بـ Zero-padding)
  lecture_id: string;            // "L1"
  slide_num: number;             // 1
  title?: string;                // عنوان الشريحة
  image_url: string;             // "/slides/{code}/L1/slide_1.webp"
  content_en: string;            // النص المستخرج من الشريحة
  content_ar: string;            // الترجمة العربية للشريحة (يُترك "" إذا كان arabic_only: true)
  notes_ar?: string;             // الشرح الأكاديمي المعمق بالعربية
  explanation_points?: string[]; // نقاط الفهم السريع المهيكلة
  exam_tip?: string;             // الوقفة الامتحانية المركزة على الشريحة
}
```

### 3.3 الأسئلة الموحدة وتفنيد المشتتات ثنائي الأبعاد (`UnifiedQuestion`)
```typescript
export interface DistractorItem {
  option_index: number;          // فهرس الخيار الخاطئ (0..3)
  option_text: string;           // نص الخيار الخاطئ
  why_wrong: string;             // لماذا هذا الخيار خاطئ علمياً في سياق السؤال؟
  when_correct: string;          // متى يكون هذا الخيار صحيحاً؟ (تغطية 4 أسئلة في سؤال واحد)
}

export interface UnifiedQuestion {
  id: string;                    // "{code}_{model_id}_q{orig_q_num}"
  subject_code: string;          // "{code}"
  model_id: string;              // "m1" | "m2" | ... | "ai_pred"
  orig_q_num: number;            // رقم السؤال التسلسلي داخل النموذج (1..N)
  lecture_id?: string;           // "L1"
  type: "mcq" | "tf" | "essay";  // نوع السؤال
  source_tag: "doctor_model" | "ai_predictive" | "exercises";
  source_badge_ar?: string;      // مثل: "نموذج الدكتور 1" أو "[تنبؤي AI]"
  telegram_msg_id?: number;      // رقم رسالة تيليجرام للنماذج الرسمية
  telegram_url?: string;         // رابط رسالة تيليجرام الرسمي
  question_en: string;           // نص السؤال (في arabic_only يوضع النص العربي المعتمد هنا أيضاً)
  question_ar?: string;          // الترجمة العربية لنص السؤال (في arabic_only يطابق question_en أو يُترك فارغاً)
  question_smart_html?: string;  // نص السؤال المزود بـ <span class="hover-ar" data-ar="..."> (يُمنع في arabic_only)
  options_en: string[];          // مصفوفة الخيارات (4 خيارات لـ mcq، أو ["True", "False"] لـ tf، وفي arabic_only تكون بالعربية)
  options_ar: string[];          // ترجمة الخيارات للعربية
  correct_answer: number;        // فهرس الإجابة الصحيحة (0..3 لـ mcq، و 0 أو 1 لـ tf)
  why_correct: string;           // التعليل العلمي الدقيق لصحة الجواب بالعربية الصافية
  distractor_analysis: DistractorItem[]; // تحليل ثنائي الأبعاد لكافة الخيارات الخاطئة
  exam_tip?: string;             // شفرة الحل السريع في 5 ثوانٍ (Triggers)
  slide_ref?: string;            // مرجع الشريحة المرتبطة مثل "L1-S005"
  twin_group_id?: string;        // معرف مجموعة الأسئلة التوائم المتطابقة للمزامنة اللحظية
}
```

### 3.4 الملخص النظري، خلاصة الطوارئ، الجداول، والتعاريف
- **الملخص النظري (`TheoreticalSummary`):** يتكون من `parts: SummaryPart[]`، وكل جزء يمثل محاضرة كاملة (`id: "L1"`, `lecture_id: "L1"`, `blocks: SummaryBlock[]`) تشمل كتل `p`, `ul`, `steps`, `callout`, `formula`, `comparison`, `code`, `diagram`, و`studio_Trigger`.
- **خلاصة الطوارئ 80/20 (`EmergencySheet`):** تتكون من `sections: EmergencySection[]` مصممة بأسلوب «صاحب الدقيقة الأخيرة» مع بطاقات `cards` وشفرات `shortcuts` ومصائد `traps`.
- **جداول المقارنات (`ExplanatoryTable[]`):** مصفوفة جداول تحتوي على `id`, `title_ar`, `lecture_id`, `headers: string[]`, `rows: string[][]`, `slide_ref`, و`exam_note`.
- **بنك التعاريف ثلاثي الدرجات (`DefinitionBank`):** يحتوي على `items: DefinitionItem[]` مصنفة حسب `importance: 1 | 2 | 3` (درجة أولى حتمية، درجة ثانية داعمة، درجة ثالثة تكميلية)، مع `triggers: Array<{ en: string; ar: string }>` و`exam_pitfall: { en?: string; ar: string }` و`ref: "L1-S005"`.

---

## 4. البروتوكول التفصيلي للوضع العربي الخالص (`arabic_only: true` Protocol)

متى يُفعَّل هذا البروتوكول؟
- **تلقائياً وفوراً** إذا قال المستخدم عبارات مثل:
  - *«المادة الفلانية اختبارها عربي وسلايداتها عربي»*
  - *«هذه المادة بالعربي فقط / لا تحتاج ترجمة»*
- أو إذا كان الحقل `arabic_only: true` مضبوطاً في تعريف المقرر داخل `scripts/build-bundles.mjs` أو `bundle.meta.arabic_only`.

### جدول الفروقات الحتمية بين المقرر ثنائي اللغة والمقرر العربي الخالص:

| المحور | المقرر ثنائي اللغة (`arabic_only: false`) | المقرر العربي الخالص (`arabic_only: true`) |
| :--- | :--- | :--- |
| **ملفات السلايدات (`slides`)** | `content_en` يحتوي النص الإنجليزي، و`content_ar` يحتوي الترجمة العربية الكاملة سطراً بسطر. | `content_en` يحتوي النص العربي للشريحة، و`content_ar` يُترك فارغاً `""`. **يُلغى توليد `L{n}_ar.js` تماماً.** |
| **وكيل الترجمة (`Stage D`)** | يعمل `Batch_Translation_Agent` لترجمة `question_en` و`options_en` وبناء `question_smart_html`. | **يُلغى `Batch_Translation_Agent` تماماً (0 استدعاء).** |
| **نصوص الأسئلة والخيارات** | `question_en` بالإنجليزية + `question_ar` بالعربية + `options_en` بالإنجليزية + `options_ar` بالعربية. | يُكتب السؤال العربي في `question_en` و`question_ar`، والخيارات العربية في `options_en` و`options_ar` (وللصواب والخطأ: `["صواب", "خطأ"]`). `question_smart_html` = `undefined`. |
| **قاموس المصطلحات (`glossary`)** | يُولَّد كائن `glossary` لربط المصطلحات الإنجليزية بترجماتها العربية. | **`bundle.glossary = undefined`** ويُخفى تبويب القاموس من الواجهة (`availableViews.glossary = false`). |
| **أزرار اللغة في الواجهة (`React UI`)** | تظهر أزرار `ذكي / English / عربي` في التوبار والإعدادات، وأزرار `ترجمة الكل` و`ترجمة` في السلايدات والتعاريف. | **تختفي جميع أزرار ومبدلات ولوحات الترجمة بنسبة 100%** من التوبار، الإعدادات، السلايدات، بطاقة السؤال، المستكشف، وبنك التعاريف. |

---

## 5. المعايير الرياضية والإحصائية المحسوبة لبنك الأسئلة (Mathematical Question Bank Standards)

كل نموذج أسئلة تنبؤي (`model_id: "ai_pred"` أو `source_tag: "ai_predictive"`) يخضع لمعادلات رياضية صارمة تُفحص آلياً في بوابات التحقق:

### 5.1 معادلة تصفير انحياز الخيار الأطول (0% Longest-Option Bias Formula)
تميل النماذج اللغوية غريزياً إلى جعل الإجابة الصحيحة أطول وأدق تفصيلاً من المشتتات. لمنع الطالب من معرفة الجواب بمجرد النظر لطول السطر، يجب أن يحقق كل سؤال اختيار من متعدد (`type: "mcq"`) المتباينة الرياضية التالية:

$$\Delta L(q) = \max_{i \in \{0, 1, 2, 3\}} \left| \text{len}(O_{\text{correct}}) - \text{len}(O_i) \right| \le 15 \text{ حرفاً}$$

حيث $\text{len}(O_i)$ هو عدد أحرف الخيار $i$ بعد إزالة المسافات الزائدة (`trim()`). إذا زاد الفرق عن 15 حرفاً، يجب تكثيف الخيار الصحيح أو إثراء المشتتات بتفاصيل أكاديمية موازية في الطول والتركيب النحوي.

### 5.2 معادلة التوزيع الإحصائي المتكافئ لمواضع الإجابة (Uniform Answer Distribution)
في أسئلة الاختيار من متعدد (`type: "mcq"` ذات 4 خيارات)، يجب أن يتوزع الفهرس الصحيح `correct_answer` $\in \{0, 1, 2, 3\}$ بالتساوي الإحصائي:

$$P(\text{correct\_answer} = k) = \frac{\text{count}(k)}{N_{\text{mcq}}} \in [0.20, 0.30] \quad \forall k \in \{0, 1, 2, 3\}$$

أي بنسبة مثالية **25% لكل خيار (A, B, C, D)** وبهامش سماح أقصى $\pm 5\%$.

### 5.3 نسبة أسئلة الصواب والخطأ وفخاخ العكس المنهجي (True/False Ratio & Trap Density)
يجب أن تمثل أسئلة الصواب والخطأ (`type: "tf"`) ما بين **30% إلى 40%** من إجمالي الأسئلة التنبؤية:

$$0.30 \le \frac{N_{\text{tf}}}{N_{\text{total\_pred}}} \le 0.40, \qquad P(\text{correct\_answer} = 1 \text{ [False]}) \in [0.45, 0.55]$$

مع التركيز في عبارات الخطأ على **فخاخ القواعد المعكوسة (Inverted Rules)**، مثل تبديل القيود الزمنية، أو عكس علاقة السبب بالنتيجة، أو الخلط بين مصطلحين متجاورين في نفس الشريحة.

### 5.4 اكتمال مصفوفة تفنيد المشتتات ثنائية الأبعاد (2D Distractor Completeness)
لكل سؤال اختيار من متعدد (`type: "mcq"`):
- عدد عناصر `distractor_analysis` يساوي تماماً $K - 1$ (أي 3 عناصر عندما يكون عدد الخيارات 4).
- كل عنصر يحتوي حتماً على حقلين غير فارغين:
  1. `why_wrong` ($\ge 20$ حرفاً): يوضح العلة العلمية لخطأ هذا الخيار في السؤال الحالي.
  2. `when_correct` ($\ge 20$ حرفاً): يوضح الحالة أو السؤال البديل الذي يجعل هذا الخيار هو الجواب الصحيح.

---

## 6. مصفوفة الإيقاع البصري والتجاوب المحسوبة (`superset.css` Calculated Rhythm Matrix)

لضمان التناغم البصري المطلق بين كافة الأقسام الـ 10 (السلايدات، الملخص، الطوارئ، الجداول، بنك الأسئلة، المستكشف، محاكي الاختبار، بنك التعاريف، الأنماط، والاستوديوهات)، تلتزم جميع الحاويات والبطاقات بالمقاييس المحسوبة التالية في `src/styles/canonical.css` و`src/styles/superset.css`:

| العنصر / الحاوية | القياس المكتبي (`Desktop > 680px`) | قياس الجوال (`@media (max-width: 680px)`) | الغرض الهندسي |
| :--- | :--- | :--- | :--- |
| **حاوية المتن `.main`** | `padding: 28px 34px 90px` · `max-width: 1180px` | `padding: 14px 12px 96px` | توفير أقصى مساحة أفقية للقراءة على شاشات الهواتف |
| **الترويسة الكانونية `.headline`** | `margin-bottom: 22px` · `padding-bottom: 16px` | `margin-bottom: 14px` · `padding-bottom: 12px` | توحيد مطلع كافة الأقسام مع شارة `.kicker` والنقطة المضيئة `.dot` |
| **عنوان القسم `.headline h1`** | `clamp(1.38rem, 2.3vw, 1.95rem)` · `font-weight: 800` | `1.3rem` · `line-height: 1.3` | منع انكسار العناوين الطويلة في الجوال |
| **وصف القسم `.headline .sub`** | `font-size: 0.92rem` · `max-width: 72ch` | `font-size: 0.84rem` · `line-height: 1.6` | إيقاع قراءة مريح ومتسق |
| **البطاقة القياسية `.card` / `.q-card`** | `padding: 20px 22px` · `border-radius: var(--r-l)` (`16px`) | `padding: 14px 13px` · `border-radius: 14px` | تطابق تام بين بطاقة السؤال وبطاقات الملخص والمستكشف والمحاكي |
| **نص السؤال الإنجليزي `.q-stem-en`** | `font-size: 1.02rem` · `line-height: 1.65` · `font-weight: 600` | `font-size: 0.95rem` · `line-height: 1.58` | وضوح فائق للمصطلحات التقنية |
| **نص السؤال العربي `.q-stem-ar`** | `font-size: 0.98rem` · `line-height: 1.75` · `font-weight: 700` | `font-size: 0.92rem` · `line-height: 1.68` | قراءة عربية مريحة بخط `Tajawal` / `Cairo` |
| **شبكة المستكشف `.explorer-results-grid`** | `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))` · `gap: 12px` | `grid-template-columns: 1fr` · `gap: 10px` | عمود واحد كامل العرض في الجوال لمنع انضغاط النصوص |
| **بطاقة المستكشف `.explorer-card`** | `padding: 16px 18px` · عنوان `0.95rem` (EN) و`0.9rem` (AR) | `padding: 13px 12px` · عنوان `0.9rem` (EN) و`0.86rem` (AR) | تناغم خطي مباشر مع `.q-card` |
| **لوحة إعداد المحاكي `.exam-setup`** | `padding: 22px` · شبكة `minmax(220px, 1fr)` | `padding: 15px 13px` · عمود واحد `1fr` | سهولة اختيار النطاق والوقت بإبهام اليد |
| **شريط المحاكي الحي `.exam-hud`** | `padding: 14px 18px` · عداد `1.05rem` | `padding: 12px 13px` · عداد `0.92rem` | عدم حجب مساحة السؤال أثناء الحل على الجوال |
| **إحصاءات التعاريف `.def-hero-stats`** | `repeat(auto-fit, minmax(135px, 1fr))` · `gap: 10px` | `repeat(3, minmax(0, 1fr))` (3 أعمدة × صفين) · `gap: 7px` | عرض البطاقات الإحصائية الـ 6 في صفين أنيقين بدلاً من تكدسها عمودياً |
| **بطاقة التعريف `.def-card`** | `padding: 18px 20px` · مصطلح `1.08rem` · متن `0.93rem` | `padding: 14px 13px` · مصطلح `0.98rem` · متن `0.88rem` | استيعاب الـ Triggers ومصيدة الامتحان دون تزاحم |

---

## 7. خط أنابيب الوكلاء المتعددين لبناء أو تحديث مقرر (Multi-Agent Execution Pipeline)

عند طلب بناء مقرر جديد أو استكمال مقرر في المنصة، يعمل الوكيل الرئيسي كـ **المهندس المنسق (Orchestrator)** ويدير المراحل التالية بالتوازي المحكوم:

### المرحلة A: الاستكشاف وتحديد وضع اللغة (`Discovery & Language Mode Detection`)
1. فحص الملفات المصدرية للمقرر (عروض PPTX/PDF، بنوك أسئلة، رسائل تيليجرام).
2. تحديد قيمة `arabic_only`:
   - إذا صرّح المستخدم أن سلايدات المادة واختبارها بالعربية -> `arabic_only = true`.
   - إذا كانت المادة تُدرَّس أو تُختبَر بالإنجليزية -> `arabic_only = false`.
3. تحويل ملفات العروض التقديمية (إن وجدت) إلى صور شرائح مرقمة في `Unified_Study_Platform/public/slides/{code}/L{n}/slide_{k}.webp`.

### المرحلة B: استخراج وشرح المحاضرات (`Lecture_Explanation_Agent` — محاضرة لكل وكيل)
- يُطلق وكيل فرعي مستقل لكل محاضرة `L{n}` لتوليد:
  1. كائنات الشرائح `SlideItem[]` الخاصة بالمحاضرة `L{n}`:
     - `content_en`: النص الكامل للشريحة.
     - `content_ar`: إذا كان `arabic_only: true` يُضبط على `""`؛ وإلا تُكتب الترجمة العربية الدقيقة.
     - `notes_ar` + `explanation_points` + `exam_tip`: شرح تعليمي عميق بالعربية مع وقفة امتحانية مركزة وربط مرجعي (`L{n}-S{k}`).
  2. جزء الملخص النظري `SummaryPart` الخاص بالمحاضرة `L{n}` شاملاً كتل الشرح، القوانين، المقارنات، واستدعاءات الاستوديو التفاعلي.

### المرحلة C: بناء الجداول، التعاريف، وخلاصة الطوارئ (`Synthesis_Agent`)
1. **`tables` (`ExplanatoryTable[]`):** استخراج كافة المقارنات الثنائية والمتعددة وتصنيفات المفاهيم في جداول مهيكلة مرتبطة بأرقام الشرائح `slide_ref`.
2. **`definitions` (`DefinitionBank`):** بناء بنك التعاريف مصنفاً إلى الدرجات الثلاث (`importance: 1 | 2 | 3`) مع مفاتيح الحل في 5 ثوانٍ (`triggers`) ومصيدة الامتحان (`exam_pitfall`).
3. **`emergency` (`EmergencySheet`):** بناء خلاصة الإنقاذ 80/20 بنمط «صاحب الدقيقة الأخيرة» (`sections`, `cards`, `shortcuts`, `traps`).
4. **`patterns` (`PatternsData`):** استخلاص بصمة الدكتور في صياغة الأسئلة والشفرات السريعة.
5. **`glossary` (`GlossaryData`):** يُبنى **فقط إذا كان `arabic_only: false`**؛ ويُتخطى تماماً إذا كان `arabic_only: true`.

### المرحلة D: بناء وتدقيق بنك الأسئلة (`Question_Bank_Agent`)
1. **النماذج الرسمية للدكتور (`doctor_model`):**
   - تُنقل حرفياً كما وردت مع توثيق `telegram_msg_id` و`telegram_url`.
   - يُضاف لكل سؤال: `why_correct`، `distractor_analysis` ثنائي الأبعاد (`why_wrong` + `when_correct`)، `exam_tip`، و`slide_ref`.
2. **النموذج التنبؤي الشامل (`ai_pred` — `source_tag: "ai_predictive"`):**
   - يُوسم بشفافية بـ `source_badge_ar: "[تنبؤي AI]"` وبـ `telegram_msg_id: undefined`.
   - يلتزم حرفياً بمعادلات القسم 5 ($\Delta L \le 15$ حرفاً، توزيع الإجابات $25\% \pm 5\%$، نسبة الصواب والخطأ $30\%–40\%$).
3. **شرط الترجمة (`Batch_Translation_Agent`):**
   - **إذا كان `arabic_only: true`:** يُلغى وكيل الترجمة نهائياً؛ وتوضع النصوص والخيارات العربية مباشرة في الحقول المعتمدة دون أي ترجمة إنجليزية.
   - **إذا كان `arabic_only: false`:** تُترجم الأسئلة والخيارات للعربية الصافية (خالية من الحشو الإنجليزي بين أقواس عبر `cleanArabicOnly`) ويُبنى `question_smart_html`.

### المرحلة E: بناء الاستوديو التفاعلي (`Interactive_SVG_Studio_Agent`)
- إضافة أو تحديث الاستوديو التفاعلي الخاص بالمقرر داخل `src/components/interactive/ConceptStudios.tsx` (أو `InteractiveStudioHost.tsx`) باستخدام رسوم `SVG Vector Line-Art` المحسوبة رياضياً وصفر إيموجيات، وتفعيل كود المقرر في مصفوفة `availableViews.interactive` داخل `src/App.tsx`.

---

## 8. بوابات التحقق الحتمية بالسكربتات (Deterministic Verification Gates)

لا يُسمح باعتبار أي مقرر مكتمل البناء أو دفعه للنشر قبل اجتياز البوابات البرمجية الأربع التالية بنتيجة `PASS`:

### Gate 1: بوابة حظر الإيموجيات الشاملة (Zero-Emoji Gate)
```powershell
node -e "
const fs = require('fs');
const path = require('path');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(full);
    else if (/\.(tsx?|css|json|mjs)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (emojiRegex.test(content)) { console.error('FAIL Emoji found in:', full); process.exit(1); }
    }
  }
}
scan('d:/Collage/CS3/All/HW/Unified_Study_Platform/src');
scan('d:/Collage/CS3/All/HW/Unified_Study_Platform/public/data');
console.log('PASS Gate 1: Zero Emojis verified across src and public/data.');
"
```

### Gate 2: بوابة اكتمال الحزمة وفحص وضع اللغة (`Bundle Integrity & Arabic-Only Gate`)
```powershell
node -e "
const fs = require('fs');
const code = process.env.SUBJECT_CODE || 'pm';
const bundle = JSON.parse(fs.readFileSync('d:/Collage/CS3/All/HW/Unified_Study_Platform/public/data/' + code + '/bundle.json', 'utf8'));
const isArOnly = Boolean(bundle.meta.arabic_only);
console.log('Checking subject:', code, 'arabic_only:', isArOnly);
if (!bundle.meta.code || !bundle.meta.name_ar) throw new Error('Missing meta fields');
if (!Array.isArray(bundle.questions) || bundle.questions.length === 0) throw new Error('Empty questions');
if (isArOnly && bundle.glossary) throw new Error('arabic_only subject must NOT have a glossary');
for (const q of bundle.questions) {
  if (q.type === 'mcq') {
    if (!Array.isArray(q.distractor_analysis) || q.distractor_analysis.length < q.options_en.length - 1) {
      throw new Error('Incomplete distractor_analysis on ' + q.id);
    }
    for (const d of q.distractor_analysis) {
      if (!d.why_wrong || !d.when_correct) throw new Error('Missing 2D distractor fields on ' + q.id);
    }
  }
  if (!isArOnly && !q.question_ar) throw new Error('Missing question_ar on bilingual course question ' + q.id);
}
console.log('PASS Gate 2: Bundle schema and language mode verified.');
"
```

### Gate 3: بوابة التدقيق الإحصائي للأسئلة التنبؤية (`AI Predictive Statistical Gate`)
```powershell
node -e "
const fs = require('fs');
const code = process.env.SUBJECT_CODE || 'pm';
const bundle = JSON.parse(fs.readFileSync('d:/Collage/CS3/All/HW/Unified_Study_Platform/public/data/' + code + '/bundle.json', 'utf8'));
const aiQs = bundle.questions.filter(q => q.source_tag === 'ai_predictive' || q.model_id === 'ai_pred');
if (aiQs.length > 0) {
  const mcqs = aiQs.filter(q => q.type === 'mcq');
  const counts = [0, 0, 0, 0];
  let biasViolations = 0;
  for (const q of mcqs) {
    counts[q.correct_answer] = (counts[q.correct_answer] || 0) + 1;
    const lens = q.options_en.map(o => o.trim().length);
    const correctLen = lens[q.correct_answer];
    const maxOther = Math.max(...lens.filter((_, idx) => idx !== q.correct_answer));
    if (correctLen - maxOther > 15) biasViolations++;
  }
  console.log('AI MCQ distribution:', counts, 'Longest-option bias violations (>15 chars):', biasViolations);
  if (biasViolations > 0) throw new Error('Longest-option bias detected in ' + biasViolations + ' questions');
}
console.log('PASS Gate 3: Statistical & Anti-Bias checks passed.');
"
```

### Gate 4: بوابة البناء الصارم لـ TypeScript و Vite وتحديث إصدار الـ PWA (`Build & Cache-Busting Gate`)
1. عند أي تعديل في الكود أو الحزم، يجب رفع إصدار الكاش المتزامن في:
   - `Unified_Study_Platform/public/sw.js` (`CORE_CACHE = "usp-core-v{N}"` و`RUNTIME_CACHE = "usp-runtime-v{N}"`)
   - `Unified_Study_Platform/src/lib/dataService.ts` (`?v={N}`)
2. تشغيل فحص البناء الكامل:
   ```powershell
   cd d:\Collage\CS3\All\HW\Unified_Study_Platform
   npm run build
   ```
   ويجب أن ينجح بـ `0 errors` في كل من `tsc -b` و`vite build`.

---

## 9. بروتوكول النشر السحابي الإلزامي عبر GitHub Actions (Zero-VPN Cloud Deployment)

> **تحذير صارم:** يُحظر تشغيل `vercel --prod` محلياً تحت أي ظرف.

بعد نجاح البوابات الأربع (`Gates 1–4`):
1. التأكد من وجود سير العمل السحابي `.github/workflows/deploy-vercel.yml` في مستودع `Unified_Study_Platform` (أو تهيئته عبر السكربت الموحد `node "C:/Users/KorosSama/.gemini/config/skills/vercel-cloud-deploy/scripts/setup_vercel_ci.mjs"`).
2. تنفيذ الالتزام والدفع إلى GitHub:
   ```powershell
   cd d:\Collage\CS3\All\HW\Unified_Study_Platform
   git add -A
   git commit -m "feat: update unified study platform bundle and components"
   git push origin main
   ```
3. مراقبة سير عمل GitHub Actions حتى يكتمل النشر السحابي بنجاح:
   ```powershell
   gh run list --limit 1
   gh run watch
   ```
4. التحقق من حصول الخطوة `Deploy to Vercel (Production)` على علامة النجاح، وتسليم الرابط الحي للمستخدم.

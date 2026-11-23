// ==============================================================================
// المنصة التعليمية الموحدة — بوابة فحص سلامة البيانات والصور (CI Data Gate)
// Verifies subjects.json, all bundles, unique question IDs, answer bounds,
// slide/lab image existence on disk, page_layout validity, and XSS safety.
// ==============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, "../public");
const SUBJECTS_PATH = path.join(PUBLIC_DIR, "data", "subjects.json");

const errors = [];
const stats = [];

function checkImageExists(relUrl, label) {
  if (!relUrl) return;
  const cleaned = String(relUrl).replace(/^\/+/, "");
  const fullPath = path.join(PUBLIC_DIR, cleaned);
  if (!fs.existsSync(fullPath)) {
    errors.push(`[Missing Image] ${label}: ${relUrl}`);
  }
}

function main() {
  if (!fs.existsSync(SUBJECTS_PATH)) {
    console.error("FATAL: public/data/subjects.json not found.");
    process.exit(1);
  }

  let subjects;
  try {
    subjects = JSON.parse(fs.readFileSync(SUBJECTS_PATH, "utf-8"));
  } catch (err) {
    console.error("FATAL: Invalid JSON in public/data/subjects.json:", err.message);
    process.exit(1);
  }

  if (!Array.isArray(subjects) || subjects.length === 0) {
    errors.push("subjects.json must be a non-empty array.");
  }

  const seenSubjectCodes = new Set();

  for (const subj of subjects) {
    if (!subj.code) {
      errors.push("Subject entry missing 'code'.");
      continue;
    }
    if (seenSubjectCodes.has(subj.code)) {
      errors.push(`Duplicate subject code in subjects.json: ${subj.code}`);
    }
    seenSubjectCodes.add(subj.code);

    if (subj.page_layout && !["slides", "book"].includes(subj.page_layout)) {
      errors.push(`[${subj.code}] Invalid page_layout: ${subj.page_layout}`);
    }

    const bundlePath = path.join(PUBLIC_DIR, "data", subj.code, "bundle.json");
    if (!fs.existsSync(bundlePath)) {
      errors.push(`[${subj.code}] Missing bundle.json at ${bundlePath}`);
      continue;
    }

    const rawText = fs.readFileSync(bundlePath, "utf-8");
    if (/<script\b/i.test(rawText)) {
      errors.push(`[${subj.code}] Unsafe <script> tag detected in bundle.json`);
    }

    let bundle;
    try {
      bundle = JSON.parse(rawText);
    } catch (err) {
      errors.push(`[${subj.code}] Invalid JSON in bundle.json: ${err.message}`);
      continue;
    }

    if (bundle.meta?.code !== subj.code) {
      errors.push(`[${subj.code}] bundle.meta.code mismatch (${bundle.meta?.code})`);
    }
    if (bundle.meta?.bundle_version !== subj.bundle_version) {
      errors.push(
        `[${subj.code}] bundle_version mismatch: subjects.json=${subj.bundle_version} vs bundle.json=${bundle.meta?.bundle_version}`
      );
    }

    // 1. Validate questions
    const seenQIds = new Set();
    const questions = Array.isArray(bundle.questions) ? bundle.questions : [];
    for (const q of questions) {
      if (!q.id) {
        errors.push(`[${subj.code}] Question missing id`);
        continue;
      }
      if (seenQIds.has(q.id)) {
        errors.push(`[${subj.code}] Duplicate question id: ${q.id}`);
      }
      seenQIds.add(q.id);

      if (q.type !== "essay") {
        const opts = Array.isArray(q.options_en) ? q.options_en : [];
        if (opts.length < 2) {
          errors.push(`[${subj.code}] Question ${q.id} has fewer than 2 options`);
        }
        if (
          typeof q.correct_answer !== "number" ||
          q.correct_answer < 0 ||
          q.correct_answer >= opts.length
        ) {
          errors.push(
            `[${subj.code}] Question ${q.id} has out-of-bounds correct_answer=${q.correct_answer} (options=${opts.length})`
          );
        }
      }
    }

    // 2. Validate slide images
    const slides = Array.isArray(bundle.slides) ? bundle.slides : [];
    for (const s of slides) {
      checkImageExists(s.image_url, `${subj.code} slide ${s.ref}`);
    }

    // 3. Validate lab slide images
    const labSlides = Array.isArray(bundle.lab?.slides) ? bundle.lab.slides : [];
    for (const ls of labSlides) {
      checkImageExists(ls.image_url, `${subj.code} lab ${ls.ref}`);
    }

    stats.push(
      `  ✓ ${subj.code.toUpperCase().padEnd(4)} | layout=${(subj.page_layout || "slides").padEnd(6)} | v${subj.bundle_version} | slides=${String(slides.length).padStart(3)} | lab=${String(labSlides.length).padStart(3)} | questions=${String(questions.length).padStart(3)}`
    );
  }

  console.log("Unified Study Platform — Data Integrity Check");
  stats.forEach((line) => console.log(line));

  if (errors.length > 0) {
    console.error(`\nFAILED with ${errors.length} error(s):`);
    errors.slice(0, 40).forEach((e) => console.error(`  ✗ ${e}`));
    if (errors.length > 40) console.error(`  ... and ${errors.length - 40} more`);
    process.exit(1);
  }

  console.log(`\nPASSED: All ${subjects.length} subjects verified with 0 errors.`);
}

main();

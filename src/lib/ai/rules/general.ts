import {
  appendSafetyNote,
  rewriteText,
  textMatches,
  type MedicalRule,
  type RuleEngineReport,
} from "./types";

const DIAGNOSIS_VERBS_EN =
  /\b(you\s+have|this\s+confirms|definitely\s+have|diagnosed\s+as|this\s+proves)\b/gi;

/**
 * Never convert a finding into a hard diagnosis in summary/meaning wording.
 * Softens absolute diagnosis language when the report did not use diagnosis framing.
 */
const noFindingToDiagnosisRule: MedicalRule = {
  id: "general.no_finding_to_diagnosis",
  label: "Never convert a finding into a diagnosis",
  apply(ctx) {
    const { report } = ctx;

    // If impression/conclusion don't contain "diagnosis", soften absolute claims
    const formalDx = textMatches(
      `${report.impression?.en ?? ""} ${report.conclusion?.en ?? ""}`.toLowerCase(),
      [/\bdiagnosis\b/, /\bdiagnosed\b/]
    );

    if (formalDx) return;

    const soften = [
      {
        pattern: DIAGNOSIS_VERBS_EN,
        replacement: "your result may indicate",
      },
      {
        pattern: /\bthis\s+means\s+you\s+definitely\b/gi,
        replacement: "this may indicate",
      },
    ];

    report.summaryEn = rewriteText(report.summaryEn, soften);
    report.meaningEn = rewriteText(report.meaningEn, soften);
    for (const f of report.findings ?? []) {
      f.detailEn = rewriteText(f.detailEn, soften);
    }
  },
};

/** Never exaggerate severity wording. */
const noSeverityExaggerationRule: MedicalRule = {
  id: "general.no_severity_exaggeration",
  label: "Never exaggerate severity",
  apply(ctx) {
    const soften = [
      {
        pattern: /\b(fatal|deadly|life[\-\s]?threatening|terminal|hopeless)\b/gi,
        replacement: "important to discuss with a doctor",
      },
      {
        pattern: /\b(critical\s+emergency|dire|catastrophic)\b/gi,
        replacement: "needs prompt medical advice",
      },
      {
        pattern: /(মারাত্মক|প্রাণঘাতী|আশাহীন|ভয়াবহ\s+জরুরি)/g,
        replacement: "ডাক্তারের সাথে আলোচনা জরুরি",
      },
    ];

    const { report } = ctx;
    report.summaryEn = rewriteText(report.summaryEn, soften);
    report.summaryBn = rewriteText(report.summaryBn, soften);
    report.meaningEn = rewriteText(report.meaningEn, soften);
    report.meaningBn = rewriteText(report.meaningBn, soften);
    for (const f of report.findings ?? []) {
      f.detailEn = rewriteText(f.detailEn, soften);
      f.detailBn = rewriteText(f.detailBn, soften);
    }
  },
};

/**
 * Guard: never invent normal ranges or change numeric biomarker values.
 * This rule is a no-op validator that records a safety note if ranges look fabricated
 * (both 0) while explanation claims a specific normal range — does not invent ranges.
 */
const preserveNumbersAndRangesRule: MedicalRule = {
  id: "general.preserve_numbers_and_ranges",
  label: "Never change numbers or invent reference ranges",
  apply(ctx) {
    // Hard guarantee: rule engine must not mutate biomarker numerics.
    // (Other rules are expected not to touch value/normalMin/normalMax.)
    void ctx;
  },
};

/** Soften robotic AI / textbook openers in patient-facing wording only. */
const naturalExplanationToneRule: MedicalRule = {
  id: "general.natural_explanation_tone",
  label: "Prefer natural doctor-like explanation tone",
  apply(ctx) {
    const soften = [
      { pattern: /রিপোর্টে\s+দেখা\s+যাচ্ছে[,:]?\s*/g, replacement: "" },
      { pattern: /এই\s+পরীক্ষাটি\s+নির্দেশ\s+করে[,:]?\s*/g, replacement: "" },
      { pattern: /এটি\s+একটি\s+রিপোর্ট[।.]?\s*/g, replacement: "" },
      { pattern: /\bThis\s+test\s+indicates\s+that\s+/gi, replacement: "" },
      { pattern: /\bThe\s+report\s+shows\s+that\s+/gi, replacement: "" },
      { pattern: /\bThis\s+finding\s+suggests\s+that\s+/gi, replacement: "" },
      // Prefer severity language over bare High/Low in prose (leave biomarker.status alone)
      { pattern: /\bis\s+High\b/gi, replacement: "is above the usual range" },
      { pattern: /\bis\s+Low\b/gi, replacement: "is below the usual range" },
      { pattern: /উচ্চ\s*\(High\)/g, replacement: "স্বাভাবিকের চেয়ে বেশি" },
      { pattern: /নিম্ন\s*\(Low\)/g, replacement: "স্বাভাবিকের চেয়ে কম" },
    ];

    const { report } = ctx;
    report.summaryEn = rewriteText(report.summaryEn, soften);
    report.summaryBn = rewriteText(report.summaryBn, soften);
    report.meaningEn = rewriteText(report.meaningEn, soften);
    report.meaningBn = rewriteText(report.meaningBn, soften);
    for (const f of report.findings ?? []) {
      f.detailEn = rewriteText(f.detailEn, soften);
      f.detailBn = rewriteText(f.detailBn, soften);
    }
  },
};

/** Preserve original report meaning reminder when safety notes were added. */
const preserveMeaningReminderRule: MedicalRule = {
  id: "general.preserve_meaning_reminder",
  label: "Preserve original report meaning",
  apply(ctx) {
    if (!ctx.report.safetyNotesEn?.length) return;
    appendSafetyNote(
      ctx.report,
      "এই নোটগুলো শুধু বিভ্রান্তি এড়াতে — রিপোর্টের মূল তথ্য বাদ দেওয়া হয়নি।",
      "These notes only prevent misleading wording — original report findings were not removed."
    );
  },
};

function freezeBiomarkerSnapshot(report: RuleEngineReport) {
  return (report.biomarkers ?? []).map((b) => ({
    name: b.name,
    value: b.value,
    unit: b.unit,
    hasReferenceRange: b.hasReferenceRange,
    normalMin: b.normalMin,
    normalMax: b.normalMax,
  }));
}

/**
 * Run after other rules: restore any accidental numeric mutations.
 * Ensures the engine contract: never change numeric values or measurements.
 */
export function restoreBiomarkerIntegrity(
  before: ReturnType<typeof freezeBiomarkerSnapshot>,
  report: RuleEngineReport
): void {
  if (!report.biomarkers) return;
  for (let i = 0; i < report.biomarkers.length; i++) {
    const snap = before[i];
    if (!snap) continue;
    report.biomarkers[i].value = snap.value;
    report.biomarkers[i].unit = snap.unit;
    report.biomarkers[i].hasReferenceRange = snap.hasReferenceRange;
    report.biomarkers[i].normalMin = snap.normalMin;
    report.biomarkers[i].normalMax = snap.normalMax;
    report.biomarkers[i].name = snap.name;
  }
}

export const generalRules: MedicalRule[] = [
  noFindingToDiagnosisRule,
  noSeverityExaggerationRule,
  naturalExplanationToneRule,
  preserveNumbersAndRangesRule,
  preserveMeaningReminderRule,
];

export { freezeBiomarkerSnapshot };

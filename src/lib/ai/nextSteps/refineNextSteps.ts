/**
 * Refine patient next-steps arrays — pure TypeScript, no AI.
 * Enforces safety limits without inventing clinical advice.
 */

import {
  NEXT_STEPS_DISCLAIMER_BN,
  NEXT_STEPS_DISCLAIMER_EN,
} from "@/lib/ai/prompts/patientNextSteps";

export type NextStepFindingStatus = "normal" | "concern" | "info";

export interface NextStepsFinding {
  status?: NextStepFindingStatus;
  titleEn?: string;
  titleBn?: string;
  detailEn?: string;
  detailBn?: string;
}

export interface RefineNextStepsInput {
  nextStepsBn?: string[];
  nextStepsEn?: string[];
  findings?: NextStepsFinding[];
  ocrWarnings?: string[];
  imageQuality?: string;
  isPartialImage?: boolean;
  /** Optional printed recommendation text from the report */
  recommendationBn?: string;
  recommendationEn?: string;
}

export interface RefinedNextSteps {
  nextStepsBn: string[];
  nextStepsEn: string[];
  warnings: string[];
}

const MAX_ITEMS = 5; // includes disclaimer as final item when present

const DRUG_PATTERNS: RegExp[] = [
  /\b(mg|mcg|µg|ml|tablet|capsule|syrup|injection|dose|bid|tid|qid)\b/i,
  /\b(metformin|amoxicillin|paracetamol|acetaminophen|ibuprofen|omeprazole|atorvastatin|levothyroxine|insulin|antibiotic|steroid)\b/i,
  /\b(take\s+\d+|prescrib(e|ed)|medication|medicine\s+name)\b/i,
  /(ট্যাবলেট|ক্যাপসুল|সিরাপ|ইনজেকশন|ওষুধ|মাত্রা|মিলিগ্রাম)/,
];

const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byou\s+have\b/i,
  /\bdiagnosed\s+with\b/i,
  /\bthis\s+confirms\b/i,
  /(আপনার\s+.+আছে|নির্ণয়\s+করা\s+হয়েছে)/,
];

const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(emergency|er\b|a&e|call\s*999|call\s*911|go\s+to\s+(the\s+)?hospital\s+now|immediate(ly)?\s+ER)\b/i,
  /(জরুরি\s+বিভাগ|এখনই\s+হাসপাতাল|৯৯৯|ইমার্জেন্সি)/,
];

const URGENT_REPORT_PATTERNS: RegExp[] = [
  /critical/i,
  /immediate/i,
  /urgent/i,
  /previa/i,
  /emergency/i,
  /জরুরি/,
];

const PARTIAL_NOTE_EN =
  "These recommendations are based only on the visible portion of the uploaded report.";

const PARTIAL_NOTE_BN =
  "এই পরামর্শগুলো কেবল আপলোড করা ছবির দৃশ্যমান অংশের ওপর ভিত্তি করে।";

const ROUTINE_EN = "Discuss this report with your doctor at a routine follow-up.";
const ROUTINE_BN = "রুটিন ফলো-আপে এই রিপোর্টটি আপনার ডাক্তারকে দেখান।";

function normalizeList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => String(s ?? "").trim())
    .filter((s) => s.length > 0);
}

function isDisclaimer(text: string, language: "bn" | "en"): boolean {
  if (language === "en") {
    return (
      text.includes("educational purposes only") ||
      text.includes(NEXT_STEPS_DISCLAIMER_EN)
    );
  }
  return (
    text.includes("শিক্ষামূলক") ||
    text.includes(NEXT_STEPS_DISCLAIMER_BN)
  );
}

function looksPartial(input: RefineNextStepsInput): boolean {
  if (input.isPartialImage) return true;
  const blob = (input.ocrWarnings ?? []).join(" ").toLowerCase();
  return /crop|partial|incomplete|missing edge|cut\s*off|visible portion/.test(
    blob
  );
}

function reportIndicatesUrgency(findings: NextStepsFinding[]): boolean {
  return findings.some((f) => {
    const blob = `${f.titleEn ?? ""} ${f.titleBn ?? ""} ${f.detailEn ?? ""} ${f.detailBn ?? ""}`;
    return (
      f.status === "concern" &&
      URGENT_REPORT_PATTERNS.some((p) => p.test(blob))
    );
  });
}

function reportLooksCompletelyNormal(findings: NextStepsFinding[]): boolean {
  if (!findings.length) return false;
  return findings.every((f) => f.status === "normal" || f.status === "info");
}

function isUnsafeStep(text: string): boolean {
  return (
    DRUG_PATTERNS.some((p) => p.test(text)) ||
    DIAGNOSIS_PATTERNS.some((p) => p.test(text))
  );
}

function isEmergencyStep(text: string): boolean {
  return EMERGENCY_PATTERNS.some((p) => p.test(text));
}

/**
 * Keep at most maxContent content steps + disclaimer.
 * Content slots = MAX_ITEMS - 1 when disclaimer is required.
 */
function capSteps(
  steps: string[],
  disclaimer: string,
  language: "bn" | "en"
): string[] {
  const withoutDisclaimer = steps.filter((s) => !isDisclaimer(s, language));
  const contentBudget = MAX_ITEMS - 1;
  const capped = withoutDisclaimer.slice(0, contentBudget);
  return [...capped, disclaimer];
}

/**
 * Refine nextStepsBn/En for medical safety and format rules.
 * Does not invent clinical recommendations beyond safe routine fallbacks.
 */
export function refineNextSteps(input: RefineNextStepsInput): RefinedNextSteps {
  const warnings: string[] = [];
  const findings = input.findings ?? [];
  const urgentOk = reportIndicatesUrgency(findings);
  const allNormal = reportLooksCompletelyNormal(findings);
  const partial = looksPartial(input);

  let nextStepsEn = normalizeList(input.nextStepsEn);
  let nextStepsBn = normalizeList(input.nextStepsBn);

  const filterLanguage = (
    steps: string[],
    language: "bn" | "en"
  ): string[] => {
    const out: string[] = [];
    for (const step of steps) {
      if (isDisclaimer(step, language)) continue;
      if (isUnsafeStep(step)) {
        warnings.push(
          `Removed unsafe next step (${language}): contains diagnosis or drug-like advice`
        );
        continue;
      }
      if (isEmergencyStep(step) && !urgentOk) {
        warnings.push(
          `Removed emergency next step (${language}): report does not clearly indicate urgency`
        );
        continue;
      }
      out.push(step);
    }
    return out;
  };

  nextStepsEn = filterLanguage(nextStepsEn, "en");
  nextStepsBn = filterLanguage(nextStepsBn, "bn");

  if (allNormal) {
    // Routine follow-up only (+ disclaimer later)
    nextStepsEn = [ROUTINE_EN];
    nextStepsBn = [ROUTINE_BN];
  }

  if (partial) {
    if (!nextStepsEn.some((s) => /visible portion/i.test(s))) {
      nextStepsEn.unshift(PARTIAL_NOTE_EN);
    }
    if (!nextStepsBn.some((s) => /দৃশ্যমান অংশ/.test(s))) {
      nextStepsBn.unshift(PARTIAL_NOTE_BN);
    }
  }

  if (nextStepsEn.length === 0) {
    nextStepsEn = [ROUTINE_EN];
    warnings.push("nextStepsEn was empty; inserted routine follow-up");
  }
  if (nextStepsBn.length === 0) {
    nextStepsBn = [ROUTINE_BN];
    warnings.push("nextStepsBn was empty; inserted routine follow-up");
  }

  nextStepsEn = capSteps(nextStepsEn, NEXT_STEPS_DISCLAIMER_EN, "en");
  nextStepsBn = capSteps(nextStepsBn, NEXT_STEPS_DISCLAIMER_BN, "bn");

  return {
    nextStepsBn,
    nextStepsEn,
    warnings,
  };
}

export { NEXT_STEPS_DISCLAIMER_EN, NEXT_STEPS_DISCLAIMER_BN };

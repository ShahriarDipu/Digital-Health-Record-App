/**
 * Internal Extraction Checklist — pure TypeScript, no AI, no API calls.
 *
 * Intended to run AFTER Gemini extraction and BEFORE the final response
 * is returned. Failures map to the existing ValidationResult shape so they
 * can feed the validation/retry flow (caller wires later).
 *
 * Does not mutate the Gemini response. Does not modify scanner logic.
 */

import type { ValidationResult } from "@/lib/ai/validators";
import {
  finalize,
  isFiniteNumber,
  isNonEmptyString,
  pushError,
  pushWarning,
} from "@/lib/ai/validators/types";

export type ChecklistStatus = "pass" | "fail" | "skip" | "warn";

export type ChecklistItemId =
  | "report_title"
  | "report_date"
  | "report_type"
  | "patient_information"
  | "findings"
  | "impression"
  | "conclusion"
  | "recommendations"
  | "measurements"
  | "biomarkers"
  | "reference_ranges"
  | "units"
  | "high_low_indicators"
  | "no_skipped_findings"
  | "no_skipped_measurements"
  | "no_skipped_biomarkers"
  | "no_invented_diagnosis"
  | "no_contradiction"
  | "no_invented_reference_range"
  | "no_changed_numbers"
  | "no_changed_units"
  | "partial_image_disclosure"
  | "unreadable_text_marked";

export interface ChecklistItemResult {
  id: ChecklistItemId;
  label: string;
  status: ChecklistStatus;
  message?: string;
}

/**
 * Extracted report-like payload to inspect.
 * Compatible with Gemini JSON / LabReport fields.
 */
export interface ExtractionChecklistReport {
  typeBn?: string;
  typeEn?: string;
  type?: string;
  reportType?: string;
  date?: string;
  summaryBn?: string;
  summaryEn?: string;
  meaningBn?: string;
  meaningEn?: string;
  findings?: Array<{
    titleBn?: string;
    titleEn?: string;
    detailBn?: string;
    detailEn?: string;
    status?: string;
  }>;
  biomarkers?: Array<{
    name?: string;
    nameBn?: string;
    nameEn?: string;
    value?: unknown;
    unit?: unknown;
    normalMin?: unknown;
    normalMax?: unknown;
    normalRange?: unknown;
    flag?: unknown;
    status?: unknown;
    /** Exact value string from OCR if preserved */
    valueRaw?: string;
    unitRaw?: string;
  }>;
  impression?: { bn?: string; en?: string } | string | null;
  conclusion?: { bn?: string; en?: string } | string | null;
  recommendation?: { bn?: string; en?: string } | string | null;
  nextStepsBn?: string[];
  nextStepsEn?: string[];
  ocrWarnings?: string[];
  uncertainFindings?: string[];
  confidence?: number;
  imageQuality?: string;
  patientName?: string;
  patientInfo?: string;
  /** Optional structured patient block */
  patient?: { name?: string; age?: string; sex?: string; id?: string };
}

export interface ExtractionChecklistHints {
  /** Image quality / crop signals from local image-quality module */
  isPartialImage?: boolean;
  imageQuality?: string;
  imageIssues?: string[];
  /**
   * Sections believed visible on the image (from OCR warnings / prior notes).
   * When provided, missing extractions counterparts become checklist failures.
   */
  visibleSections?: Array<
    | "title"
    | "date"
    | "reportType"
    | "patient"
    | "findings"
    | "impression"
    | "conclusion"
    | "recommendation"
    | "measurements"
    | "biomarkers"
    | "referenceRanges"
    | "units"
    | "flags"
  >;
}

export interface ExtractionChecklistResult extends ValidationResult {
  /** Per-item checklist outcomes */
  items: ChecklistItemResult[];
  /** True when no checklist item failed */
  checklistPassed: boolean;
}

export interface RunExtractionChecklistOptions {
  report: ExtractionChecklistReport;
  hints?: ExtractionChecklistHints;
}

const PARTIAL_DISCLOSURE_EN =
  /based only on the (uploaded|visible) portion/i;
const PARTIAL_DISCLOSURE_BN = /দৃশ্যমান অংশ|আপলোড করা (ছবি|রিপোর্ট)/;

const NOT_CLEARLY_VISIBLE = /not\s+clearly\s+visible/i;

const INVENTED_DIAGNOSIS = [
  /\byou\s+have\b/i,
  /\bdiagnosed\s+with\b/i,
  /\bthis\s+confirms\s+you\s+have\b/i,
  /\bdefinitely\s+have\b/i,
  /আপনার\s+নিশ্চিতভাবে/,
  /রোগ\s+নির্ণয়\s+করা\s+হয়েছে/,
];

const GUESSING_LANGUAGE = [
  /\b(probably|likely|might be|appears to be|i\s+think|estimated|approximately\s+around)\b/i,
  /(হয়তো|মনে হয়|অনুমান|প্রায়\s+হবে)/,
];

function sectionText(section: { bn?: string; en?: string } | string | null | undefined): string {
  if (section == null) return "";
  if (typeof section === "string") return section.trim();
  return `${section.bn ?? ""} ${section.en ?? ""}`.trim();
}

function corpusOf(report: ExtractionChecklistReport): string {
  const parts: string[] = [
    report.typeBn ?? "",
    report.typeEn ?? "",
    report.type ?? "",
    report.reportType ?? "",
    report.date ?? "",
    report.summaryBn ?? "",
    report.summaryEn ?? "",
    report.meaningBn ?? "",
    report.meaningEn ?? "",
    sectionText(report.impression),
    sectionText(report.conclusion),
    sectionText(report.recommendation),
    ...(report.nextStepsBn ?? []),
    ...(report.nextStepsEn ?? []),
    ...(report.ocrWarnings ?? []),
    ...(report.uncertainFindings ?? []),
  ];
  for (const f of report.findings ?? []) {
    parts.push(f.titleBn ?? "", f.titleEn ?? "", f.detailBn ?? "", f.detailEn ?? "");
  }
  for (const b of report.biomarkers ?? []) {
    parts.push(
      b.name ?? "",
      b.nameBn ?? "",
      b.nameEn ?? "",
      String(b.unit ?? ""),
      String(b.flag ?? "")
    );
  }
  return parts.join("\n");
}

function hasVisibleHint(
  hints: ExtractionChecklistHints | undefined,
  section: NonNullable<ExtractionChecklistHints["visibleSections"]>[number]
): boolean {
  return Boolean(hints?.visibleSections?.includes(section));
}

function inferPartial(
  report: ExtractionChecklistReport,
  hints?: ExtractionChecklistHints
): boolean {
  if (hints?.isPartialImage) return true;
  const issues = (hints?.imageIssues ?? []).join(" ").toLowerCase();
  if (/crop|partial|incomplete|missing edge|cut\s*off/.test(issues)) return true;
  const warnings = (report.ocrWarnings ?? []).join(" ").toLowerCase();
  if (/crop|partial|incomplete|missing edge|cut\s*off/.test(warnings)) return true;
  if (report.imageQuality === "poor" || hints?.imageQuality === "poor") {
    return /crop|partial|incomplete/.test(warnings + " " + issues);
  }
  return false;
}

function item(
  id: ChecklistItemId,
  label: string,
  status: ChecklistStatus,
  message?: string
): ChecklistItemResult {
  return { id, label, status, message };
}

function fail(
  items: ChecklistItemResult[],
  errors: string[],
  id: ChecklistItemId,
  label: string,
  message: string
): void {
  items.push(item(id, label, "fail", message));
  pushError(errors, `[checklist:${id}] ${message}`);
}

function warn(
  items: ChecklistItemResult[],
  warnings: string[],
  id: ChecklistItemId,
  label: string,
  message: string
): void {
  items.push(item(id, label, "warn", message));
  pushWarning(warnings, `[checklist:${id}] ${message}`);
}

function pass(
  items: ChecklistItemResult[],
  id: ChecklistItemId,
  label: string,
  message?: string
): void {
  items.push(item(id, label, "pass", message));
}

function skip(
  items: ChecklistItemResult[],
  id: ChecklistItemId,
  label: string,
  message: string
): void {
  items.push(item(id, label, "skip", message));
}

/**
 * Run the internal extraction checklist on an extracted report JSON.
 * Returns a ValidationResult-compatible object for validate/retry integration.
 */
export function runExtractionChecklist(
  options: RunExtractionChecklistOptions
): ExtractionChecklistResult {
  const { report, hints } = options;
  const items: ChecklistItemResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const corpus = corpusOf(report);
  const findings = report.findings ?? [];
  const biomarkers = report.biomarkers ?? [];

  // ── Report title ───────────────────────────────────────────────
  const titleOk =
    isNonEmptyString(report.typeEn) ||
    isNonEmptyString(report.typeBn) ||
    isNonEmptyString(report.type);
  if (titleOk) {
    pass(items, "report_title", "Report title", "Title/type present");
  } else if (hasVisibleHint(hints, "title")) {
    fail(items, errors, "report_title", "Report title", "Visible title was not extracted");
  } else {
    warn(items, warnings, "report_title", "Report title", "Report title/type missing");
  }

  // ── Report date ────────────────────────────────────────────────
  if (isNonEmptyString(report.date) && !NOT_CLEARLY_VISIBLE.test(report.date)) {
    pass(items, "report_date", "Report date", report.date);
  } else if (isNonEmptyString(report.date) && NOT_CLEARLY_VISIBLE.test(report.date)) {
    pass(items, "report_date", "Report date", "Marked Not clearly visible");
  } else if (hasVisibleHint(hints, "date")) {
    fail(items, errors, "report_date", "Report date", "Visible date was not extracted");
  } else {
    warn(items, warnings, "report_date", "Report date", "Date missing");
  }

  // ── Report type ────────────────────────────────────────────────
  if (isNonEmptyString(report.reportType) || titleOk) {
    pass(items, "report_type", "Report type", report.reportType || "type label present");
  } else if (hasVisibleHint(hints, "reportType")) {
    fail(items, errors, "report_type", "Report type", "Visible report type was not extracted");
  } else {
    warn(items, warnings, "report_type", "Report type", "reportType missing");
  }

  // ── Patient information (optional — skip if not hinted) ────────
  const patientPresent =
    isNonEmptyString(report.patientName) ||
    isNonEmptyString(report.patientInfo) ||
    isNonEmptyString(report.patient?.name) ||
    /patient/i.test(corpus);
  if (patientPresent) {
    pass(items, "patient_information", "Patient information", "Patient info referenced");
  } else if (hasVisibleHint(hints, "patient")) {
    fail(
      items,
      errors,
      "patient_information",
      "Patient information",
      "Visible patient information was not extracted"
    );
  } else {
    skip(
      items,
      "patient_information",
      "Patient information",
      "No patient block detected in extraction (may be absent on report)"
    );
  }

  // ── Findings ───────────────────────────────────────────────────
  if (!Array.isArray(report.findings)) {
    fail(items, errors, "findings", "Findings", "Findings array missing");
  } else if (findings.length === 0) {
    fail(items, errors, "findings", "Findings", "Findings array is empty — visible findings may have been skipped");
  } else {
    const incomplete = findings.filter(
      (f) =>
        !isNonEmptyString(f.titleBn) ||
        !isNonEmptyString(f.titleEn) ||
        !isNonEmptyString(f.detailBn) ||
        !isNonEmptyString(f.detailEn)
    );
    if (incomplete.length > 0) {
      fail(
        items,
        errors,
        "findings",
        "Findings",
        `${incomplete.length} finding(s) incomplete — possible skipped content`
      );
    } else {
      pass(items, "findings", "Findings", `${findings.length} finding(s)`);
    }
  }

  // ── Impression / Conclusion / Recommendations ──────────────────
  const impressionText = sectionText(report.impression);
  const conclusionText = sectionText(report.conclusion);
  const recommendationText = sectionText(report.recommendation);

  const findingCovers = (label: RegExp) =>
    findings.some((f) => label.test(`${f.titleEn ?? ""} ${f.titleBn ?? ""}`));

  if (impressionText || findingCovers(/\bimpression\b/i)) {
    pass(items, "impression", "Impression", "Extracted");
  } else if (hasVisibleHint(hints, "impression")) {
    fail(items, errors, "impression", "Impression", "Impression appears present but was not extracted");
  } else {
    skip(items, "impression", "Impression", "Not present / not indicated");
  }

  if (conclusionText || findingCovers(/\bconclusion\b/i)) {
    pass(items, "conclusion", "Conclusion", "Extracted");
  } else if (hasVisibleHint(hints, "conclusion")) {
    fail(items, errors, "conclusion", "Conclusion", "Conclusion appears present but was not extracted");
  } else {
    skip(items, "conclusion", "Conclusion", "Not present / not indicated");
  }

  if (
    recommendationText ||
    (report.nextStepsEn?.length ?? 0) > 0 ||
    findingCovers(/\b(recommend|advice|comment)\b/i)
  ) {
    pass(items, "recommendations", "Recommendations", "Present");
  } else if (hasVisibleHint(hints, "recommendation")) {
    fail(
      items,
      errors,
      "recommendations",
      "Recommendations",
      "Recommendations appear present but were not extracted"
    );
  } else {
    skip(items, "recommendations", "Recommendations", "Not present / not indicated");
  }

  // ── Measurements & biomarkers ──────────────────────────────────
  const measurementFindings = findings.filter((f) =>
    /\b(mm|cm|cc|ml|measurement|size|volume|thickness|diameter)\b/i.test(
      `${f.titleEn ?? ""} ${f.detailEn ?? ""} ${f.titleBn ?? ""} ${f.detailBn ?? ""}`
    )
  );

  if (biomarkers.length > 0 || measurementFindings.length > 0) {
    pass(
      items,
      "measurements",
      "Measurements",
      `${biomarkers.length} biomarker(s), ${measurementFindings.length} measurement finding(s)`
    );
  } else if (hasVisibleHint(hints, "measurements") || hasVisibleHint(hints, "biomarkers")) {
    fail(
      items,
      errors,
      "measurements",
      "Measurements",
      "Visible measurements/biomarkers were not extracted"
    );
  } else {
    skip(items, "measurements", "Measurements", "No measurements indicated");
  }

  if (Array.isArray(report.biomarkers)) {
    if (biomarkers.length === 0 && hasVisibleHint(hints, "biomarkers")) {
      fail(items, errors, "biomarkers", "Biomarkers", "Visible biomarkers were skipped");
    } else if (biomarkers.length === 0) {
      skip(items, "biomarkers", "Biomarkers", "Empty biomarkers (allowed for non-numeric reports)");
    } else {
      pass(items, "biomarkers", "Biomarkers", `${biomarkers.length} extracted`);
    }
  } else {
    fail(items, errors, "biomarkers", "Biomarkers", "Biomarkers field missing");
  }

  // ── Reference ranges / units / flags ───────────────────────────
  let inventedRange = 0;
  let missingUnit = 0;
  let changedNumberSuspicion = 0;
  let flagCoverage = 0;

  for (const b of biomarkers) {
    const name = b.nameEn || b.nameBn || b.name || "biomarker";
    if (!isNonEmptyString(String(b.unit ?? ""))) missingUnit += 1;

    const min = b.normalMin;
    const max = b.normalMax;
    const hasNullRange = b.normalRange === null;
    const zeroZero =
      isFiniteNumber(min) && isFiniteNumber(max) && min === 0 && max === 0;
    const status = String(b.status ?? "").toLowerCase();
    const hasFlag = b.flag != null && String(b.flag).trim() !== "";

    // Invented range heuristic: status high/low with 0-0 and no flag
    if ((status === "high" || status === "low") && zeroZero && !hasFlag && !hasNullRange) {
      inventedRange += 1;
      pushError(
        errors,
        `[checklist:reference_ranges] Possible invented reference range for "${name}" (status ${status} with 0–0 range and no flag)`
      );
    }

    if (hasFlag) flagCoverage += 1;

    // Changed number heuristic: valueRaw present and differs from value
    if (typeof b.valueRaw === "string" && isFiniteNumber(b.value)) {
      const rawNum = Number(String(b.valueRaw).replace(/,/g, "").match(/-?\d+(\.\d+)?/)?.[0]);
      if (Number.isFinite(rawNum) && rawNum !== b.value) {
        changedNumberSuspicion += 1;
      }
    }
    if (typeof b.unitRaw === "string" && isNonEmptyString(String(b.unit ?? ""))) {
      if (b.unitRaw.trim() !== String(b.unit).trim()) {
        pushError(
          errors,
          `[checklist:no_changed_units] Unit changed for "${name}": raw "${b.unitRaw}" vs "${String(b.unit)}"`
        );
      }
    }
  }

  if (inventedRange > 0) {
    items.push(
      item(
        "reference_ranges",
        "Reference ranges",
        "fail",
        `${inventedRange} biomarker(s) may have invented reference ranges`
      )
    );
    items.push(
      item(
        "no_invented_reference_range",
        "No invented reference ranges",
        "fail",
        "Invented reference range suspected"
      )
    );
  } else if (biomarkers.length === 0) {
    skip(items, "reference_ranges", "Reference ranges", "No biomarkers");
    pass(items, "no_invented_reference_range", "No invented reference ranges", "N/A");
  } else {
    pass(items, "reference_ranges", "Reference ranges", "No invented-range heuristic failures");
    pass(items, "no_invented_reference_range", "No invented reference ranges");
  }

  if (biomarkers.length === 0) {
    skip(items, "units", "Units", "No biomarkers");
  } else if (missingUnit > 0) {
    fail(items, errors, "units", "Units", `${missingUnit} biomarker(s) missing units`);
  } else {
    pass(items, "units", "Units", "All biomarkers have units");
  }

  if (biomarkers.length === 0) {
    skip(items, "high_low_indicators", "High / Low indicators", "No biomarkers");
  } else if (flagCoverage > 0 || hasVisibleHint(hints, "flags")) {
    pass(
      items,
      "high_low_indicators",
      "High / Low indicators",
      flagCoverage > 0 ? `${flagCoverage} flag(s) captured` : "Checked"
    );
  } else {
    skip(
      items,
      "high_low_indicators",
      "High / Low indicators",
      "No explicit H/L flags in extraction (may be absent on report)"
    );
  }

  // ── No skipped findings / measurements / biomarkers ────────────
  const uncertain = report.uncertainFindings ?? [];
  if (uncertain.some((u) => /skipped|missing finding|not extracted/i.test(u))) {
    fail(
      items,
      errors,
      "no_skipped_findings",
      "No visible finding skipped",
      "uncertainFindings indicates skipped content"
    );
  } else if (findings.length > 0) {
    pass(items, "no_skipped_findings", "No visible finding skipped");
  } else {
    fail(items, errors, "no_skipped_findings", "No visible finding skipped", "No findings extracted");
  }

  if (
    hasVisibleHint(hints, "measurements") &&
    biomarkers.length === 0 &&
    measurementFindings.length === 0
  ) {
    fail(
      items,
      errors,
      "no_skipped_measurements",
      "No visible measurement skipped",
      "Measurements appear visible but none were extracted"
    );
  } else {
    pass(items, "no_skipped_measurements", "No visible measurement skipped");
  }

  if (hasVisibleHint(hints, "biomarkers") && biomarkers.length === 0) {
    fail(
      items,
      errors,
      "no_skipped_biomarkers",
      "No biomarker skipped",
      "Biomarkers appear visible but none were extracted"
    );
  } else {
    pass(items, "no_skipped_biomarkers", "No biomarker skipped");
  }

  // ── No invented diagnosis ──────────────────────────────────────
  const diagnosisHits = INVENTED_DIAGNOSIS.filter((p) => p.test(corpus));
  // Allow if impression/conclusion themselves contain diagnosis wording from report
  const formalDx = /\bdiagnosis\b/i.test(
    `${sectionText(report.impression)} ${sectionText(report.conclusion)}`
  );
  if (diagnosisHits.length > 0 && !formalDx) {
    fail(
      items,
      errors,
      "no_invented_diagnosis",
      "No invented diagnosis",
      "Patient-facing text appears to invent/confirm a diagnosis"
    );
  } else {
    pass(items, "no_invented_diagnosis", "No invented diagnosis");
  }

  // ── No contradiction (heuristic) ───────────────────────────────
  // e.g. summary says normal while all findings are concern — soft check
  const summary = `${report.summaryEn ?? ""} ${report.summaryBn ?? ""}`.toLowerCase();
  const allConcern =
    findings.length > 0 && findings.every((f) => f.status === "concern");
  const claimsAllNormal =
    /\ball\s+(findings\s+)?(are\s+)?normal\b/.test(summary) ||
    /সব\s+(ফলাফল|কিছু)?\s*স্বাভাবিক/.test(summary);
  if (allConcern && claimsAllNormal) {
    fail(
      items,
      errors,
      "no_contradiction",
      "No contradiction with report",
      "Summary claims normal but all findings are concern"
    );
  } else {
    pass(items, "no_contradiction", "No contradiction with report");
  }

  // ── Numbers / units unchanged ──────────────────────────────────
  if (changedNumberSuspicion > 0) {
    fail(
      items,
      errors,
      "no_changed_numbers",
      "No numeric value changed",
      `${changedNumberSuspicion} biomarker value(s) differ from valueRaw`
    );
  } else {
    pass(items, "no_changed_numbers", "No numeric value changed");
  }

  if (errors.some((e) => e.includes("no_changed_units"))) {
    items.push(
      item("no_changed_units", "No unit changed", "fail", "Unit mismatch vs unitRaw")
    );
  } else {
    pass(items, "no_changed_units", "No unit changed");
  }

  // ── Partial image disclosure ───────────────────────────────────
  const partial = inferPartial(report, hints);
  if (partial) {
    const disclosed =
      PARTIAL_DISCLOSURE_EN.test(corpus) || PARTIAL_DISCLOSURE_BN.test(corpus);
    if (!disclosed) {
      fail(
        items,
        errors,
        "partial_image_disclosure",
        "Partial image disclosure",
        'Missing required statement: explanation is based only on the uploaded/visible portion of the report'
      );
    } else {
      pass(items, "partial_image_disclosure", "Partial image disclosure", "Present");
    }
  } else {
    skip(items, "partial_image_disclosure", "Partial image disclosure", "Image not marked partial");
  }

  // ── Unreadable text marked properly ────────────────────────────
  const guessing = GUESSING_LANGUAGE.filter((p) => p.test(corpus));
  const hasUncertain = uncertain.length > 0 || (report.ocrWarnings ?? []).length > 0;
  if (guessing.length > 0 && !NOT_CLEARLY_VISIBLE.test(corpus)) {
    fail(
      items,
      errors,
      "unreadable_text_marked",
      "Unreadable text marked",
      'Guessing language found without "Not clearly visible" markers'
    );
  } else if (hasUncertain && NOT_CLEARLY_VISIBLE.test(corpus)) {
    pass(
      items,
      "unreadable_text_marked",
      "Unreadable text marked",
      "Not clearly visible used"
    );
  } else if (guessing.length > 0 && NOT_CLEARLY_VISIBLE.test(corpus)) {
    warn(
      items,
      warnings,
      "unreadable_text_marked",
      "Unreadable text marked",
      "Contains both uncertainty markers and guessing-like language"
    );
  } else {
    pass(items, "unreadable_text_marked", "Unreadable text marked", "No guessing heuristic failures");
  }

  const validation = finalize(errors, warnings);
  const checklistPassed = items.every((i) => i.status !== "fail");

  return {
    ...validation,
    // Ensure valid tracks checklist failures
    valid: validation.valid && checklistPassed,
    items,
    checklistPassed,
  };
}

/**
 * Convert checklist result into a plain ValidationResult for retry managers.
 */
export function checklistToValidationResult(
  result: ExtractionChecklistResult
): ValidationResult {
  return {
    valid: result.valid,
    errors: [...result.errors],
    warnings: [...result.warnings],
  };
}

/**
 * Top-level medical report JSON validator.
 * Runs conceptually after Gemini — does not call AI and does not mutate the response.
 */

import { validateBiomarkers } from "./biomarkerValidator";
import { validateFindings } from "./findingValidator";
import {
  DEFAULT_MIN_CONFIDENCE,
  finalize,
  isFiniteNumber,
  isNonEmptyString,
  pushError,
  pushWarning,
  type ValidationResult,
  type ValidatorOptions,
} from "./types";

const REQUIRED_STRING_FIELDS = [
  "reportType",
  "date",
  "summaryBn",
  "summaryEn",
  "meaningBn",
  "meaningEn",
] as const;

const REQUIRED_ARRAY_FIELDS = ["findings", "biomarkers", "nextStepsBn", "nextStepsEn"] as const;

/**
 * Parse a JSON string without mutating caller state.
 * Returns null if malformed.
 */
export function parseReportJson(input: string): unknown | null {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

function validateRequiredFields(
  report: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  for (const field of REQUIRED_STRING_FIELDS) {
    if (!(field in report) || report[field] === undefined || report[field] === null) {
      pushError(errors, `Missing ${field}`);
      continue;
    }
    if (!isNonEmptyString(report[field])) {
      // reportType/date/summaries must be non-empty strings
      pushError(errors, `Missing or empty ${field}`);
    }
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!(field in report) || report[field] === undefined || report[field] === null) {
      pushError(errors, `Missing ${field}`);
    }
  }

  if (!("confidence" in report) || report.confidence === undefined || report.confidence === null) {
    pushError(errors, "Missing confidence");
  }

  // Optional clinical sections — warn only (example in spec mentioned impression)
  if (
    report.impression == null ||
    (typeof report.impression === "object" &&
      report.impression !== null &&
      !isNonEmptyString((report.impression as { bn?: unknown }).bn) &&
      !isNonEmptyString((report.impression as { en?: unknown }).en))
  ) {
    pushWarning(warnings, "Missing impression (optional but recommended when present on report)");
  }

  if (
    report.conclusion == null ||
    (typeof report.conclusion === "object" &&
      report.conclusion !== null &&
      !isNonEmptyString((report.conclusion as { bn?: unknown }).bn) &&
      !isNonEmptyString((report.conclusion as { en?: unknown }).en))
  ) {
    pushWarning(warnings, "Missing conclusion (optional but recommended when present on report)");
  }
}

function validateNextSteps(
  report: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  for (const field of ["nextStepsBn", "nextStepsEn"] as const) {
    const value = report[field];
    if (value === undefined || value === null) continue; // already flagged missing
    if (!Array.isArray(value)) {
      pushError(errors, `${field} must be an array`);
      continue;
    }
    if (value.length === 0) {
      pushWarning(warnings, `${field} array is empty`);
      continue;
    }
    value.forEach((step, i) => {
      if (!isNonEmptyString(step)) {
        pushError(errors, `${field}[${i}] must be a non-empty string`);
      }
    });
  }
}

function validateConfidence(
  confidence: unknown,
  minConfidence: number,
  errors: string[]
): void {
  if (confidence === undefined || confidence === null) {
    return; // missing already recorded
  }

  let numeric: number | null = null;
  if (isFiniteNumber(confidence)) {
    numeric = confidence;
  } else if (typeof confidence === "string" && confidence.trim() !== "") {
    const parsed = Number(confidence);
    numeric = Number.isFinite(parsed) ? parsed : null;
  }

  if (numeric === null) {
    pushError(errors, `Invalid confidence value "${String(confidence)}"`);
    return;
  }

  if (numeric < 0 || numeric > 100) {
    pushError(errors, `Confidence out of range (${numeric}); expected 0–100`);
    return;
  }

  if (numeric < minConfidence) {
    pushError(
      errors,
      `Confidence is below the configured threshold (${numeric} < ${minConfidence})`
    );
  }
}

/**
 * Validate a medical report JSON object or JSON string.
 * Never modifies the input — only returns a validation result.
 */
export function validateReport(
  input: unknown,
  options: ValidatorOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const allowEmptyBiomarkers = options.allowEmptyBiomarkers !== false;

  // Malformed JSON string
  let payload: unknown = input;
  if (typeof input === "string") {
    const parsed = parseReportJson(input);
    if (parsed === null) {
      return finalize(["Malformed JSON"], []);
    }
    payload = parsed;
  }

  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
    return finalize(["Malformed JSON: expected a report object"], []);
  }

  // Freeze-style: work on a shallow readonly view; never assign back to input
  const report = payload as Record<string, unknown>;

  validateRequiredFields(report, errors, warnings);
  validateNextSteps(report, errors, warnings);
  validateConfidence(report.confidence, minConfidence, errors);

  // Findings
  const findingsResult = validateFindings(report.findings);
  for (const e of findingsResult.errors) pushError(errors, e);
  for (const w of findingsResult.warnings) pushWarning(warnings, w);

  // Biomarkers
  const biomarkersResult = validateBiomarkers(report.biomarkers, {
    allowEmpty: allowEmptyBiomarkers,
  });
  for (const e of biomarkersResult.errors) pushError(errors, e);
  for (const w of biomarkersResult.warnings) pushWarning(warnings, w);

  return finalize(errors, warnings);
}

/**
 * Alias matching the product naming: validate the full Gemini response JSON.
 */
export function validateGeminiReportJson(
  input: unknown,
  options?: ValidatorOptions
): ValidationResult {
  return validateReport(input, options);
}

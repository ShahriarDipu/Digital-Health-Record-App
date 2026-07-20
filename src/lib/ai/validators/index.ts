/**
 * Medical report JSON Validator.
 *
 * Intended to run immediately after the Gemini response (caller wires later).
 * Pure TypeScript — no AI, no Gemini calls.
 * Never mutates the Gemini response — only validates and reports problems.
 *
 * Extend by adding a new file under validators/ and exporting helpers from here.
 */

export type {
  ValidationResult,
  ValidatorOptions,
  ValidFindingStatus,
} from "./types";

export {
  DEFAULT_MIN_CONFIDENCE,
  VALID_FINDING_STATUSES,
  emptyResult,
  finalize,
} from "./types";

export {
  validateFinding,
  validateFindings,
  type FindingValidationIssue,
} from "./findingValidator";

export {
  validateBiomarker,
  validateBiomarkers,
  type BiomarkerValidationIssue,
} from "./biomarkerValidator";

export {
  validateReport,
  validateGeminiReportJson,
  parseReportJson,
} from "./reportValidator";

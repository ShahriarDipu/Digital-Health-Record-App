/**
 * Image Quality Detection module.
 *
 * Run BEFORE the Gemini scan (caller wires later).
 * Local heuristics only — no AI, no extra API calls.
 * Independent from scanner logic.
 *
 * Example:
 *   const q = await assessImageQuality({ buffer, mimeType: file.type });
 *   // { quality, issues, canProceed, suggestions }
 */

export type {
  ImageQualityLevel,
  ImageQualityIssueCode,
  ImageQualityIssue,
  ImageQualityAssessment,
  ImageQualityMetrics,
  AssessImageQualityInput,
} from "./types";

export { QUALITY_SUGGESTIONS } from "./types";

export {
  assessImageQuality,
  assessImageQualityFromBase64,
} from "./assessImageQuality";

export { buildSuggestions } from "./suggestions";

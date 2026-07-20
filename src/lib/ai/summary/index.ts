/**
 * Patient summary generation helpers.
 * Prompt rules live in prompts/patientSummary.ts (via BASE_MEDICAL_PROMPT).
 * This package refines summaries in TypeScript without AI or scanner changes.
 */

export {
  refinePatientSummary,
  prioritizeFindings,
  classifyFindingPriority,
  limitBanglaParagraphs,
  type SummaryInput,
  type SummaryFinding,
  type RefinedPatientSummary,
  type SummaryPriority,
  type FindingStatus,
} from "./refinePatientSummary";

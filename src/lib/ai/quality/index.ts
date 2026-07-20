/**
 * Internal quality checks for medical report extraction.
 * No AI. No extra API calls. Not wired to the scanner by default.
 */

export {
  runExtractionChecklist,
  checklistToValidationResult,
  type ChecklistStatus,
  type ChecklistItemId,
  type ChecklistItemResult,
  type ExtractionChecklistReport,
  type ExtractionChecklistHints,
  type ExtractionChecklistResult,
  type RunExtractionChecklistOptions,
} from "./extractionChecklist";

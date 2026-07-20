/**
 * Continuous Learning System for the medical report scanner.
 *
 * - Local knowledge base only (no Gemini fine-tuning)
 * - Stores anonymized successful-scan patterns
 * - Retrieves similar examples for prompt reference (caller appends — never auto-edits prompts)
 * - Generates developer recommendations only
 *
 * Not wired into the scanner by default.
 *
 * Example:
 *   await recordSuccessfulScan({ report, reportType, promptId, validation });
 *   const ctx = await buildPromptReferenceContext("CBC");
 *   const suggestions = await generatePromptImprovementSuggestions();
 */

export type {
  LearningReportType,
  AnonymizedFinding,
  AnonymizedBiomarker,
  AnonymizedMeasurement,
  ReportStructurePattern,
  StoredValidationSnapshot,
  UserFeedbackRecord,
  KnowledgeEntry,
  LearningAnalytics,
  PromptImprovementSuggestion,
  SimilarExample,
  PromptReferenceContext,
} from "./types";

export {
  stripPii,
  fingerprintText,
  anonymizeLabBrand,
  FORBIDDEN_PII_KEYS,
} from "./anonymize";

export {
  extractFindings,
  extractBiomarkers,
  extractMeasurements,
  extractReportStructure,
  buildSearchTokens,
  type RawLearningReport,
} from "./reportPatterns";

export {
  recordSuccessfulScan,
  attachFeedback,
  listKnowledgeEntries,
  retrieveSimilarExamples,
  buildPromptReferenceContext,
  getKnowledgeBasePaths,
  type KnowledgeBaseOptions,
  type RecordSuccessfulScanInput,
} from "./knowledgeBase";

export {
  analyzeFeedbackCorrections,
  flagRepeatedCorrections,
  type CorrectionFrequency,
} from "./feedbackAnalyzer";

export {
  generateCoverageSuggestions,
  generatePromptImprovementSuggestions,
} from "./promptImprovement";

export {
  computeLearningAnalytics,
  getMostCommonReportTypes,
} from "./analytics";

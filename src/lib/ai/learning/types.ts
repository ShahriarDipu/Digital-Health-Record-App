/**
 * Continuous learning types — local knowledge base only (no Gemini fine-tuning).
 */

export type LearningReportType = string;

export interface AnonymizedFinding {
  titleEn: string;
  titleBn?: string;
  status?: string;
  /** Structure-only detail fingerprint (no free-text PII) */
  detailFingerprint?: string;
}

export interface AnonymizedBiomarker {
  nameEn: string;
  nameBn?: string;
  unit?: string;
  /** Whether a reference range was present — not the values (optional retention of unit only) */
  hasReferenceRange?: boolean;
  flag?: string | null;
  status?: string;
}

export interface AnonymizedMeasurement {
  labelEn: string;
  unit?: string;
}

export interface ReportStructurePattern {
  /** Ordered section labels observed on the report */
  sections: string[];
  /** Rough layout fingerprint e.g. table_heavy | narrative | mixed */
  layoutKind: "table_heavy" | "narrative" | "mixed" | "unknown";
  /** Optional lab/hospital brand token after anonymization (no IDs) */
  labBrandToken?: string;
  hasImpression: boolean;
  hasConclusion: boolean;
  hasRecommendation: boolean;
  biomarkerCount: number;
  findingCount: number;
}

export interface StoredValidationSnapshot {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  /** Truncated error codes/messages without PII */
  errorCodes: string[];
}

export interface UserFeedbackRecord {
  /** thumbs / rating / free-text correction categories */
  rating?: "positive" | "negative" | "neutral";
  /** Structured correction tags e.g. "missed_esr", "wrong_placenta" */
  correctionTags?: string[];
  /** Anonymized free-text note (PII stripped) */
  note?: string;
  createdAt: string;
}

export interface KnowledgeEntry {
  id: string;
  createdAt: string;
  reportType: LearningReportType;
  promptId?: string;
  promptHash?: string;
  findings: AnonymizedFinding[];
  biomarkers: AnonymizedBiomarker[];
  measurements: AnonymizedMeasurement[];
  structure: ReportStructurePattern;
  validation: StoredValidationSnapshot;
  usedRetry?: boolean;
  feedback?: UserFeedbackRecord;
  /** Similarity / search tokens */
  tokens: string[];
}

export interface LearningAnalytics {
  totalScans: number;
  successfulScans: number;
  validationFailures: number;
  retryCount: number;
  retryRate: number;
  feedbackPositive: number;
  feedbackNegative: number;
  feedbackNeutral: number;
  reportTypeCounts: Record<string, number>;
  extractionAccuracyEstimate: number;
  topErrorCodes: Array<{ code: string; count: number }>;
  generatedAt: string;
}

export interface PromptImprovementSuggestion {
  id: string;
  promptId: string;
  reportType: string;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  evidenceCount: number;
  /** Never auto-applied — recommendation only */
  recommendationOnly: true;
  createdAt: string;
}

export interface SimilarExample {
  entryId: string;
  reportType: string;
  structure: ReportStructurePattern;
  sampleBiomarkerNames: string[];
  sampleFindingTitles: string[];
  promptId?: string;
  score: number;
}

export interface PromptReferenceContext {
  reportType: string;
  examples: SimilarExample[];
  /** Text block safe to append as internal reference (no PII) */
  referenceBlock: string;
}

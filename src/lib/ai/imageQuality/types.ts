/**
 * Image quality assessment types.
 * Pure local heuristics — no AI, no external OCR/API.
 */

export type ImageQualityLevel =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "unreadable";

export type ImageQualityIssueCode =
  | "blur"
  | "low_resolution"
  | "glare"
  | "too_dark"
  | "too_bright"
  | "cropped"
  | "rotated"
  | "multiple_reports"
  | "missing_edges"
  | "small_text"
  | "analysis_limited";

export interface ImageQualityIssue {
  code: ImageQualityIssueCode;
  message: string;
}

export interface ImageQualityAssessment {
  /** Overall quality bucket */
  quality: ImageQualityLevel;
  /** Human-readable issue messages */
  issues: string[];
  /** Structured issues for programmatic use */
  issueDetails: ImageQualityIssue[];
  /**
   * Whether scanning may continue.
   * Only false when the image is almost completely unreadable.
   * Imperfect images still return canProceed: true.
   */
  canProceed: boolean;
  /** Helpful capture tips when quality is fair/poor/unreadable */
  suggestions: string[];
  /** Optional numeric diagnostics (for logging / tuning) */
  metrics?: ImageQualityMetrics;
}

export interface ImageQualityMetrics {
  width: number;
  height: number;
  meanLuminance: number;
  luminanceStdDev: number;
  blurScore: number;
  glareRatio: number;
  darkBorderRatio: number;
  edgeContentRatio: number;
  aspectRatio: number;
  estimatedPaperRegions: number;
}

export interface AssessImageQualityInput {
  /** Raw image bytes */
  buffer: Buffer;
  /** MIME type if known (image/jpeg, image/png, image/webp, …) */
  mimeType?: string;
  /** Optional original filename */
  filename?: string;
}

export const QUALITY_SUGGESTIONS = {
  blur: "Hold the camera steady.",
  low_resolution: "Move closer or use a higher-resolution camera.",
  glare: "Avoid glare. Tilt the page slightly or move away from direct light.",
  too_dark: "Improve lighting. Capture near a window or brighter light.",
  too_bright: "Reduce harsh light or glare on the page.",
  cropped: "Capture the full report — include all four edges.",
  rotated: "Rotate the phone so the report is upright before capturing.",
  multiple_reports: "Photograph one report at a time for best accuracy.",
  missing_edges: "Capture the full report. Include all four edges.",
  small_text: "Move closer so small text is readable.",
  general: "Make sure the report is flat, fully visible, and in focus.",
} as const;

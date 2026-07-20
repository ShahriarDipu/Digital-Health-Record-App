/**
 * Image Quality Detection — local heuristics only.
 * Intended to run BEFORE Gemini scan (caller wires later).
 * Never blocks imperfect images; only blocks nearly unreadable ones.
 */

import {
  computeMetrics,
  getOriginalDimensions,
  loadGrayscaleImage,
} from "./metrics";
import { buildSuggestions } from "./suggestions";
import type {
  AssessImageQualityInput,
  ImageQualityAssessment,
  ImageQualityIssue,
  ImageQualityIssueCode,
  ImageQualityLevel,
  ImageQualityMetrics,
} from "./types";

/** Tunable thresholds — conservative so imperfect photos still proceed. */
const THRESHOLDS = {
  /** Below this Laplacian variance → blurry */
  blurPoor: 35,
  blurFair: 80,
  /** Original pixel dimensions */
  minWidth: 600,
  minHeight: 800,
  minWidthHard: 280,
  minHeightHard: 280,
  /** Mean luminance 0–255 */
  tooDark: 45,
  tooBright: 220,
  /** Near-white pixel ratio */
  glare: 0.12,
  glareSevere: 0.28,
  /** Content tightly touching frame */
  edgeContentCropped: 0.22,
  /** Landscape-ish document often means rotated phone capture */
  rotatedAspect: 1.35,
  /** Very low contrast → unreadable */
  minStdUnreadable: 8,
  minStdPoor: 18,
};

function addIssue(
  issues: ImageQualityIssue[],
  code: ImageQualityIssueCode,
  message: string
): void {
  if (issues.some((i) => i.code === code)) return;
  issues.push({ code, message });
}

function scoreToQuality(
  issueCodes: ImageQualityIssueCode[],
  metrics: ImageQualityMetrics | undefined,
  forceUnreadable: boolean
): ImageQualityLevel {
  if (forceUnreadable) return "unreadable";

  const severe = new Set<ImageQualityIssueCode>([
    "blur",
    "too_dark",
    "too_bright",
    "glare",
    "low_resolution",
    "small_text",
  ]);

  const severeCount = issueCodes.filter((c) => severe.has(c)).length;

  if (
    metrics &&
    metrics.luminanceStdDev < THRESHOLDS.minStdUnreadable &&
    (metrics.meanLuminance < 25 || metrics.meanLuminance > 245)
  ) {
    return "unreadable";
  }

  if (severeCount >= 3 || (severeCount >= 2 && issueCodes.includes("blur"))) {
    return "poor";
  }
  if (issueCodes.length >= 2) return "fair";
  if (issueCodes.length === 1) return "fair";
  if (metrics && metrics.blurScore >= THRESHOLDS.blurFair * 2) return "excellent";
  return "good";
}

function analyzeMetrics(metrics: ImageQualityMetrics): {
  issues: ImageQualityIssue[];
  forceUnreadable: boolean;
} {
  const issues: ImageQualityIssue[] = [];
  let forceUnreadable = false;

  // Low resolution
  if (
    metrics.width < THRESHOLDS.minWidthHard ||
    metrics.height < THRESHOLDS.minHeightHard
  ) {
    addIssue(issues, "low_resolution", "Image resolution is very low");
    addIssue(issues, "small_text", "Small text may be unreadable");
    forceUnreadable =
      metrics.width < 160 ||
      metrics.height < 160 ||
      metrics.luminanceStdDev < THRESHOLDS.minStdUnreadable;
  } else if (
    metrics.width < THRESHOLDS.minWidth ||
    metrics.height < THRESHOLDS.minHeight
  ) {
    addIssue(issues, "low_resolution", "Image resolution is low");
    addIssue(issues, "small_text", "Small text may be hard to read");
  }

  // Blur
  if (metrics.blurScore < THRESHOLDS.blurPoor) {
    addIssue(issues, "blur", "Image is blurry");
  } else if (metrics.blurScore < THRESHOLDS.blurFair) {
    addIssue(issues, "blur", "Image is slightly blurry");
  }

  // Darkness / brightness
  if (metrics.meanLuminance < THRESHOLDS.tooDark) {
    addIssue(issues, "too_dark", "Image is very dark");
  }
  if (metrics.meanLuminance > THRESHOLDS.tooBright) {
    addIssue(issues, "too_bright", "Image is very bright");
  }

  // Glare / reflection
  if (metrics.glareRatio >= THRESHOLDS.glareSevere) {
    addIssue(issues, "glare", "Excessive glare or reflection detected");
  } else if (metrics.glareRatio >= THRESHOLDS.glare) {
    addIssue(issues, "glare", "Glare or reflection detected");
  }

  // Cropped / missing edges — content pressed against frame
  if (metrics.edgeContentRatio >= THRESHOLDS.edgeContentCropped) {
    addIssue(issues, "cropped", "Bottom or side of the report may be cropped");
    addIssue(issues, "missing_edges", "Report edges may be missing from the frame");
  }

  // Rotated (landscape capture of typically portrait reports)
  if (metrics.aspectRatio >= THRESHOLDS.rotatedAspect) {
    addIssue(issues, "rotated", "Image may be rotated (landscape orientation)");
  }

  // Multiple reports in one frame
  if (metrics.estimatedPaperRegions >= 2) {
    addIssue(
      issues,
      "multiple_reports",
      "Multiple reports may be present in one image"
    );
  }

  // Near-zero contrast → almost unreadable
  if (metrics.luminanceStdDev < THRESHOLDS.minStdUnreadable) {
    forceUnreadable = true;
    addIssue(issues, "blur", "Image appears almost completely unreadable");
  } else if (metrics.luminanceStdDev < THRESHOLDS.minStdPoor) {
    addIssue(issues, "too_dark", "Image has very low contrast");
  }

  return { issues, forceUnreadable };
}

function limitedAssessment(reason: string): ImageQualityAssessment {
  const issueDetails: ImageQualityIssue[] = [
    {
      code: "analysis_limited",
      message: reason,
    },
  ];
  return {
    // Fail open — never block when we cannot analyze
    quality: "fair",
    issues: issueDetails.map((i) => i.message),
    issueDetails,
    canProceed: true,
    suggestions: [
      "Hold the camera steady.",
      "Capture the full report.",
      "Avoid glare.",
      "Improve lighting.",
    ],
  };
}

/**
 * Assess uploaded report image quality using local heuristics only.
 * Does not call Gemini or any external service.
 */
export async function assessImageQuality(
  input: AssessImageQualityInput
): Promise<ImageQualityAssessment> {
  if (!input.buffer || input.buffer.length < 32) {
    return {
      quality: "unreadable",
      issues: ["Image data is missing or unreadable"],
      issueDetails: [
        {
          code: "analysis_limited",
          message: "Image data is missing or unreadable",
        },
      ],
      canProceed: false,
      suggestions: [
        "Please upload a clearer photo of the report.",
        "Capture the full report.",
        "Improve lighting.",
      ],
    };
  }

  // PDF uploads: cannot pixel-analyze here without rasterization — fail open
  if (
    input.mimeType === "application/pdf" ||
    input.filename?.toLowerCase().endsWith(".pdf")
  ) {
    return limitedAssessment(
      "PDF quality was not pixel-analyzed; scanning will continue"
    );
  }

  const dims = await getOriginalDimensions(input.buffer);
  const raw = await loadGrayscaleImage(input.buffer);

  if (!dims || !raw) {
    return limitedAssessment(
      "Could not fully analyze image pixels; scanning will continue"
    );
  }

  const metrics = computeMetrics(raw, dims.width, dims.height);
  const { issues, forceUnreadable } = analyzeMetrics(metrics);
  const issueCodes = issues.map((i) => i.code);
  const quality = scoreToQuality(issueCodes, metrics, forceUnreadable);

  // Requirement: never block solely because the image is imperfect.
  // Only stop when almost completely unreadable.
  const canProceed = quality !== "unreadable";

  const suggestions =
    quality === "good" || quality === "excellent"
      ? []
      : buildSuggestions(issueCodes);

  // Ensure poor quality always gets the core helpful tips from the spec
  if (quality === "poor" || quality === "unreadable") {
    for (const tip of [
      "Hold the camera steady.",
      "Capture the full report.",
      "Avoid glare.",
      "Improve lighting.",
    ]) {
      if (!suggestions.includes(tip)) suggestions.push(tip);
    }
  }

  return {
    quality,
    issues: issues.map((i) => i.message),
    issueDetails: issues,
    canProceed,
    suggestions,
    metrics,
  };
}

/**
 * Convenience: assess from a base64 string (no data-URL prefix required).
 */
export async function assessImageQualityFromBase64(
  base64Data: string,
  mimeType?: string
): Promise<ImageQualityAssessment> {
  const cleaned = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  return assessImageQuality({ buffer, mimeType });
}

/**
 * Production lab-scan pipeline.
 *
 * Flow (successful path = ONE Gemini call):
 * 1) Local image quality (no API)
 * 2) Load prompt (fallback first; specialized on retry if type known)
 * 3) Optional learning reference block (local KB, no API)
 * 4) Gemini extract (1 call)
 * 5) Build report + TypeScript post-process (rules, summary, next steps, biomarkers)
 * 6) Validate + extraction checklist
 * 7) On validation failure only → ONE retry with stronger prompt
 * 8) Record anonymized learning entry (non-blocking)
 */

import {
  runExtractionChecklist,
} from "@/lib/ai/quality";
import { validateReport, type ValidationResult } from "@/lib/ai/validators";
import type { LabReport } from "@/store/useAppStore";
import { buildLabReportFromParsed, toValidationPayload } from "./buildReport";
import { LAB_REPORT_SCHEMA, parseGeminiLabJson } from "./schema";
import { loadPromptWithMeta } from "@/lib/ai/prompts/promptLoader";
import { buildRetryPrompt } from "@/lib/ai/retry/retryPrompt";
import { assessImageQualityFromBase64 } from "@/lib/ai/imageQuality";
import {
  buildPromptReferenceContext,
  recordSuccessfulScan,
} from "@/lib/ai/learning";
import { GoogleGenAI } from "@google/genai";

export class LabScanError extends Error {
  readonly code: "unreadable_image" | "extraction_failed" | "validation_failed";
  readonly suggestion?: string;

  constructor(
    message: string,
    code: LabScanError["code"],
    suggestion?: string
  ) {
    super(message);
    this.name = "LabScanError";
    this.code = code;
    this.suggestion = suggestion;
  }
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

/** Min confidence for accepting a scan (validator). */
const MIN_CONFIDENCE = Number(process.env.LAB_SCAN_MIN_CONFIDENCE || 35);

async function callGeminiLabExtract(input: {
  base64Data: string;
  mimeType: string;
  prompt: string;
}): Promise<string> {
  const ai = getClient();
  const interaction = await ai.interactions.create({
    model: DEFAULT_MODEL,
    input: [
      { type: "text", text: input.prompt },
      {
        type: "image",
        data: input.base64Data,
        mime_type: input.mimeType,
      },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: LAB_REPORT_SCHEMA,
    },
  });

  const outputText = interaction.output_text;
  if (!outputText) {
    throw new Error("No response from Gemini");
  }
  return outputText;
}

function mergeValidation(
  a: ValidationResult,
  b: ValidationResult
): ValidationResult {
  const errors = [...new Set([...a.errors, ...b.errors])];
  const warnings = [...new Set([...a.warnings, ...b.warnings])];
  return { valid: errors.length === 0, errors, warnings };
}

function validateBuiltReport(report: LabReport): ValidationResult {
  const payload = toValidationPayload(report);
  const base = validateReport(payload, {
    minConfidence: MIN_CONFIDENCE,
    allowEmptyBiomarkers: true,
  });

  const checklist = runExtractionChecklist({
    report: payload,
    hints: {
      imageQuality: report.imageQuality,
      isPartialImage: (report.ocrWarnings ?? []).some((w) =>
        /crop|partial|incomplete|missing edge/i.test(w)
      ),
      imageIssues: report.ocrWarnings,
    },
  });

  // Checklist soft items stay as warnings; hard fails remain errors
  const softIds = new Set([
    "patient_information",
    "report_title",
    "high_low_indicators",
  ]);
  const hardErrors = checklist.errors.filter((e) => {
    const soft = [...softIds].some((id) => e.includes(`[checklist:${id}]`));
    return !soft;
  });
  const softAsWarnings = checklist.errors.filter((e) =>
    [...softIds].some((id) => e.includes(`[checklist:${id}]`))
  );

  return mergeValidation(base, {
    valid: hardErrors.length === 0,
    errors: hardErrors,
    warnings: [...checklist.warnings, ...softAsWarnings],
  });
}

function shouldRetry(validation: ValidationResult): boolean {
  if (validation.valid) return false;
  const joined = validation.errors.join(" | ");
  return (
    /malformed json|missing |findings array is empty|failed parsing|invalid confidence|below the configured threshold|checklist:/i.test(
      joined
    ) || validation.errors.length > 0
  );
}

/**
 * Production entry: analyze a lab/imaging report image.
 * Successful scans use exactly one Gemini call; validation failure allows one retry.
 */
export async function runLabScanPipeline(
  base64Data: string,
  mimeType: string
): Promise<LabReport> {
  // 1) Local image quality — no API call
  let qualitySuggestions: string[] = [];
  try {
    const quality = await assessImageQualityFromBase64(base64Data, mimeType);
    qualitySuggestions = quality.suggestions;
    if (!quality.canProceed) {
      throw new LabScanError(
        "Unable to read this image. Please upload a clearer photo of the full report.",
        "unreadable_image",
        quality.suggestions[0] ||
          "Hold the camera steady, capture the full report, avoid glare, and improve lighting."
      );
    }
  } catch (err) {
    if (err instanceof LabScanError) throw err;
    // Fail open if quality module cannot decode (e.g. some PDFs)
    console.warn("[labScan] image quality check skipped:", err);
  }

  // 2) First prompt = fallback (covers unknown types; specialized used on retry if detected)
  const initial = loadPromptWithMeta("Other");
  let promptText = initial.prompt;

  // Learning reference (local only; never blocks)
  try {
    const ref = await buildPromptReferenceContext("Other", { limit: 2 });
    if (ref.referenceBlock) {
      promptText = `${promptText}\n\n${ref.referenceBlock}`;
    }
  } catch (err) {
    console.warn("[labScan] learning reference skipped:", err);
  }

  if (qualitySuggestions.length > 0) {
    promptText += `\n\nIMAGE QUALITY NOTES (local heuristics):\n- ${qualitySuggestions.join("\n- ")}\nIf the image appears cropped, explain only the visible portion.`;
  }

  let usedRetry = false;
  let lastValidation: ValidationResult | undefined;
  let report: LabReport | undefined;
  let promptId = initial.promptId;

  // 3) First Gemini call
  try {
    const outputText = await callGeminiLabExtract({
      base64Data,
      mimeType,
      prompt: promptText,
    });
    const parsed = parseGeminiLabJson(outputText);
    report = buildLabReportFromParsed(parsed, { usedRetry: false });
    lastValidation = validateBuiltReport(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed parsing";
    lastValidation = {
      valid: false,
      errors: [message.includes("JSON") ? "Malformed JSON" : "Failed parsing"],
      warnings: [],
    };
    console.warn("[labScan] first attempt failed:", message);
  }

  // 4) One retry only if validation failed
  if ((!report || !lastValidation?.valid) && shouldRetry(lastValidation ?? { valid: false, errors: ["Failed parsing"], warnings: [] })) {
    usedRetry = true;
    const detectedType = report?.reportType ?? "Other";
    const specialized = loadPromptWithMeta(detectedType);
    promptId = specialized.promptId;
    const retryPrompt = buildRetryPrompt(specialized.prompt);

    try {
      const outputText = await callGeminiLabExtract({
        base64Data,
        mimeType,
        prompt: retryPrompt,
      });
      const parsed = parseGeminiLabJson(outputText);
      report = buildLabReportFromParsed(parsed, { usedRetry: true });
      lastValidation = validateBuiltReport(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed parsing on retry";
      console.warn("[labScan] retry failed:", message);
      throw new LabScanError(
        "Unable to accurately extract this report.",
        "extraction_failed",
        "Please upload a clearer image."
      );
    }
  }

  if (!report || !lastValidation?.valid) {
    throw new LabScanError(
      "Unable to accurately extract this report.",
      "validation_failed",
      "Please upload a clearer image."
    );
  }

  // 5) Non-blocking learning write
  void recordSuccessfulScan({
    report: {
      reportType: report.reportType,
      typeEn: report.typeEn,
      typeBn: report.typeBn,
      findings: report.findings,
      biomarkers: report.biomarkers,
      impression: report.impression,
      conclusion: report.conclusion,
      recommendation: report.recommendation,
      ocrWarnings: report.ocrWarnings,
    },
    reportType: report.reportType,
    promptId,
    validation: lastValidation,
    usedRetry,
  }).catch((err) => console.warn("[labScan] learning record skipped:", err));

  return report;
}

/** Exposed for tests / advanced callers */
export { loadPromptWithMeta as loadPrompt };

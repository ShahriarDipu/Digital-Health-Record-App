/**
 * Automatic Retry Manager for medical report scanning.
 *
 * - Retries ONLY when validation fails
 * - Retries at most ONE time
 * - Does not retry successful scans
 * - Logs first attempt, retry attempt, and failure reason
 *
 * Not wired into the scanner yet — inject the Gemini call via `executeAttempt`.
 */

import {
  validateReport,
  type ValidationResult,
  type ValidatorOptions,
} from "@/lib/ai/validators";
import { buildRetryPrompt, RETRY_EXTRACTION_INSTRUCTION } from "./retryPrompt";

export const MAX_RETRY_ATTEMPTS = 1;

export const DEFAULT_FAILURE_REASON =
  "Unable to accurately extract this report.";

export const DEFAULT_FAILURE_SUGGESTION =
  "Please upload a clearer image.";

export type RetryAttemptKind = "first" | "retry";

export interface RetryLogEntry {
  attempt: RetryAttemptKind;
  attemptNumber: number;
  timestamp: string;
  success: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  failureReason?: string;
  parseError?: string;
}

export interface RetryScanSuccess<T> {
  success: true;
  data: T;
  attempts: 1 | 2;
  usedRetry: boolean;
  validation: ValidationResult;
  logs: RetryLogEntry[];
}

export interface RetryScanFailure {
  success: false;
  reason: string;
  suggestion: string;
  attempts: 1 | 2;
  usedRetry: boolean;
  validation?: ValidationResult;
  logs: RetryLogEntry[];
  /** Validation / parse errors from the last attempt */
  errors: string[];
}

export type RetryScanResult<T> = RetryScanSuccess<T> | RetryScanFailure;

export interface RetryAttemptContext {
  /** 1 = first attempt, 2 = retry */
  attemptNumber: 1 | 2;
  isRetry: boolean;
  /** Stronger instruction — empty on first attempt */
  retryInstruction: string;
  /**
   * If a base prompt is provided to the manager, this is the full retry prompt.
   * On first attempt this equals basePrompt (or empty string).
   */
  prompt: string;
}

export interface RetryManagerOptions<T> {
  /**
   * Executes one Gemini extraction attempt.
   * On retry, context includes the stronger instruction / prompt.
   * This is the only place an extra Gemini call is allowed (max once).
   */
  executeAttempt: (ctx: RetryAttemptContext) => Promise<T>;

  /**
   * Optional: map attempt result to a JSON-like object for validation.
   * Defaults to using the result as-is when it is a plain object,
   * or JSON.parse when it is a string.
   */
  toValidationPayload?: (result: T) => unknown;

  /** Base prompt used to build the stronger retry prompt */
  basePrompt?: string;

  /** Forwarded to the JSON validator */
  validatorOptions?: ValidatorOptions;

  /**
   * Extra predicate: should we retry for this validation result?
   * Default uses shouldRetryForValidation().
   */
  shouldRetry?: (validation: ValidationResult, payload: unknown) => boolean;

  /** Structured error copy on final failure */
  failureReason?: string;
  failureSuggestion?: string;

  /** Optional logger override (defaults to console). */
  log?: (entry: RetryLogEntry) => void;
}

/** Error codes / message fragments that indicate a retryable failure. */
const RETRYABLE_ERROR_PATTERNS: RegExp[] = [
  /malformed json/i,
  /missing required/i,
  /missing reportType/i,
  /missing date/i,
  /missing summary/i,
  /missing meaning/i,
  /missing nextSteps/i,
  /missing findings/i,
  /missing biomarkers/i,
  /missing confidence/i,
  /findings array is empty/i,
  /findings must be an array/i,
  /failed parsing/i,
  /invalid json/i,
  /empty findings/i,
];

/**
 * Decide whether validation failure should trigger the single retry.
 */
export function shouldRetryForValidation(
  validation: ValidationResult,
  payload?: unknown
): boolean {
  if (validation.valid) return false;

  const joined = validation.errors.join(" | ");

  if (RETRYABLE_ERROR_PATTERNS.some((p) => p.test(joined))) {
    return true;
  }

  // Missing biomarkers when numeric values appear elsewhere in the payload text
  if (
    /missing biomarkers/i.test(joined) ||
    /biomarkers array is empty/i.test(joined)
  ) {
    if (payloadLooksNumeric(payload)) return true;
  }

  // Any incomplete core patient-facing field
  if (
    validation.errors.some((e) =>
      /missing or empty (summary|meaning|nextSteps)/i.test(e)
    )
  ) {
    return true;
  }

  // Empty findings always retry
  if (validation.errors.some((e) => /findings array is empty/i.test(e))) {
    return true;
  }

  // Invalid / incomplete extraction — still allow one retry for required-field class errors
  if (validation.errors.some((e) => /^Missing /i.test(e))) {
    return true;
  }

  return false;
}

function payloadLooksNumeric(payload: unknown): boolean {
  if (payload == null) return false;
  const text =
    typeof payload === "string" ? payload : safeJsonStringify(payload);
  // Heuristic: digits with units / lab-like patterns suggest numeric content exists
  return /\d+(\.\d+)?\s*(mg\/dL|g\/dL|mmol|uIU|ng\/mL|%|mm|cm|cc)\b/i.test(
    text
  );
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

function defaultToValidationPayload<T>(result: T): unknown {
  if (typeof result === "string") {
    try {
      return JSON.parse(result) as unknown;
    } catch {
      // Return a marker object so validator reports malformed JSON path via string validate
      return result;
    }
  }
  return result;
}

function emitLog(
  entry: RetryLogEntry,
  custom?: (entry: RetryLogEntry) => void
): void {
  if (custom) {
    custom(entry);
    return;
  }
  const prefix = `[LabScanRetry] ${entry.attempt} (#${entry.attemptNumber})`;
  if (entry.success) {
    console.info(prefix, "ok", {
      warnings: entry.validationWarnings,
    });
  } else {
    console.warn(prefix, "failed", {
      reason: entry.failureReason,
      errors: entry.validationErrors,
      parseError: entry.parseError,
    });
  }
}

function runValidation(
  payload: unknown,
  options?: ValidatorOptions
): ValidationResult {
  if (typeof payload === "string") {
    return validateReport(payload, options);
  }
  return validateReport(payload, options);
}

/**
 * Execute scan with at most one automatic retry on validation failure.
 */
export async function runWithRetry<T>(
  options: RetryManagerOptions<T>
): Promise<RetryScanResult<T>> {
  const logs: RetryLogEntry[] = [];
  const toPayload = options.toValidationPayload ?? defaultToValidationPayload;
  const basePrompt = options.basePrompt ?? "";
  const reason = options.failureReason ?? DEFAULT_FAILURE_REASON;
  const suggestion = options.failureSuggestion ?? DEFAULT_FAILURE_SUGGESTION;
  const shouldRetryFn = options.shouldRetry ?? shouldRetryForValidation;

  // ── First attempt ──────────────────────────────────────────────
  let firstResult: T;
  try {
    firstResult = await options.executeAttempt({
      attemptNumber: 1,
      isRetry: false,
      retryInstruction: "",
      prompt: basePrompt,
    });
  } catch (err) {
    const parseError =
      err instanceof Error ? err.message : "Failed parsing / extraction error";
    const entry: RetryLogEntry = {
      attempt: "first",
      attemptNumber: 1,
      timestamp: new Date().toISOString(),
      success: false,
      validationErrors: ["Failed parsing"],
      validationWarnings: [],
      failureReason: parseError,
      parseError,
    };
    logs.push(entry);
    emitLog(entry, options.log);

    // One retry on failed parsing
    return retryOnce({
    options,
    logs,
    basePrompt,
    reason,
    suggestion,
    toPayload,
    priorFailureReason: parseError,
  });
  }

  const firstPayload = toPayload(firstResult);
  const firstValidation = runValidation(firstPayload, options.validatorOptions);

  const firstLog: RetryLogEntry = {
    attempt: "first",
    attemptNumber: 1,
    timestamp: new Date().toISOString(),
    success: firstValidation.valid,
    validationErrors: [...firstValidation.errors],
    validationWarnings: [...firstValidation.warnings],
    failureReason: firstValidation.valid
      ? undefined
      : firstValidation.errors.join("; ") || "Validation failed",
  };
  logs.push(firstLog);
  emitLog(firstLog, options.log);

  if (firstValidation.valid) {
    return {
      success: true,
      data: firstResult,
      attempts: 1,
      usedRetry: false,
      validation: firstValidation,
      logs,
    };
  }

  if (!shouldRetryFn(firstValidation, firstPayload)) {
    return {
      success: false,
      reason,
      suggestion,
      attempts: 1,
      usedRetry: false,
      validation: firstValidation,
      logs,
      errors: [...firstValidation.errors],
    };
  }

  return retryOnce({
    options,
    logs,
    basePrompt,
    reason,
    suggestion,
    toPayload,
    priorFailureReason: firstLog.failureReason,
  });
}

async function retryOnce<T>(args: {
  options: RetryManagerOptions<T>;
  logs: RetryLogEntry[];
  basePrompt: string;
  reason: string;
  suggestion: string;
  toPayload: (result: T) => unknown;
  priorFailureReason?: string;
}): Promise<RetryScanResult<T>> {
  const { options, logs, basePrompt, reason, suggestion, toPayload } = args;

  // Hard cap: never more than one retry
  if (logs.filter((l) => l.attempt === "retry").length >= MAX_RETRY_ATTEMPTS) {
    return {
      success: false,
      reason,
      suggestion,
      attempts: 2,
      usedRetry: true,
      logs,
      errors: [args.priorFailureReason ?? reason],
    };
  }

  const retryPrompt = basePrompt
    ? buildRetryPrompt(basePrompt)
    : RETRY_EXTRACTION_INSTRUCTION;

  let retryResult: T;
  try {
    retryResult = await options.executeAttempt({
      attemptNumber: 2,
      isRetry: true,
      retryInstruction: RETRY_EXTRACTION_INSTRUCTION,
      prompt: retryPrompt,
    });
  } catch (err) {
    const parseError =
      err instanceof Error ? err.message : "Failed parsing on retry";
    const entry: RetryLogEntry = {
      attempt: "retry",
      attemptNumber: 2,
      timestamp: new Date().toISOString(),
      success: false,
      validationErrors: ["Failed parsing"],
      validationWarnings: [],
      failureReason: parseError,
      parseError,
    };
    logs.push(entry);
    emitLog(entry, options.log);

    return {
      success: false,
      reason,
      suggestion,
      attempts: 2,
      usedRetry: true,
      logs,
      errors: [parseError],
    };
  }

  const retryPayload = toPayload(retryResult);
  const retryValidation = runValidation(
    retryPayload,
    options.validatorOptions
  );

  const retryLog: RetryLogEntry = {
    attempt: "retry",
    attemptNumber: 2,
    timestamp: new Date().toISOString(),
    success: retryValidation.valid,
    validationErrors: [...retryValidation.errors],
    validationWarnings: [...retryValidation.warnings],
    failureReason: retryValidation.valid
      ? undefined
      : retryValidation.errors.join("; ") || "Validation failed on retry",
  };
  logs.push(retryLog);
  emitLog(retryLog, options.log);

  if (retryValidation.valid) {
    return {
      success: true,
      data: retryResult,
      attempts: 2,
      usedRetry: true,
      validation: retryValidation,
      logs,
    };
  }

  return {
    success: false,
    reason,
    suggestion,
    attempts: 2,
    usedRetry: true,
    validation: retryValidation,
    logs,
    errors: [...retryValidation.errors],
  };
}

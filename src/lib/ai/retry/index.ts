/**
 * Automatic Retry System for the medical report scanner.
 *
 * Usage (when wiring later):
 *
 *   const result = await runWithRetry({
 *     basePrompt,
 *     executeAttempt: async ({ isRetry, prompt, retryInstruction }) => {
 *       // single Gemini call per attempt (max 2 total)
 *       return analyzeWithPrompt(isRetry ? prompt : basePrompt);
 *     },
 *     toValidationPayload: (report) => report,
 *   });
 *
 * Does not modify scanner logic by itself — only provides the retry module.
 */

export {
  RETRY_EXTRACTION_INSTRUCTION,
  buildRetryPrompt,
  getRetryPromptPayload,
  type RetryPromptPayload,
} from "./retryPrompt";

export {
  runWithRetry,
  shouldRetryForValidation,
  MAX_RETRY_ATTEMPTS,
  DEFAULT_FAILURE_REASON,
  DEFAULT_FAILURE_SUGGESTION,
  type RetryAttemptKind,
  type RetryLogEntry,
  type RetryScanSuccess,
  type RetryScanFailure,
  type RetryScanResult,
  type RetryAttemptContext,
  type RetryManagerOptions,
} from "./retryManager";

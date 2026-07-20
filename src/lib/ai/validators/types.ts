/**
 * Shared types for the medical report JSON validator.
 * Pure TypeScript — no AI. Never mutates the Gemini response.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidatorOptions {
  /**
   * Minimum accepted confidence (0–100).
   * Responses below this threshold are rejected.
   * @default 40
   */
  minConfidence?: number;
  /**
   * If true, empty biomarkers[] is allowed (imaging reports).
   * Findings must still be non-empty.
   * @default true
   */
  allowEmptyBiomarkers?: boolean;
}

export const DEFAULT_MIN_CONFIDENCE = 40;

export const VALID_FINDING_STATUSES = ["normal", "concern", "info"] as const;
export type ValidFindingStatus = (typeof VALID_FINDING_STATUSES)[number];

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function pushError(errors: string[], message: string): void {
  if (!errors.includes(message)) errors.push(message);
}

export function pushWarning(warnings: string[], message: string): void {
  if (!warnings.includes(message)) warnings.push(message);
}

export function emptyResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

export function finalize(errors: string[], warnings: string[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

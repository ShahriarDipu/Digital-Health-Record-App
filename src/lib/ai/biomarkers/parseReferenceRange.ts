/**
 * Parse printed reference ranges without inventing limits.
 */

import type { NormalRange } from "./types";

const RANGE_PATTERNS: RegExp[] = [
  // 3.5 - 5.5 | 3.5–5.5 | 3.5—5.5 | 3.5~5.5
  /(-?\d+(?:\.\d+)?)\s*[-–—~]\s*(-?\d+(?:\.\d+)?)/,
  // 3.5 to 5.5
  /(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)/i,
  // (3.5-5.5) or [3.5-5.5]
  /[(\[]\s*(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)\s*[)\]]/,
  // 3.5 - 5.5 mg/dL (unit trailing — still capture both limits)
  /(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)\s*[a-zA-Z/%µμ°]/,
];

function toNumberPreserve(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extract min/max from a printed range string.
 * Returns null if both limits are not clearly present (never invent).
 */
export function parseReferenceRangeText(text: unknown): NormalRange | null {
  if (typeof text !== "string") return null;
  const cleaned = text.trim();
  if (!cleaned || /^n\/?a$/i.test(cleaned) || cleaned === "-" || cleaned === "—") {
    return null;
  }

  for (const pattern of RANGE_PATTERNS) {
    const m = cleaned.match(pattern);
    if (!m) continue;
    const min = toNumberPreserve(m[1]);
    const max = toNumberPreserve(m[2]);
    if (min == null || max == null) continue;
    if (min > max) continue;
    return { min, max, text: cleaned };
  }

  return null;
}

/**
 * Build normalRange from discrete min/max fields.
 * Both must be finite numbers and not the "missing" sentinel pair (0,0) unless
 * allowZeroRange is true. Default: (0,0) means "not provided" for legacy Gemini output.
 */
export function normalRangeFromLimits(
  minRaw: unknown,
  maxRaw: unknown,
  options?: { treatZeroZeroAsMissing?: boolean; text?: string }
): NormalRange | null {
  const treatZeroZeroAsMissing = options?.treatZeroZeroAsMissing !== false;

  const min =
    typeof minRaw === "number"
      ? minRaw
      : typeof minRaw === "string" && minRaw.trim() !== ""
        ? Number(minRaw)
        : null;
  const max =
    typeof maxRaw === "number"
      ? maxRaw
      : typeof maxRaw === "string" && maxRaw.trim() !== ""
        ? Number(maxRaw)
        : null;

  if (min == null || max == null) return null;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (treatZeroZeroAsMissing && min === 0 && max === 0) return null;
  if (min > max) return null;

  return {
    min,
    max,
    ...(options?.text ? { text: options.text } : {}),
  };
}

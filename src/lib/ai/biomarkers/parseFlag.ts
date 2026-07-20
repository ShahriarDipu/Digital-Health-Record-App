/**
 * Detect explicit High/Low flags from report text without guessing.
 */

import type { BiomarkerFlag, BiomarkerStatus } from "./types";

const HIGH_PATTERNS = [
  /^\s*h\s*$/i,
  /^\s*high\s*$/i,
  /^\s*↑\s*$/,
  /^\s*\^\s*$/,
  /\bflag\s*[:=]?\s*h\b/i,
  /\bhigh\b/i,
  /↑/,
];

const LOW_PATTERNS = [
  /^\s*l\s*$/i,
  /^\s*low\s*$/i,
  /^\s*↓\s*$/,
  /\bflag\s*[:=]?\s*l\b/i,
  /\blow\b/i,
  /↓/,
];

const NORMAL_PATTERNS = [
  /^\s*n\s*$/i,
  /^\s*normal\s*$/i,
  /\bflag\s*[:=]?\s*n\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Parse an explicit flag field or annotation from the report.
 */
export function parseBiomarkerFlag(raw: unknown): BiomarkerFlag {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;

  // Prefer exact token matches first
  if (/^(h|high|↑|\^)$/i.test(text)) {
    if (/^(↑|\^)$/.test(text)) return "↑";
    if (/^h$/i.test(text)) return "H";
    return "High";
  }
  if (/^(l|low|↓)$/i.test(text)) {
    if (text === "↓") return "↓";
    if (/^l$/i.test(text)) return "L";
    return "Low";
  }
  if (/^(n|normal)$/i.test(text)) {
    return /^n$/i.test(text) ? "N" : "Normal";
  }

  // Soft match inside short annotations (avoid matching biomarker names like "HDL")
  if (text.length <= 12) {
    if (matchesAny(text, HIGH_PATTERNS) && !matchesAny(text, LOW_PATTERNS)) {
      return text.includes("↑") ? "↑" : /high/i.test(text) ? "High" : "H";
    }
    if (matchesAny(text, LOW_PATTERNS) && !matchesAny(text, HIGH_PATTERNS)) {
      return text.includes("↓") ? "↓" : /low/i.test(text) ? "Low" : "L";
    }
    if (matchesAny(text, NORMAL_PATTERNS)) {
      return /normal/i.test(text) ? "Normal" : "N";
    }
  }

  return null;
}

export function statusFromFlag(flag: BiomarkerFlag): BiomarkerStatus | null {
  if (!flag) return null;
  if (flag === "H" || flag === "High" || flag === "↑") return "high";
  if (flag === "L" || flag === "Low" || flag === "↓") return "low";
  if (flag === "Normal" || flag === "N") return "normal";
  return null;
}

/**
 * Calculate status only when BOTH reference limits exist.
 * Never calculate without a full range.
 */
export function statusFromRange(
  value: number,
  min: number,
  max: number
): BiomarkerStatus {
  if (value < min) return "low";
  if (value > max) return "high";
  return "normal";
}

/**
 * Resolve final status: explicit flag wins; else range if complete; else unknown.
 */
export function resolveBiomarkerStatus(
  value: number,
  flag: BiomarkerFlag,
  range: { min: number; max: number } | null
): BiomarkerStatus {
  const fromFlag = statusFromFlag(flag);
  if (fromFlag) return fromFlag;
  if (range && Number.isFinite(range.min) && Number.isFinite(range.max)) {
    return statusFromRange(value, range.min, range.max);
  }
  return "unknown";
}

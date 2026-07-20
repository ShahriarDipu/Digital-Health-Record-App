/**
 * Normalize raw Gemini biomarker rows into accurate structured biomarkers.
 * Does not invent values, units, or reference ranges.
 * Preserves input order.
 * Does not change scanner / API call flow — post-process only.
 */

import {
  normalRangeFromLimits,
  parseReferenceRangeText,
} from "./parseReferenceRange";
import { parseBiomarkerFlag, resolveBiomarkerStatus } from "./parseFlag";
import { isImagingSizeMeasurement } from "@/lib/biomarkerNames";
import type {
  AccurateBiomarker,
  BiomarkerFlag,
  NormalizeBiomarkersResult,
  NormalRange,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * Parse numeric value without changing magnitude.
 * Accepts number or numeric string; rejects invalid.
 * Does not round — uses Number() on the exact digit string.
 */
export function parseExactNumber(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === "string") {
    const cleaned = raw.trim().replace(/,/g, "");
    if (!cleaned || /not\s+clearly\s+visible/i.test(cleaned)) return null;
    // Exact numeric string
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }
    // Value with sticky flag/marker e.g. "12.5*", "12.5 H", "12.5↑"
    const m = cleaned.match(/^(-?\d+(?:\.\d+)?)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Resolve printed reference range only.
 * Explicit null / hasReferenceRange=false → null (never invent).
 */
function resolveNormalRange(row: Record<string, unknown>): NormalRange | null {
  if (row.hasReferenceRange === false) return null;
  if ("normalRange" in row && row.normalRange === null) return null;

  if (row.normalRange && typeof row.normalRange === "object") {
    const nr = row.normalRange as Record<string, unknown>;
    if (nr.min == null && nr.max == null && !nr.text) return null;
    const fromObj = normalRangeFromLimits(nr.min, nr.max, {
      text: typeof nr.text === "string" ? nr.text : undefined,
    });
    if (fromObj) return fromObj;
    if (typeof nr.text === "string") {
      return parseReferenceRangeText(nr.text);
    }
  }

  if (typeof row.referenceRange === "string") {
    const fromText = parseReferenceRangeText(row.referenceRange);
    if (fromText) return fromText;
  }
  if (typeof row.normalRangeText === "string") {
    const fromText = parseReferenceRangeText(row.normalRangeText);
    if (fromText) return fromText;
  }

  return normalRangeFromLimits(row.normalMin, row.normalMax);
}

/**
 * Only explicit printed flag fields — never treat AI-computed status as a flag.
 */
function resolveFlag(row: Record<string, unknown>): BiomarkerFlag {
  const candidates = [row.flag, row.statusFlag, row.hl, row.remark, row.remarks];
  for (const c of candidates) {
    // Ignore empty / placeholder
    if (c == null || c === "" || c === "-") continue;
    const parsed = parseBiomarkerFlag(c);
    if (parsed) return parsed;
  }

  // Sticky flag on value string e.g. "12.5 H" or "12.5↑"
  if (typeof row.value === "string") {
    const sticky = row.value.trim().match(/(?:^|\s)(H|L|High|Low|↑|↓|N|Normal)\s*$/i);
    if (sticky) {
      const parsed = parseBiomarkerFlag(sticky[1]);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Normalize a raw biomarkers array from Gemini / parsers.
 * - Never invents biomarkers or ranges
 * - Preserves order
 * - Keeps rows when unit is unclear (does not invent a unit; marks Not clearly visible)
 * - Skips only invalid name/value rows (cannot invent those)
 */
export function normalizeBiomarkers(raw: unknown): NormalizeBiomarkersResult {
  const skipped: string[] = [];
  const warnings: string[] = [];
  const biomarkers: AccurateBiomarker[] = [];

  if (raw == null) {
    return { biomarkers: [], skipped, warnings };
  }

  if (!Array.isArray(raw)) {
    warnings.push("Biomarkers payload is not an array");
    return { biomarkers: [], skipped, warnings };
  }

  raw.forEach((item, index) => {
    const row = asRecord(item);
    if (!row) {
      skipped.push(`index ${index}: not an object`);
      return;
    }

    const nameEn =
      nonEmptyString(row.nameEn) ||
      nonEmptyString(row.name) ||
      nonEmptyString(row.nameBn);
    const nameBn =
      nonEmptyString(row.nameBn) ||
      nonEmptyString(row.name) ||
      nameEn;

    if (!nameEn || !nameBn) {
      skipped.push(`index ${index}: missing biomarker name`);
      return;
    }

    const value = parseExactNumber(row.value);
    if (value == null) {
      skipped.push(`index ${index} (${nameEn}): invalid or missing value`);
      return;
    }

    let unit = nonEmptyString(row.unit) ?? "";
    if (!unit) {
      warnings.push(
        `index ${index} (${nameEn}): missing unit — kept row without inventing a unit`
      );
      unit = "Not clearly visible";
    } else if (/not\s+clearly\s+visible/i.test(unit)) {
      warnings.push(`index ${index} (${nameEn}): unit not clearly visible`);
    }

    let resolvedRange = resolveNormalRange(row);
    const nameBlob = `${nameEn} ${nameBn}`;
    if (isImagingSizeMeasurement(nameBlob)) {
      resolvedRange = null;
    }
    const hasReferenceRange = resolvedRange != null;

    if (row.hasReferenceRange === true && resolvedRange == null) {
      warnings.push(
        `index ${index} (${nameEn}): hasReferenceRange=true but no usable printed limits → treated as null`
      );
    }

    const flag = resolveFlag(row);
    const status = resolveBiomarkerStatus(value, flag, resolvedRange);

    // Gemini sometimes sends status high/low without flag or range — ignore that
    if (
      !flag &&
      !resolvedRange &&
      (row.status === "high" || row.status === "low" || row.status === "normal")
    ) {
      warnings.push(
        `index ${index} (${nameEn}): model status ignored without printed flag or reference range`
      );
    }

    biomarkers.push({
      nameBn,
      nameEn,
      value,
      unit,
      normalRange: hasReferenceRange ? resolvedRange : null,
      flag,
      status: !flag && !resolvedRange ? "unknown" : status,
      order: biomarkers.length,
    });
  });

  return { biomarkers, skipped, warnings };
}

/**
 * Map accurate biomarkers to a legacy-compatible shape for older UI code.
 * Missing ranges become null (not invented).
 */
export function toNullableLegacyBiomarkers(biomarkers: AccurateBiomarker[]): Array<{
  name: string;
  nameBn: string;
  nameEn: string;
  value: number;
  unit: string;
  normalMin: number | null;
  normalMax: number | null;
  normalRange: { min: number; max: number } | null;
  flag: BiomarkerFlag;
  status: "high" | "low" | "normal" | "unknown";
  order: number;
}> {
  return biomarkers.map((b) => ({
    name: b.nameBn || b.nameEn,
    nameBn: b.nameBn,
    nameEn: b.nameEn,
    value: b.value,
    unit: b.unit,
    normalMin: b.normalRange?.min ?? null,
    normalMax: b.normalRange?.max ?? null,
    normalRange: b.normalRange,
    flag: b.flag,
    status: b.status,
    order: b.order,
  }));
}

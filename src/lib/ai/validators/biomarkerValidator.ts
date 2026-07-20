/**
 * Validates individual biomarker objects in the Gemini JSON response.
 * Does not mutate input.
 */

import { isFiniteNumber, isNonEmptyString, pushError, pushWarning } from "./types";

export interface BiomarkerValidationIssue {
  index: number;
  errors: string[];
  warnings: string[];
  /** Normalized key used for duplicate detection */
  duplicateKey?: string;
}

function biomarkerNameKey(b: Record<string, unknown>): string {
  const bn = typeof b.nameBn === "string" ? b.nameBn.trim().toLowerCase() : "";
  const en = typeof b.nameEn === "string" ? b.nameEn.trim().toLowerCase() : "";
  const legacy = typeof b.name === "string" ? b.name.trim().toLowerCase() : "";
  return en || bn || legacy;
}

/**
 * Validate a single biomarker. Returns errors/warnings for that item.
 */
export function validateBiomarker(
  biomarker: unknown,
  index: number
): BiomarkerValidationIssue {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (
    biomarker == null ||
    typeof biomarker !== "object" ||
    Array.isArray(biomarker)
  ) {
    errors.push(`Biomarker[${index}] is not a valid object`);
    return { index, errors, warnings };
  }

  const b = biomarker as Record<string, unknown>;

  if (!isNonEmptyString(b.nameBn)) {
    errors.push(`Biomarker[${index}] missing or empty nameBn`);
  }
  if (!isNonEmptyString(b.nameEn)) {
    errors.push(`Biomarker[${index}] missing or empty nameEn`);
  }

  if (b.value === undefined || b.value === null) {
    errors.push(`Biomarker[${index}] missing value`);
  } else if (typeof b.value === "string" && b.value.trim() !== "") {
    const parsed = Number(b.value);
    if (!Number.isFinite(parsed)) {
      errors.push(`Biomarker[${index}] invalid biomarker value "${b.value}"`);
    } else {
      warnings.push(
        `Biomarker[${index}] value is a string (numeric string is acceptable but preferred as number)`
      );
    }
  } else if (!isFiniteNumber(b.value)) {
    errors.push(
      `Biomarker[${index}] invalid biomarker value "${String(b.value)}"`
    );
  } else if (Number.isNaN(b.value)) {
    errors.push(`Biomarker[${index}] invalid biomarker value (NaN)`);
  }

  if (!isNonEmptyString(b.unit)) {
    errors.push(`Biomarker[${index}] missing or empty unit`);
  }

  // Optional range checks — warn only; never invent ranges
  if (b.normalMin !== undefined && b.normalMin !== null && !isFiniteNumber(b.normalMin)) {
    errors.push(`Biomarker[${index}] invalid normalMin`);
  }
  if (b.normalMax !== undefined && b.normalMax !== null && !isFiniteNumber(b.normalMax)) {
    errors.push(`Biomarker[${index}] invalid normalMax`);
  }
  if (
    isFiniteNumber(b.normalMin) &&
    isFiniteNumber(b.normalMax) &&
    !(b.normalMin === 0 && b.normalMax === 0) &&
    b.normalMin > b.normalMax
  ) {
    warnings.push(
      `Biomarker[${index}] normalMin (${b.normalMin}) is greater than normalMax (${b.normalMax})`
    );
  }
  if (
    b.hasReferenceRange === true &&
    (!isFiniteNumber(b.normalMin) ||
      !isFiniteNumber(b.normalMax) ||
      (b.normalMin === 0 && b.normalMax === 0))
  ) {
    warnings.push(
      `Biomarker[${index}] hasReferenceRange=true but usable normalMin/normalMax missing`
    );
  }
  if (
    b.hasReferenceRange === false &&
    (b.status === "high" || b.status === "low") &&
    !(b.flag != null && String(b.flag).trim() !== "")
  ) {
    warnings.push(
      `Biomarker[${index}] High/Low status without reference range or printed flag`
    );
  }

  return {
    index,
    errors,
    warnings,
    duplicateKey: biomarkerNameKey(b) || undefined,
  };
}

/**
 * Validate the biomarkers array. Does not mutate the array.
 * Rejects invalid items and duplicate names.
 */
export function validateBiomarkers(
  biomarkers: unknown,
  options?: { allowEmpty?: boolean }
): {
  errors: string[];
  warnings: string[];
  validCount: number;
  invalidCount: number;
} {
  const allowEmpty = options?.allowEmpty !== false;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (biomarkers === undefined || biomarkers === null) {
    pushError(errors, "Missing biomarkers");
    return { errors, warnings, validCount: 0, invalidCount: 0 };
  }

  if (!Array.isArray(biomarkers)) {
    pushError(errors, "Biomarkers must be an array");
    return { errors, warnings, validCount: 0, invalidCount: 0 };
  }

  if (biomarkers.length === 0) {
    if (!allowEmpty) {
      pushError(errors, "Biomarkers array is empty");
    } else {
      pushWarning(
        warnings,
        "Biomarkers array is empty (allowed for non-numeric / imaging reports)"
      );
    }
    return { errors, warnings, validCount: 0, invalidCount: 0 };
  }

  let validCount = 0;
  let invalidCount = 0;
  const seenKeys = new Map<string, number>();

  biomarkers.forEach((item, index) => {
    const issue = validateBiomarker(item, index);

    if (issue.duplicateKey) {
      const firstIndex = seenKeys.get(issue.duplicateKey);
      if (firstIndex !== undefined) {
        pushError(
          errors,
          `Duplicate biomarker "${issue.duplicateKey}" at index ${index} (first seen at index ${firstIndex})`
        );
      } else {
        seenKeys.set(issue.duplicateKey, index);
      }
    }

    if (issue.errors.length > 0) {
      invalidCount += 1;
      for (const e of issue.errors) pushError(errors, e);
      pushError(errors, `Invalid biomarker at index ${index}`);
    } else {
      validCount += 1;
    }
    for (const w of issue.warnings) pushWarning(warnings, w);
  });

  if (invalidCount > 0) {
    pushError(
      errors,
      `${invalidCount} invalid biomarker(s) rejected (must contain nameBn, nameEn, value, unit)`
    );
  }

  return { errors, warnings, validCount, invalidCount };
}

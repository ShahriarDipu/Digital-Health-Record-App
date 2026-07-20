/**
 * Validates individual finding objects in the Gemini JSON response.
 * Does not mutate input.
 */

import {
  isNonEmptyString,
  pushError,
  pushWarning,
  VALID_FINDING_STATUSES,
  type ValidFindingStatus,
} from "./types";

export interface FindingValidationIssue {
  index: number;
  errors: string[];
  warnings: string[];
}

function isValidStatus(value: unknown): value is ValidFindingStatus {
  return (
    typeof value === "string" &&
    (VALID_FINDING_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Validate a single finding. Returns errors/warnings for that item.
 * Invalid findings should cause the parent report to be rejected.
 */
export function validateFinding(
  finding: unknown,
  index: number
): FindingValidationIssue {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (finding == null || typeof finding !== "object" || Array.isArray(finding)) {
    errors.push(`Finding[${index}] is not a valid object`);
    return { index, errors, warnings };
  }

  const f = finding as Record<string, unknown>;

  if (!isNonEmptyString(f.titleBn)) {
    errors.push(`Finding[${index}] missing or empty titleBn`);
  }
  if (!isNonEmptyString(f.titleEn)) {
    errors.push(`Finding[${index}] missing or empty titleEn`);
  }
  if (!isNonEmptyString(f.detailBn)) {
    errors.push(`Finding[${index}] missing or empty detailBn`);
  }
  if (!isNonEmptyString(f.detailEn)) {
    errors.push(`Finding[${index}] missing or empty detailEn`);
  }

  if (f.status === undefined || f.status === null || f.status === "") {
    errors.push(`Finding[${index}] missing status`);
  } else if (!isValidStatus(f.status)) {
    errors.push(
      `Finding[${index}] invalid status "${String(f.status)}" (expected: normal | concern | info)`
    );
  }

  // Soft checks — warnings only
  if (
    isNonEmptyString(f.detailBn) &&
    isNonEmptyString(f.detailEn) &&
    f.detailBn.trim() === f.detailEn.trim()
  ) {
    warnings.push(`Finding[${index}] detailBn and detailEn are identical`);
  }

  return { index, errors, warnings };
}

/**
 * Validate the findings array. Does not mutate the array.
 * Rejects empty arrays and invalid items.
 */
export function validateFindings(findings: unknown): {
  errors: string[];
  warnings: string[];
  validCount: number;
  invalidCount: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (findings === undefined || findings === null) {
    pushError(errors, "Missing findings");
    return { errors, warnings, validCount: 0, invalidCount: 0 };
  }

  if (!Array.isArray(findings)) {
    pushError(errors, "Findings must be an array");
    return { errors, warnings, validCount: 0, invalidCount: 0 };
  }

  if (findings.length === 0) {
    pushError(errors, "Findings array is empty");
    return { errors, warnings, validCount: 0, invalidCount: 0 };
  }

  let validCount = 0;
  let invalidCount = 0;

  findings.forEach((item, index) => {
    const issue = validateFinding(item, index);
    if (issue.errors.length > 0) {
      invalidCount += 1;
      for (const e of issue.errors) pushError(errors, e);
      pushError(errors, `Invalid finding at index ${index}`);
    } else {
      validCount += 1;
    }
    for (const w of issue.warnings) pushWarning(warnings, w);
  });

  if (invalidCount > 0) {
    pushError(
      errors,
      `${invalidCount} invalid finding(s) rejected (must contain titleBn, titleEn, detailBn, detailEn, status)`
    );
  }

  return { errors, warnings, validCount, invalidCount };
}

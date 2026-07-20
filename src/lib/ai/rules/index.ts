/**
 * Medical Rule Engine
 *
 * Runs AFTER Gemini extraction (caller wires later).
 * Pure TypeScript — no AI, no second Gemini call.
 *
 * Contract:
 * - Never invent findings
 * - Never remove findings
 * - Never change numeric values / measurements / reference ranges
 * - May improve wording, correct interpretation mistakes, adjust severity,
 *   and add safety notes
 *
 * Extend: add a new file under rules/ and push into EXTRA_RULE_MODULES
 * (or call registerRules) — do not edit existing rule logic.
 */

import { abdomenRules } from "./abdomen";
import { cbcRules } from "./cbc";
import {
  freezeBiomarkerSnapshot,
  generalRules,
  restoreBiomarkerIntegrity,
} from "./general";
import { pregnancyRules } from "./pregnancy";
import { tvsRules } from "./tvs";
import { urineRules } from "./urine";
import {
  buildCorpus,
  cloneReport,
  type MedicalRule,
  type RuleContext,
  type RuleEngineReport,
} from "./types";

export type {
  MedicalRule,
  RuleContext,
  RuleEngineReport,
  RuleFinding,
  RuleBiomarker,
  FindingStatus,
} from "./types";

export { pregnancyRules } from "./pregnancy";
export { tvsRules } from "./tvs";
export { abdomenRules } from "./abdomen";
export { urineRules } from "./urine";
export { cbcRules } from "./cbc";
export { generalRules } from "./general";

/** Built-in rule modules (order matters: specific → general). */
const BUILTIN_RULE_MODULES: readonly MedicalRule[][] = [
  pregnancyRules,
  tvsRules,
  abdomenRules,
  urineRules,
  cbcRules,
  generalRules,
];

/** Extra modules registered at runtime without editing built-in files. */
const EXTRA_RULE_MODULES: MedicalRule[][] = [];

/**
 * Register additional rule modules (extension point).
 * Adding new medical rules should not require changing existing rule files.
 */
export function registerRules(rules: MedicalRule | MedicalRule[]): void {
  EXTRA_RULE_MODULES.push(Array.isArray(rules) ? rules : [rules]);
}

/** Flatten all rules in execution order. */
export function listMedicalRules(): MedicalRule[] {
  return [...BUILTIN_RULE_MODULES, ...EXTRA_RULE_MODULES].flat();
}

export interface RuleEngineResult<T extends RuleEngineReport = RuleEngineReport> {
  report: T;
  /** Rule ids that matched and ran */
  appliedRuleIds: string[];
  /** Finding count before / after (must be equal — engine never removes findings) */
  findingCountBefore: number;
  findingCountAfter: number;
}

function assertFindingsPreserved(
  before: number,
  after: number
): void {
  if (after < before) {
    throw new Error(
      `Medical Rule Engine violated contract: findings decreased from ${before} to ${after}`
    );
  }
}

/**
 * Apply deterministic medical safety rules to extracted JSON.
 * Input is cloned — original object is not mutated.
 */
export function applyMedicalRules<T extends RuleEngineReport>(
  input: T
): RuleEngineResult<T> {
  const report = cloneReport(input);
  const findingCountBefore = report.findings?.length ?? 0;
  const biomarkerSnap = freezeBiomarkerSnapshot(report);
  const appliedRuleIds: string[] = [];

  const ctx: RuleContext = {
    report,
    corpus: buildCorpus(report),
  };

  for (const rule of listMedicalRules()) {
    try {
      if (rule.matches && !rule.matches(ctx)) continue;
      // Refresh corpus before each rule so prior wording fixes are visible
      ctx.corpus = buildCorpus(report);
      rule.apply(ctx);
      appliedRuleIds.push(rule.id);
    } catch (err) {
      // Fail open for a single rule — never block the scan response
      console.error(`[MedicalRuleEngine] Rule "${rule.id}" failed:`, err);
    }
  }

  // Hard guarantee: never change numeric biomarker values / ranges / units
  restoreBiomarkerIntegrity(biomarkerSnap, report);

  const findingCountAfter = report.findings?.length ?? 0;
  assertFindingsPreserved(findingCountBefore, findingCountAfter);

  return {
    report,
    appliedRuleIds,
    findingCountBefore,
    findingCountAfter,
  };
}

/**
 * Convenience: return only the corrected report.
 */
export function runMedicalRuleEngine<T extends RuleEngineReport>(input: T): T {
  return applyMedicalRules(input).report;
}

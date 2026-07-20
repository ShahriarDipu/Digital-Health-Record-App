/**
 * Generate developer-facing prompt improvement suggestions.
 * NEVER automatically changes prompts — recommendations only.
 */

import { flagRepeatedCorrections } from "./feedbackAnalyzer";
import { listKnowledgeEntries, type KnowledgeBaseOptions } from "./knowledgeBase";
import type { PromptImprovementSuggestion } from "./types";

/** Expected coverage hints per report type (names often missed). */
const COVERAGE_EXPECTATIONS: Record<string, string[]> = {
  CBC: ["ESR", "Hemoglobin", "WBC", "Platelet", "RBC", "MCV"],
  TVS: ["ovary volume", "endometrium", "uterus", "POD"],
  Pregnancy_USG: ["placenta", "presentation", "CRL", "cardiac activity", "liquor"],
  PregnancyUltrasound: ["placenta", "presentation", "CRL", "cardiac activity"],
  Pelvic_USG: ["uterus", "ovary", "endometrium"],
  PelvicUltrasound: ["uterus", "ovary", "endometrium"],
  Whole_Abdomen: ["liver", "kidney", "gallbladder", "spleen"],
  WholeAbdomen: ["liver", "kidney", "gallbladder"],
  Urine: ["pus cells", "RBC", "protein", "glucose"],
  Lipid: ["HDL", "LDL", "Triglyceride", "Cholesterol"],
  LipidProfile: ["HDL", "LDL", "Triglyceride"],
  LFT: ["SGPT", "SGOT", "Bilirubin", "ALT", "AST"],
  LiverFunction: ["SGPT", "SGOT", "Bilirubin"],
  KFT: ["Creatinine", "Urea", "eGFR"],
  KidneyFunction: ["Creatinine", "Urea"],
  Thyroid: ["TSH", "T3", "T4"],
  ThyroidProfile: ["TSH", "FT4", "FT3"],
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, " ").trim();
}

function mentions(haystack: string[], needle: string): boolean {
  const n = normalizeName(needle);
  return haystack.some((h) => {
    const x = normalizeName(h);
    return x.includes(n) || n.includes(x);
  });
}

/**
 * Detect missing common fields by report type across the knowledge base.
 */
export async function generateCoverageSuggestions(
  options?: KnowledgeBaseOptions & { minMisses?: number }
): Promise<PromptImprovementSuggestion[]> {
  const minMisses = options?.minMisses ?? 5;
  const entries = await listKnowledgeEntries(options);
  const byType = new Map<string, typeof entries>();

  for (const e of entries) {
    const list = byType.get(e.reportType) ?? [];
    list.push(e);
    byType.set(e.reportType, list);
  }

  const suggestions: PromptImprovementSuggestion[] = [];
  const now = new Date().toISOString();

  for (const [reportType, list] of byType) {
    const expected =
      COVERAGE_EXPECTATIONS[reportType] ??
      COVERAGE_EXPECTATIONS[
        Object.keys(COVERAGE_EXPECTATIONS).find(
          (k) =>
            k.toLowerCase() === reportType.toLowerCase() ||
            reportType.toLowerCase().includes(k.toLowerCase())
        ) ?? ""
      ];

    if (!expected?.length || list.length < minMisses) continue;

    for (const field of expected) {
      let misses = 0;
      for (const entry of list) {
        const names = [
          ...entry.biomarkers.map((b) => b.nameEn),
          ...entry.findings.map((f) => f.titleEn),
          ...entry.measurements.map((m) => m.labelEn),
        ];
        if (!mentions(names, field)) misses += 1;
      }

      if (misses >= minMisses) {
        const promptId = list[0]?.promptId || reportType.toLowerCase();
        suggestions.push({
          id: `coverage-${reportType}-${field}`,
          promptId,
          reportType,
          severity: misses >= 8 ? "high" : "medium",
          title: `${promptId} prompt missed ${field} in ${misses} reports.`,
          detail: `Across ${list.length} stored ${reportType} scans, "${field}" was absent from biomarkers/findings/measurements ${misses} times. Consider strengthening the ${promptId} extraction rules. Recommendation only — do not auto-apply.`,
          evidenceCount: misses,
          recommendationOnly: true,
          createdAt: now,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Combine coverage + feedback flags into developer suggestions.
 */
export async function generatePromptImprovementSuggestions(
  options?: KnowledgeBaseOptions
): Promise<PromptImprovementSuggestion[]> {
  const [coverage, feedback] = await Promise.all([
    generateCoverageSuggestions(options),
    flagRepeatedCorrections(options),
  ]);

  const merged = [...coverage, ...feedback];
  // Prefer higher severity / evidence
  return merged.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 } as const;
    if (sev[a.severity] !== sev[b.severity]) {
      return sev[a.severity] - sev[b.severity];
    }
    return b.evidenceCount - a.evidenceCount;
  });
}

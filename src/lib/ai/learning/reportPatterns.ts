/**
 * Report structure / layout pattern extraction for learning.
 */

import { anonymizeLabBrand, fingerprintText, stripPii } from "./anonymize";
import type {
  AnonymizedBiomarker,
  AnonymizedFinding,
  AnonymizedMeasurement,
  ReportStructurePattern,
} from "./types";

export interface RawLearningReport {
  reportType?: string;
  typeEn?: string;
  typeBn?: string;
  type?: string;
  findings?: Array<{
    titleEn?: string;
    titleBn?: string;
    detailEn?: string;
    detailBn?: string;
    status?: string;
  }>;
  biomarkers?: Array<{
    name?: string;
    nameEn?: string;
    nameBn?: string;
    unit?: string;
    normalMin?: number;
    normalMax?: number;
    normalRange?: unknown;
    flag?: unknown;
    status?: unknown;
  }>;
  impression?: { bn?: string; en?: string } | string | null;
  conclusion?: { bn?: string; en?: string } | string | null;
  recommendation?: { bn?: string; en?: string } | string | null;
  labName?: string;
  hospitalName?: string;
  ocrWarnings?: string[];
}

function hasSection(
  section: { bn?: string; en?: string } | string | null | undefined
): boolean {
  if (section == null) return false;
  if (typeof section === "string") return section.trim().length > 0;
  return Boolean(section.bn?.trim() || section.en?.trim());
}

export function extractFindings(report: RawLearningReport): AnonymizedFinding[] {
  return (report.findings ?? []).map((f) => ({
    titleEn: stripPii(f.titleEn || f.titleBn || "Finding").slice(0, 120),
    titleBn: f.titleBn ? stripPii(f.titleBn).slice(0, 120) : undefined,
    status: f.status,
    detailFingerprint: fingerprintText(
      `${f.detailEn ?? ""} ${f.detailBn ?? ""}`,
      60
    ),
  }));
}

export function extractBiomarkers(report: RawLearningReport): AnonymizedBiomarker[] {
  return (report.biomarkers ?? []).map((b) => {
    const nameEn = stripPii(String(b.nameEn || b.name || b.nameBn || "Test")).slice(
      0,
      80
    );
    const hasRange =
      b.normalRange != null ||
      (typeof b.normalMin === "number" &&
        typeof b.normalMax === "number" &&
        !(b.normalMin === 0 && b.normalMax === 0));
    return {
      nameEn,
      nameBn: b.nameBn ? stripPii(String(b.nameBn)).slice(0, 80) : undefined,
      unit: b.unit ? stripPii(String(b.unit)).slice(0, 40) : undefined,
      hasReferenceRange: hasRange,
      flag: b.flag == null ? null : String(b.flag).slice(0, 16),
      status: b.status == null ? undefined : String(b.status),
    };
  });
}

export function extractMeasurements(
  report: RawLearningReport
): AnonymizedMeasurement[] {
  const fromBiomarkers: AnonymizedMeasurement[] = extractBiomarkers(report).map(
    (b) => ({
      labelEn: b.nameEn,
      unit: b.unit,
    })
  );

  const fromFindings: AnonymizedMeasurement[] = (report.findings ?? [])
    .filter((f) =>
      /\b(mm|cm|cc|ml|volume|thickness|diameter|size)\b/i.test(
        `${f.titleEn ?? ""} ${f.detailEn ?? ""}`
      )
    )
    .map((f) => ({
      labelEn: stripPii(f.titleEn || f.titleBn || "Measurement").slice(0, 80),
    }));

  // Dedupe by label
  const seen = new Set<string>();
  const out: AnonymizedMeasurement[] = [];
  for (const m of [...fromBiomarkers, ...fromFindings]) {
    const key = m.labelEn.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export function extractReportStructure(
  report: RawLearningReport
): ReportStructurePattern {
  const sections: string[] = [];
  if (report.typeEn || report.typeBn || report.type) sections.push("title");
  if (report.reportType || report.typeEn) sections.push("reportType");
  if ((report.findings ?? []).length) sections.push("findings");
  if (hasSection(report.impression)) sections.push("impression");
  if (hasSection(report.conclusion)) sections.push("conclusion");
  if (hasSection(report.recommendation)) sections.push("recommendation");
  if ((report.biomarkers ?? []).length) sections.push("biomarkers");

  const biomarkerCount = report.biomarkers?.length ?? 0;
  const findingCount = report.findings?.length ?? 0;
  let layoutKind: ReportStructurePattern["layoutKind"] = "unknown";
  if (biomarkerCount >= 5 && findingCount <= 3) layoutKind = "table_heavy";
  else if (biomarkerCount <= 1 && findingCount >= 4) layoutKind = "narrative";
  else if (biomarkerCount > 0 && findingCount > 0) layoutKind = "mixed";

  return {
    sections,
    layoutKind,
    labBrandToken: anonymizeLabBrand(report.labName || report.hospitalName),
    hasImpression: hasSection(report.impression),
    hasConclusion: hasSection(report.conclusion),
    hasRecommendation: hasSection(report.recommendation),
    biomarkerCount,
    findingCount,
  };
}

export function buildSearchTokens(input: {
  reportType: string;
  findings: AnonymizedFinding[];
  biomarkers: AnonymizedBiomarker[];
  structure: ReportStructurePattern;
}): string[] {
  const tokens = new Set<string>();
  tokens.add(input.reportType.toLowerCase());
  for (const s of input.structure.sections) tokens.add(`section:${s}`);
  tokens.add(`layout:${input.structure.layoutKind}`);
  if (input.structure.labBrandToken) {
    tokens.add(`lab:${input.structure.labBrandToken}`);
  }
  for (const f of input.findings.slice(0, 30)) {
    tokens.add(`finding:${f.titleEn.toLowerCase()}`);
  }
  for (const b of input.biomarkers.slice(0, 40)) {
    tokens.add(`bio:${b.nameEn.toLowerCase()}`);
  }
  return [...tokens];
}

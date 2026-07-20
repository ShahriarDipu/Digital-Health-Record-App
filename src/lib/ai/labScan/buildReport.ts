/**
 * Assemble a LabReport from Gemini JSON + TypeScript post-processors.
 * Never invents findings, diagnoses, or reference ranges.
 */

import { normalizeBiomarkers } from "@/lib/ai/biomarkers";
import { refineNextSteps } from "@/lib/ai/nextSteps";
import { refinePatientSummary } from "@/lib/ai/summary";
import { applyMedicalRules } from "@/lib/ai/rules";
import { detectReportType, type DetectedReportType } from "@/lib/reportTypeDetector";
import { isImagingSizeMeasurement, sanitizeLabBiomarker, sanitizeLabReport } from "@/lib/biomarkerNames";
import type { LabBiomarker, LabReport, LabReportFinding } from "@/store/useAppStore";
import {
  parseBilingualSection,
  parseFindings,
  parseImageQuality,
  parseStringArray,
  type ParsedLabGeminiJson,
} from "./schema";

function mapBiomarkersToLegacy(
  raw: Record<string, unknown>[]
): LabBiomarker[] {
  const { biomarkers } = normalizeBiomarkers(raw);

  return biomarkers.map((b) => {
    const nameBlob = `${b.nameEn} ${b.nameBn}`;
    const range =
      isImagingSizeMeasurement(nameBlob) ? null : b.normalRange;
    const hasReferenceRange = range != null;

    const status: LabBiomarker["status"] =
      b.status === "high" || b.status === "low" || b.status === "normal"
        ? b.status
        : "normal";

    return sanitizeLabBiomarker({
      name: b.nameBn || b.nameEn,
      nameBn: b.nameBn,
      nameEn: b.nameEn,
      value: b.value,
      unit: b.unit,
      hasReferenceRange,
      ...(hasReferenceRange
        ? { normalMin: range!.min, normalMax: range!.max }
        : {}),
      status,
      ...(b.flag ? { flag: String(b.flag) } : {}),
    });
  });
}

export function buildLabReportFromParsed(
  parsed: ParsedLabGeminiJson,
  options?: { usedRetry?: boolean }
): LabReport {
  void options;
  const findings: LabReportFinding[] = parseFindings(parsed.findings ?? []);
  const biomarkers = mapBiomarkersToLegacy(parsed.biomarkers ?? []);

  if (biomarkers.length === 0 && findings.length === 0) {
    throw new Error("No findings or biomarkers could be extracted from the report");
  }

  const typeBn = String(parsed.typeBn || parsed.type || "ল্যাব রিপোর্ট");
  const typeEn = String(parsed.typeEn || parsed.type || "Lab Report");
  const impression = parseBilingualSection(parsed.impression);
  const conclusion = parseBilingualSection(parsed.conclusion);
  const recommendation = parseBilingualSection(parsed.recommendation);
  let ocrWarnings = parseStringArray(parsed.ocrWarnings);
  const uncertainFindings = parseStringArray(parsed.uncertainFindings);

  const rawConfidence = Number(parsed.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(100, Math.round(rawConfidence)))
    : undefined;

  const imageQuality = parseImageQuality(parsed.imageQuality);

  const reportType: DetectedReportType = detectReportType({
    typeBn,
    typeEn,
    summaryBn: String(parsed.summaryBn || ""),
    summaryEn: String(parsed.summaryEn || ""),
    meaningBn: String(parsed.meaningBn || ""),
    meaningEn: String(parsed.meaningEn || ""),
    impression,
    conclusion,
    recommendation,
    findings,
    biomarkers,
  });

  const summaryRefined = refinePatientSummary({
    summaryBn: String(parsed.summaryBn || ""),
    summaryEn: String(parsed.summaryEn || ""),
    meaningBn: String(parsed.meaningBn || ""),
    meaningEn: String(parsed.meaningEn || ""),
    findings,
    ocrWarnings,
    imageQuality,
  });

  const nextRefined = refineNextSteps({
    nextStepsBn: Array.isArray(parsed.nextStepsBn)
      ? parsed.nextStepsBn.map(String)
      : [],
    nextStepsEn: Array.isArray(parsed.nextStepsEn)
      ? parsed.nextStepsEn.map(String)
      : [],
    findings,
    ocrWarnings,
    imageQuality,
    recommendationBn: recommendation.bn,
    recommendationEn: recommendation.en,
  });

  // Merge quality suggestions into ocrWarnings (non-destructive)
  if (imageQuality === "poor" || imageQuality === "fair") {
    const tip = "Image quality may limit OCR accuracy";
    if (!ocrWarnings.includes(tip)) ocrWarnings = [...ocrWarnings, tip];
  }

  let report: LabReport = {
    id: `lab-${Date.now()}`,
    type: typeBn,
    typeBn,
    typeEn,
    date: parsed.date,
    biomarkers,
    findings,
    summaryBn: summaryRefined.summaryBn,
    summaryEn: summaryRefined.summaryEn,
    meaningBn: summaryRefined.meaningBn,
    meaningEn: summaryRefined.meaningEn,
    nextStepsBn: nextRefined.nextStepsBn,
    nextStepsEn: nextRefined.nextStepsEn,
    analyzed: true,
    ...(confidence !== undefined ? { confidence } : {}),
    ...(imageQuality ? { imageQuality } : {}),
    reportType,
    impression,
    conclusion,
    recommendation,
    ocrWarnings,
    uncertainFindings,
  };

  // Deterministic medical safety rules (no AI)
  const ruled = applyMedicalRules(report);
  report = { ...report, ...ruled.report } as LabReport;

  // Preserve id/analyzed/biomarker numerics after rules
  report.id = `lab-${Date.now()}`;
  report.analyzed = true;
  report.biomarkers = biomarkers;
  report.reportType = reportType;

  return sanitizeLabReport(report);
}

/** Payload shape for validators (includes reportType). */
export function toValidationPayload(report: LabReport): Record<string, unknown> {
  return {
    reportType: report.reportType ?? "Other",
    typeBn: report.typeBn,
    typeEn: report.typeEn,
    date: report.date,
    summaryBn: report.summaryBn,
    summaryEn: report.summaryEn,
    meaningBn: report.meaningBn,
    meaningEn: report.meaningEn,
    nextStepsBn: report.nextStepsBn,
    nextStepsEn: report.nextStepsEn,
    findings: report.findings,
    biomarkers: (report.biomarkers ?? []).map((b) => ({
      nameBn: b.nameBn ?? b.name,
      nameEn: b.nameEn ?? b.name,
      value: b.value,
      unit: b.unit,
      hasReferenceRange: b.hasReferenceRange === true,
      normalMin: b.hasReferenceRange ? b.normalMin : null,
      normalMax: b.hasReferenceRange ? b.normalMax : null,
      flag: (b as LabBiomarker & { flag?: string }).flag,
      status: b.status,
    })),
    confidence: report.confidence,
    imageQuality: report.imageQuality,
    impression: report.impression,
    conclusion: report.conclusion,
    recommendation: report.recommendation,
    ocrWarnings: report.ocrWarnings,
    uncertainFindings: report.uncertainFindings,
  };
}

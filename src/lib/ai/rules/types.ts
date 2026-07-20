/**
 * Shared types & helpers for the Medical Rule Engine.
 * Pure TypeScript — no AI, no Gemini.
 */

export type FindingStatus = "normal" | "concern" | "info";

export interface RuleFinding {
  titleBn: string;
  titleEn: string;
  detailBn: string;
  detailEn: string;
  status: FindingStatus;
}

export interface RuleBiomarker {
  name: string;
  value: number;
  unit: string;
  hasReferenceRange?: boolean;
  normalMin?: number;
  normalMax?: number;
  status: "low" | "normal" | "high";
  nameBn?: string;
  nameEn?: string;
}

/** Extracted report shape the engine inspects (compatible with LabReport). */
export interface RuleEngineReport {
  id?: string;
  type?: string;
  typeBn?: string;
  typeEn?: string;
  date?: string;
  summaryBn?: string;
  summaryEn?: string;
  meaningBn?: string;
  meaningEn?: string;
  nextStepsBn?: string[];
  nextStepsEn?: string[];
  findings?: RuleFinding[];
  biomarkers?: RuleBiomarker[];
  reportType?: string;
  impression?: { bn: string; en: string };
  conclusion?: { bn: string; en: string };
  recommendation?: { bn: string; en: string };
  ocrWarnings?: string[];
  uncertainFindings?: string[];
  confidence?: number;
  imageQuality?: string;
  analyzed?: boolean;
  imageUrl?: string;
  /** Safety notes appended by rules (never invent findings). */
  safetyNotesBn?: string[];
  safetyNotesEn?: string[];
}

export interface RuleContext {
  report: RuleEngineReport;
  /** Normalized corpus of patient-facing text for pattern checks */
  corpus: string;
}

export interface MedicalRule {
  /** Stable unique id — adding rules must not reuse ids */
  id: string;
  /** Human label for logging/debug */
  label: string;
  /**
   * Optional filter: if provided, rule runs only when true.
   * Omit to run on every report (general rules).
   */
  matches?: (ctx: RuleContext) => boolean;
  /**
   * Apply deterministic corrections. Must not invent findings,
   * change numbers, or remove existing findings.
   */
  apply: (ctx: RuleContext) => void;
}

export function buildCorpus(report: RuleEngineReport): string {
  const parts: string[] = [
    report.typeBn ?? "",
    report.typeEn ?? "",
    report.type ?? "",
    report.reportType ?? "",
    report.summaryBn ?? "",
    report.summaryEn ?? "",
    report.meaningBn ?? "",
    report.meaningEn ?? "",
    report.impression?.bn ?? "",
    report.impression?.en ?? "",
    report.conclusion?.bn ?? "",
    report.conclusion?.en ?? "",
    report.recommendation?.bn ?? "",
    report.recommendation?.en ?? "",
  ];

  for (const f of report.findings ?? []) {
    parts.push(f.titleBn, f.titleEn, f.detailBn, f.detailEn);
  }

  for (const b of report.biomarkers ?? []) {
    parts.push(b.name, b.nameBn ?? "", b.nameEn ?? "");
  }

  return parts.join("\n").toLowerCase();
}

export function cloneReport<T extends RuleEngineReport>(report: T): T {
  return structuredClone(report);
}

/** Test if text matches any of the patterns (case-insensitive). */
export function textMatches(text: string, patterns: RegExp[]): boolean {
  const t = text.toLowerCase();
  return patterns.some((p) => p.test(t));
}

export function combineText(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/**
 * Soft-replace misleading phrases in bilingual text fields.
 * Never invents content — only rewrites matched wording.
 */
export function rewriteText(
  text: string | undefined,
  replacements: Array<{ pattern: RegExp; replacement: string }>
): string {
  if (!text) return text ?? "";
  let out = text;
  for (const { pattern, replacement } of replacements) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

export function appendSafetyNote(
  report: RuleEngineReport,
  bn: string,
  en: string
): void {
  if (!report.safetyNotesBn) report.safetyNotesBn = [];
  if (!report.safetyNotesEn) report.safetyNotesEn = [];
  if (bn && !report.safetyNotesBn.includes(bn)) report.safetyNotesBn.push(bn);
  if (en && !report.safetyNotesEn.includes(en)) report.safetyNotesEn.push(en);
}

export function appendMeaningNote(
  report: RuleEngineReport,
  bn: string,
  en: string
): void {
  if (bn && report.meaningBn && !report.meaningBn.includes(bn)) {
    report.meaningBn = `${report.meaningBn.trim()} ${bn}`.trim();
  } else if (bn && !report.meaningBn) {
    report.meaningBn = bn;
  }
  if (en && report.meaningEn && !report.meaningEn.includes(en)) {
    report.meaningEn = `${report.meaningEn.trim()} ${en}`.trim();
  } else if (en && !report.meaningEn) {
    report.meaningEn = en;
  }
}

/** Update finding status when text indicates a known pattern — never deletes findings. */
export function adjustFindings(
  report: RuleEngineReport,
  matcher: (finding: RuleFinding) => boolean,
  patch: Partial<Pick<RuleFinding, "status" | "detailBn" | "detailEn">>
): void {
  if (!report.findings) return;
  for (const finding of report.findings) {
    if (!matcher(finding)) continue;
    if (patch.status) finding.status = patch.status;
    if (patch.detailBn !== undefined) finding.detailBn = patch.detailBn;
    if (patch.detailEn !== undefined) finding.detailEn = patch.detailEn;
  }
}

export function findingText(f: RuleFinding): string {
  return combineText(f.titleBn, f.titleEn, f.detailBn, f.detailEn);
}

export function reportTypeIs(
  report: RuleEngineReport,
  ...types: string[]
): boolean {
  const candidates = [
    report.reportType,
    report.typeEn,
    report.typeBn,
    report.type,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  return types.some((t) => {
    const needle = t.toLowerCase();
    return candidates.some((c) => c === needle || c.includes(needle));
  });
}

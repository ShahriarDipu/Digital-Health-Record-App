/**
 * Patient summary helpers — pure TypeScript, no AI.
 * Softens panic language, enforces Bangla paragraph limit,
 * and ensures incomplete-image disclosures — without inventing findings.
 */

export type FindingStatus = "normal" | "concern" | "info";

export interface SummaryFinding {
  titleBn?: string;
  titleEn?: string;
  detailBn?: string;
  detailEn?: string;
  status?: FindingStatus;
}

export interface SummaryInput {
  summaryBn?: string;
  summaryEn?: string;
  meaningBn?: string;
  meaningEn?: string;
  findings?: SummaryFinding[];
  ocrWarnings?: string[];
  imageQuality?: string;
  /** Explicit signal that upload looks cropped/partial */
  isPartialImage?: boolean;
}

export interface RefinedPatientSummary {
  summaryBn: string;
  summaryEn: string;
  meaningBn: string;
  meaningEn: string;
  /** Finding titles ordered for summary priority (does not invent content) */
  prioritizedFindingTitles: Array<{ titleBn: string; titleEn: string; priority: SummaryPriority }>;
  warnings: string[];
}

export type SummaryPriority =
  | "critical"
  | "abnormal"
  | "important_normal"
  | "normal";

const PANIC_EN: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(fatal|deadly|life[\-\s]?threatening|terminal|hopeless)\b/gi, replacement: "important to discuss with a doctor" },
  { pattern: /\b(panic|terrifying|catastrophic|dire)\b/gi, replacement: "concerning" },
  { pattern: /\byou\s+definitely\s+have\b/gi, replacement: "the report shows" },
  { pattern: /\bthis\s+confirms\s+you\s+have\b/gi, replacement: "the report describes" },
];

const PANIC_BN: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(মারাত্মক|প্রাণঘাতী|আশাহীন|ভয়াবহ)/g, replacement: "গুরুত্বপূর্ণ" },
  { pattern: /(আতঙ্ক|ভয়ংকর)/g, replacement: "সতর্কতার সাথে দেখার মতো" },
  { pattern: /আপনার\s+নিশ্চিতভাবে\s+/g, replacement: "আপনার ফল দেখে মনে হতে পারে " },
  // Soften common robotic AI openers without changing clinical facts
  { pattern: /রিপোর্টে\s+দেখা\s+যাচ্ছে[,:]?\s*/g, replacement: "" },
  { pattern: /এই\s+পরীক্ষাটি\s+নির্দেশ\s+করে[,:]?\s*/g, replacement: "" },
  { pattern: /এটি\s+একটি\s+রিপোর্ট[।.]?\s*/g, replacement: "" },
];

const ROBOTIC_EN: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bThis\s+test\s+indicates\s+that\s+/gi, replacement: "" },
  { pattern: /\bThe\s+report\s+shows\s+that\s+/gi, replacement: "" },
  { pattern: /\bThis\s+finding\s+suggests\s+that\s+/gi, replacement: "" },
];

const CRITICAL_PATTERNS = [
  /critical/i,
  /immediate/i,
  /urgent/i,
  /previa/i,
  /emergency/i,
  /life[\-\s]?threat/i,
  /জরুরি/,
  /সতর্ক/,
];

const IMPORTANT_NORMAL_PATTERNS = [
  /impression/i,
  /conclusion/i,
  /cardiac\s+activity/i,
  /fetal\s+heart/i,
  /placenta/i,
  /uterus/i,
  /liver/i,
  /kidney/i,
  /hemoglobin|\bhb\b/i,
  /স্বাভাবিক/,
];

const PARTIAL_EN =
  "This explanation is based only on the visible portion of the uploaded report.";

const PARTIAL_BN =
  "এই ব্যাখ্যা কেবল আপলোড করা ছবির দৃশ্যমান অংশের ওপর ভিত্তি করে তৈরি।";

function applyReplacements(text: string, rules: Array<{ pattern: RegExp; replacement: string }>): string {
  let out = text;
  for (const { pattern, replacement } of rules) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function capitalizeSentenceStart(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Enforce max 3 short Bangla paragraphs (merge extras into the third). */
export function limitBanglaParagraphs(text: string, max = 3): string {
  const cleaned = text.trim();
  if (!cleaned) return "";
  const parts = splitParagraphs(cleaned);
  if (parts.length <= max) {
    // Also split very long single blocks by sentence if > 3 logical chunks needed? keep simple.
    return parts.join("\n\n");
  }
  const head = parts.slice(0, max - 1);
  const tail = parts.slice(max - 1).join(" ");
  return [...head, tail].join("\n\n");
}

function looksPartial(input: SummaryInput): boolean {
  if (input.isPartialImage) return true;
  if (input.imageQuality === "poor" || input.imageQuality === "unreadable") {
    const warnings = (input.ocrWarnings ?? []).join(" ").toLowerCase();
    if (/crop|partial|incomplete|missing edge|cut\s*off/.test(warnings)) return true;
  }
  const warnings = (input.ocrWarnings ?? []).join(" ").toLowerCase();
  return /crop|partial|incomplete|missing edge|cut\s*off|visible portion/.test(warnings);
}

function ensurePartialDisclosure(text: string, language: "bn" | "en", needed: boolean): string {
  if (!needed) return text;
  const needle = language === "bn" ? PARTIAL_BN : PARTIAL_EN;
  if (text.includes(needle)) return text;
  const partialHint =
    language === "bn"
      ? /দৃশ্যমান অংশ|আপলোড করা ছবির/
      : /visible portion|uploaded portion|incomplete|cropped/i;
  if (partialHint.test(text)) return text;
  return `${text.trim()}\n\n${needle}`.trim();
}

export function classifyFindingPriority(finding: SummaryFinding): SummaryPriority {
  const blob = `${finding.titleEn ?? ""} ${finding.titleBn ?? ""} ${finding.detailEn ?? ""} ${finding.detailBn ?? ""}`;
  const status = finding.status ?? "info";

  if (CRITICAL_PATTERNS.some((p) => p.test(blob))) return "critical";
  if (status === "concern") return "abnormal";
  if (status === "normal" && IMPORTANT_NORMAL_PATTERNS.some((p) => p.test(blob))) {
    return "important_normal";
  }
  if (status === "normal") return "normal";
  // info without critical wording ranks after abnormals but before leftover normals
  if (status === "info") return "important_normal";
  return "normal";
}

const PRIORITY_RANK: Record<SummaryPriority, number> = {
  critical: 0,
  abnormal: 1,
  important_normal: 2,
  normal: 3,
};

/**
 * Order existing findings for summary emphasis — never adds findings.
 */
export function prioritizeFindings(findings: SummaryFinding[]): Array<{
  finding: SummaryFinding;
  priority: SummaryPriority;
}> {
  return findings
    .map((finding) => ({
      finding,
      priority: classifyFindingPriority(finding),
    }))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/**
 * Refine patient summaries without inventing clinical content.
 */
export function refinePatientSummary(input: SummaryInput): RefinedPatientSummary {
  const warnings: string[] = [];
  const partial = looksPartial(input);

  let summaryBn = applyReplacements(input.summaryBn ?? "", PANIC_BN);
  let summaryEn = applyReplacements(
    applyReplacements(input.summaryEn ?? "", PANIC_EN),
    ROBOTIC_EN
  );
  let meaningBn = applyReplacements(input.meaningBn ?? "", PANIC_BN);
  let meaningEn = applyReplacements(
    applyReplacements(input.meaningEn ?? "", PANIC_EN),
    ROBOTIC_EN
  );

  // Capitalize English openers if we stripped a robotic prefix
  summaryEn = capitalizeSentenceStart(summaryEn);
  meaningEn = capitalizeSentenceStart(meaningEn);

  summaryBn = limitBanglaParagraphs(summaryBn, 3);
  summaryBn = ensurePartialDisclosure(summaryBn, "bn", partial);
  summaryEn = ensurePartialDisclosure(summaryEn, "en", partial);
  meaningBn = ensurePartialDisclosure(meaningBn, "bn", partial);
  meaningEn = ensurePartialDisclosure(meaningEn, "en", partial);

  if (!summaryBn.trim()) warnings.push("summaryBn is empty");
  if (!summaryEn.trim()) warnings.push("summaryEn is empty");

  const prioritized = prioritizeFindings(input.findings ?? []);
  const prioritizedFindingTitles = prioritized.map(({ finding, priority }) => ({
    titleBn: finding.titleBn ?? "",
    titleEn: finding.titleEn ?? "",
    priority,
  }));

  return {
    summaryBn: summaryBn.trim(),
    summaryEn: summaryEn.trim(),
    meaningBn: meaningBn.trim(),
    meaningEn: meaningEn.trim(),
    prioritizedFindingTitles,
    warnings,
  };
}

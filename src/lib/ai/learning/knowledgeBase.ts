/**
 * Local file-based knowledge base for continuous learning.
 * Fast JSON store — designed to stay well under 5s for typical sizes.
 */

import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  buildSearchTokens,
  extractBiomarkers,
  extractFindings,
  extractMeasurements,
  extractReportStructure,
  type RawLearningReport,
} from "./reportPatterns";
import type {
  KnowledgeEntry,
  PromptReferenceContext,
  SimilarExample,
  StoredValidationSnapshot,
  UserFeedbackRecord,
} from "./types";

const DEFAULT_DIR = path.join(process.cwd(), "data", "learning");
const ENTRIES_FILE = "knowledge-entries.jsonl";
const MAX_ENTRIES_IN_MEMORY = 5000;

export interface KnowledgeBaseOptions {
  /** Override storage directory */
  dataDir?: string;
}

export interface RecordSuccessfulScanInput {
  report: RawLearningReport;
  reportType?: string;
  promptId?: string;
  /** Full prompt text — only a hash is stored */
  promptText?: string;
  validation?: {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  };
  usedRetry?: boolean;
  feedback?: UserFeedbackRecord;
}

function hashPrompt(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function resolveDir(options?: KnowledgeBaseOptions): string {
  return options?.dataDir ?? process.env.LEARNING_DATA_DIR ?? DEFAULT_DIR;
}

function entriesPath(dir: string): string {
  return path.join(dir, ENTRIES_FILE);
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function readAllEntries(dir: string): Promise<KnowledgeEntry[]> {
  const file = entriesPath(dir);
  try {
    const raw = await fs.readFile(file, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    const entries: KnowledgeEntry[] = [];
    // Read from end for recency bias when capping
    for (let i = Math.max(0, lines.length - MAX_ENTRIES_IN_MEMORY); i < lines.length; i++) {
      try {
        entries.push(JSON.parse(lines[i]) as KnowledgeEntry);
      } catch {
        // skip bad line
      }
    }
    return entries;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function appendEntry(dir: string, entry: KnowledgeEntry): Promise<void> {
  await ensureDir(dir);
  const line = JSON.stringify(entry) + "\n";
  await fs.appendFile(entriesPath(dir), line, "utf8");
}

function toValidationSnapshot(
  validation?: RecordSuccessfulScanInput["validation"]
): StoredValidationSnapshot {
  const errors = validation?.errors ?? [];
  return {
    valid: validation?.valid !== false,
    errorCount: errors.length,
    warningCount: validation?.warnings?.length ?? 0,
    errorCodes: errors.map((e) => e.slice(0, 120)),
  };
}

/**
 * After a successful scan — store anonymized learning record.
 */
export async function recordSuccessfulScan(
  input: RecordSuccessfulScanInput,
  options?: KnowledgeBaseOptions
): Promise<KnowledgeEntry> {
  const dir = resolveDir(options);
  const reportType =
    input.reportType ||
    input.report.reportType ||
    input.report.typeEn ||
    input.report.typeBn ||
    input.report.type ||
    "Other";

  const findings = extractFindings(input.report);
  const biomarkers = extractBiomarkers(input.report);
  const measurements = extractMeasurements(input.report);
  const structure = extractReportStructure(input.report);

  const entry: KnowledgeEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    reportType: String(reportType),
    promptId: input.promptId,
    promptHash: input.promptText ? hashPrompt(input.promptText) : undefined,
    findings,
    biomarkers,
    measurements,
    structure,
    validation: toValidationSnapshot(input.validation),
    usedRetry: input.usedRetry,
    feedback: input.feedback
      ? {
          ...input.feedback,
          note: input.feedback.note
            ? input.feedback.note.slice(0, 240)
            : undefined,
          createdAt: input.feedback.createdAt || new Date().toISOString(),
        }
      : undefined,
    tokens: buildSearchTokens({
      reportType: String(reportType),
      findings,
      biomarkers,
      structure,
    }),
  };

  await appendEntry(dir, entry);
  return entry;
}

/**
 * Attach user feedback to the most recent matching entry (by id or reportType).
 */
export async function attachFeedback(
  input: {
    entryId?: string;
    reportType?: string;
    feedback: UserFeedbackRecord;
  },
  options?: KnowledgeBaseOptions
): Promise<KnowledgeEntry | null> {
  const dir = resolveDir(options);
  const entries = await readAllEntries(dir);
  let target: KnowledgeEntry | undefined;

  if (input.entryId) {
    target = entries.find((e) => e.id === input.entryId);
  } else if (input.reportType) {
    target = [...entries]
      .reverse()
      .find((e) => e.reportType === input.reportType);
  }

  if (!target) return null;

  target.feedback = {
    ...input.feedback,
    note: input.feedback.note?.slice(0, 240),
    createdAt: input.feedback.createdAt || new Date().toISOString(),
  };

  // Rewrite file (bounded size) — OK for local learning store
  await ensureDir(dir);
  const body = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  await fs.writeFile(entriesPath(dir), body, "utf8");
  return target;
}

export async function listKnowledgeEntries(
  options?: KnowledgeBaseOptions
): Promise<KnowledgeEntry[]> {
  return readAllEntries(resolveDir(options));
}

function scoreSimilarity(
  queryType: string,
  queryTokens: Set<string>,
  entry: KnowledgeEntry
): number {
  let score = 0;
  if (entry.reportType.toLowerCase() === queryType.toLowerCase()) score += 10;
  else if (
    entry.reportType.toLowerCase().includes(queryType.toLowerCase()) ||
    queryType.toLowerCase().includes(entry.reportType.toLowerCase())
  ) {
    score += 4;
  }
  for (const t of entry.tokens) {
    if (queryTokens.has(t)) score += 1;
  }
  return score;
}

/**
 * Retrieve similar report-type examples for internal prompt reference.
 */
export async function retrieveSimilarExamples(
  reportType: string,
  options?: KnowledgeBaseOptions & { limit?: number }
): Promise<SimilarExample[]> {
  const limit = options?.limit ?? 3;
  const entries = await listKnowledgeEntries(options);
  const queryTokens = new Set(
    buildSearchTokens({
      reportType,
      findings: [],
      biomarkers: [],
      structure: {
        sections: [],
        layoutKind: "unknown",
        hasImpression: false,
        hasConclusion: false,
        hasRecommendation: false,
        biomarkerCount: 0,
        findingCount: 0,
      },
    })
  );

  const ranked = entries
    .map((e) => ({
      entry: e,
      score: scoreSimilarity(reportType, queryTokens, e),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ entry, score }) => ({
    entryId: entry.id,
    reportType: entry.reportType,
    structure: entry.structure,
    sampleBiomarkerNames: entry.biomarkers.map((b) => b.nameEn).slice(0, 12),
    sampleFindingTitles: entry.findings.map((f) => f.titleEn).slice(0, 12),
    promptId: entry.promptId,
    score,
  }));
}

/**
 * Build an internal reference block for prompt construction (no PII).
 * Does NOT modify stored prompts — caller may append this to a prompt.
 */
export async function buildPromptReferenceContext(
  reportType: string,
  options?: KnowledgeBaseOptions & { limit?: number }
): Promise<PromptReferenceContext> {
  const examples = await retrieveSimilarExamples(reportType, options);

  if (examples.length === 0) {
    return {
      reportType,
      examples: [],
      referenceBlock: "",
    };
  }

  const lines: string[] = [
    "INTERNAL REFERENCE (anonymized past similar reports — do not invent from these):",
    `Target report type: ${reportType}`,
  ];

  examples.forEach((ex, i) => {
    lines.push(
      `Example ${i + 1}: type=${ex.reportType}; layout=${ex.structure.layoutKind}; sections=${ex.structure.sections.join(",") || "n/a"};` +
        ` biomarkers=[${ex.sampleBiomarkerNames.join(", ")}]; findings=[${ex.sampleFindingTitles.join(", ")}]`
    );
  });

  lines.push(
    "Use these only as layout/coverage reminders. Extract ONLY what is visible on the current image."
  );

  return {
    reportType,
    examples,
    referenceBlock: lines.join("\n"),
  };
}

export function getKnowledgeBasePaths(options?: KnowledgeBaseOptions) {
  const dir = resolveDir(options);
  return { dataDir: dir, entriesFile: entriesPath(dir) };
}

/**
 * Analyze user feedback and repeated corrections for prompt-improvement flags.
 * Never auto-edits prompts.
 */

import { listKnowledgeEntries, type KnowledgeBaseOptions } from "./knowledgeBase";
import type { PromptImprovementSuggestion } from "./types";

export interface CorrectionFrequency {
  tag: string;
  reportType: string;
  promptId: string;
  count: number;
}

const DEFAULT_FLAG_THRESHOLD = 3;

/**
 * Aggregate correction tags from negative / tagged feedback.
 */
export async function analyzeFeedbackCorrections(
  options?: KnowledgeBaseOptions & { minCount?: number }
): Promise<CorrectionFrequency[]> {
  const minCount = options?.minCount ?? DEFAULT_FLAG_THRESHOLD;
  const entries = await listKnowledgeEntries(options);
  const counts = new Map<string, CorrectionFrequency>();

  for (const entry of entries) {
    const tags = [...(entry.feedback?.correctionTags ?? [])];
    if (!tags.length && entry.feedback?.rating === "negative") {
      tags.push("unspecified_negative_feedback");
    }
    for (const tag of tags) {
      const key = `${entry.reportType}::${entry.promptId ?? "unknown"}::${tag}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          tag,
          reportType: entry.reportType,
          promptId: entry.promptId ?? "unknown",
          count: 1,
        });
      }
    }
  }

  return [...counts.values()]
    .filter((c) => c.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

/**
 * Flag repeated user corrections for developer review (recommendation only).
 */
export async function flagRepeatedCorrections(
  options?: KnowledgeBaseOptions & { minCount?: number }
): Promise<PromptImprovementSuggestion[]> {
  const freqs = await analyzeFeedbackCorrections(options);
  const now = new Date().toISOString();

  return freqs.map((f) => ({
    id: `feedback-${f.promptId}-${f.tag}-${f.reportType}`,
    promptId: f.promptId,
    reportType: f.reportType,
    severity: f.count >= 8 ? "high" : f.count >= 5 ? "medium" : "low",
    title: `${f.promptId} repeatedly corrected: ${f.tag}`,
    detail: `Users flagged "${f.tag}" on ${f.reportType} reports ${f.count} times. Review the ${f.promptId} prompt — do not auto-change.`,
    evidenceCount: f.count,
    recommendationOnly: true,
    createdAt: now,
  }));
}

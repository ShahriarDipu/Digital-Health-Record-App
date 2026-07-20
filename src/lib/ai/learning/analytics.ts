/**
 * Learning analytics — extraction accuracy proxies, retries, feedback, report types.
 */

import { listKnowledgeEntries, type KnowledgeBaseOptions } from "./knowledgeBase";
import type { LearningAnalytics } from "./types";

/**
 * Compute aggregate learning metrics from the local knowledge base.
 */
export async function computeLearningAnalytics(
  options?: KnowledgeBaseOptions
): Promise<LearningAnalytics> {
  const entries = await listKnowledgeEntries(options);
  const totalScans = entries.length;

  let validationFailures = 0;
  let retryCount = 0;
  let feedbackPositive = 0;
  let feedbackNegative = 0;
  let feedbackNeutral = 0;
  const reportTypeCounts: Record<string, number> = {};
  const errorCounts = new Map<string, number>();

  for (const e of entries) {
    reportTypeCounts[e.reportType] = (reportTypeCounts[e.reportType] ?? 0) + 1;
    if (!e.validation.valid) validationFailures += 1;
    if (e.usedRetry) retryCount += 1;

    if (e.feedback?.rating === "positive") feedbackPositive += 1;
    else if (e.feedback?.rating === "negative") feedbackNegative += 1;
    else if (e.feedback?.rating === "neutral") feedbackNeutral += 1;

    for (const code of e.validation.errorCodes) {
      const key = code.slice(0, 80);
      errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
    }
  }

  const successfulScans = entries.filter((e) => e.validation.valid).length;
  const rated = feedbackPositive + feedbackNegative + feedbackNeutral;
  const positiveRate = rated > 0 ? feedbackPositive / rated : 1;
  const validRate = totalScans > 0 ? successfulScans / totalScans : 1;

  // Proxy accuracy: blend validation success with positive feedback when available
  const extractionAccuracyEstimate = Number(
    (0.7 * validRate + 0.3 * positiveRate).toFixed(4)
  );

  const topErrorCodes = [...errorCounts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    totalScans,
    successfulScans,
    validationFailures,
    retryCount,
    retryRate: totalScans > 0 ? Number((retryCount / totalScans).toFixed(4)) : 0,
    feedbackPositive,
    feedbackNegative,
    feedbackNeutral,
    reportTypeCounts,
    extractionAccuracyEstimate,
    topErrorCodes,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Most common report types (sorted desc).
 */
export async function getMostCommonReportTypes(
  options?: KnowledgeBaseOptions & { limit?: number }
): Promise<Array<{ reportType: string; count: number }>> {
  const analytics = await computeLearningAnalytics(options);
  const limit = options?.limit ?? 10;
  return Object.entries(analytics.reportTypeCounts)
    .map(([reportType, count]) => ({ reportType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

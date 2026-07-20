/**
 * Stronger Gemini instruction used only on the single automatic retry.
 */

export const RETRY_EXTRACTION_INSTRUCTION = `The previous extraction was incomplete.
Read the ENTIRE report again.
Do not skip any section.
Extract every visible measurement.
Extract Impression, Conclusion, Comments and Recommendations.
Return valid JSON only.

Additional retry requirements (mandatory):
- Cover every organ, test row, table, and printed note that is visible.
- Do not invent findings, values, units, diagnoses, or reference ranges.
- If text is unclear, write exactly: Not clearly visible
- findings must be a non-empty array of real report sections.
- summaryBn/summaryEn and meaningBn/meaningEn must be complete, human (calm doctor tone), and based only on the report.
- Avoid robotic phrases (“রিপোর্টে দেখা যাচ্ছে”, “This test indicates”). Combine related abnormal markers in one finding explanation when appropriate.
- nextStepsBn/nextStepsEn must be present (practical, non-invented advice; put “see a doctor” here, not in every finding).
- Include confidence (0–100) and imageQuality.
- Preserve numbers, units, and medical terms exactly as printed.
- Extract EVERY measurable biomarker/measurement in report order; never skip table rows.
- If a value has no printed reference range: hasReferenceRange=false and normalRange=null — never invent limits.
- Flag H/High/↑ → high; L/Low/↓ → low; otherwise calculate status only when BOTH limits exist.
- If the image is cropped/partial, explain only the visible portion and state that limitation.
- Return valid JSON matching the schema only — no markdown, no extra commentary.`;

/**
 * Append the retry instruction to a base prompt without mutating the original.
 */
export function buildRetryPrompt(basePrompt: string): string {
  return `${basePrompt.trim()}

════════════════════════════════════════
AUTOMATIC RETRY — STRONGER EXTRACTION
════════════════════════════════════════
${RETRY_EXTRACTION_INSTRUCTION}`.trim();
}

export interface RetryPromptPayload {
  /** Full text prompt to send on retry */
  prompt: string;
  /** Standalone stronger instruction (for callers that inject separately) */
  instruction: string;
}

export function getRetryPromptPayload(basePrompt: string): RetryPromptPayload {
  return {
    prompt: buildRetryPrompt(basePrompt),
    instruction: RETRY_EXTRACTION_INSTRUCTION,
  };
}

/**
 * OCR extraction quality rules for Gemini vision (no external OCR service).
 *
 * Composed into BASE_MEDICAL_PROMPT so every specialized prompt inherits
 * exact-text, full-image, and no-hallucination OCR behavior.
 * One Gemini call only — these are prompt instructions, not extra API calls.
 */

export const OCR_EXTRACTION_RULES = `
════════════════════════════════════════
OCR EXTRACTION QUALITY (CRITICAL — DO THIS FIRST)
════════════════════════════════════════
Keep processing focused and complete. Internally read the ENTIRE uploaded image
from top to bottom and left to right BEFORE writing any explanation or summary.
Never summarize before the complete uploaded image has been read.

Exact-text extraction (if present — do NOT assume every report has every section):
- Report title / header
- Patient information
- Report date
- Clinical history
- Examination details / technique / region scanned
- Every table and every table row that is visible
- Every measurement (preserve numbers and units EXACTLY as printed)
- Findings / observations
- Impression
- Conclusion
- Recommendation / Advice / Comments
- Footer / lab stamps / signatures (if readable)
- Doctor notes / handwritten notes (only if clearly readable)

Format flexibility:
- Bangladesh labs use many layouts. Extract only sections that actually appear.
- Do NOT invent missing sections to "complete" a template.

Cropped / partial uploads:
- If the image looks cropped, cut off, or incomplete:
  → Explain ONLY the visible information.
  → Do NOT invent missing sections.
  → Do NOT infer missing pages or unseen columns.
  → In meaningBn/meaningEn and/or ocrWarnings, clearly state that the explanation
    is based ONLY on the uploaded portion of the report.

Never skip:
- Any visible measurement
- Any visible table
- Any visible observation
- Impression / Conclusion / Recommendation when visible

Preservation rules:
- Preserve ALL numbers exactly (no rounding, no unit conversion, no estimation).
- Preserve ALL units exactly as written (mg/dL vs mmol/L, mm vs cm, etc.).
- Preserve medical terminology exactly as written on the report.
- For patient-facing Bangla explanations, you may simplify meaning, but biomarker
  nameEn/value/unit and quoted findings must stay faithful to the printed text.

Unreadable text:
- Never guess blurry, cut-off, or ambiguous characters.
- Mark unreadable items exactly as: Not clearly visible
- Add brief notes to ocrWarnings / uncertainFindings when relevant.

Visibility rule:
- Extract ONLY information that is actually visible in the uploaded image.
- If it is not on the image, it must not appear in the JSON.

Output:
- Return structured JSON only (match the schema).
- No markdown fences, no preamble, no postscript.
`.trim();

/**
 * Compact OCR reminder suitable for retry / injection without duplicating the full base.
 */
export const OCR_EXTRACTION_REMINDER = `
OCR reminder: Read the entire uploaded image top-to-bottom before explaining.
Extract every visible measurement/table/Impression/Conclusion exactly.
Preserve numbers, units, and medical terms. Never guess — use "Not clearly visible".
If the image is cropped, explain only the visible portion and state that limitation.
Return valid JSON only.
`.trim();

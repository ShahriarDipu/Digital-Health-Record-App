/**
 * Biomarker extraction accuracy rules for Gemini vision.
 * Composed into BASE_MEDICAL_PROMPT — no extra API calls.
 * Does not change scanner flow or API call count.
 */

export const BIOMARKER_EXTRACTION_RULES = `
════════════════════════════════════════
BIOMARKER EXTRACTION ACCURACY (CRITICAL)
════════════════════════════════════════
Extract EVERY measurable value visible on the report.
Never skip any biomarker or measurement that has a clear numeric value.

Applies to ALL report kinds when numbers exist:
- Blood reports (CBC, lipid, LFT, KFT, sugar, thyroid, etc.)
- Urine reports (including microscopy counts when numeric)
- Hormone reports
- Ultrasound measurements (ET, ovary volume, fibroid size, CRL, BPD, AFI, organ dimensions, etc.)
- CT / MRI measurements (lesion size, etc.)
- X-ray measurements (if present)

────────────────────────────────────────
FOR EACH MEASURABLE VALUE — EXTRACT EXACTLY
────────────────────────────────────────
1. nameBn / nameEn — biomarker or measurement name as printed (patient-friendly Bangla + English)
2. value — EXACT number as printed (same digits, same decimal places; never round, never convert)
3. unit — EXACT unit as printed (never convert mg/dL ↔ mmol/L, mm ↔ cm, g/dL ↔ g/L, etc.)
4. reference range — EXACTLY as written on the report when present
5. flag — only if the report prints H / High / ↑ / L / Low / ↓ / Normal / N

NEVER modify:
- numbers
- decimal places
- units
- printed reference-range text or limits

────────────────────────────────────────
REFERENCE RANGE (NO INVENTION)
────────────────────────────────────────
If the report PROVIDES a usable numeric reference range:
  → hasReferenceRange = true
  → set normalMin and normalMax exactly from the printed limits
  → also set normalRange = { min, max } (same limits; optional text = exact printed range string)

If the report does NOT provide a reference range:
  → hasReferenceRange = false
  → normalRange = null (in conceptual output; in JSON omit normalRange / normalMin / normalMax)
  → DO NOT invent normalMin or normalMax
  → DO NOT use textbook, WHO, lab-memory, or “typical” ranges
  → DO NOT use 0/0 as a fake range
  → UI must NOT show a comparison chart for that value

Examples that usually have NO printed reference → normalRange = null:
- Fibroid / gallstone / kidney-stone / polyp size
- Organ dimensions (uterus L×AP×T, ovary size)
- Placenta position (text; if a size is numeric without range → null)
- Cervix length unless the report prints a reference
- Any ultrasound/CT/MRI size without a printed normal column

────────────────────────────────────────
STATUS / FLAG RULES
────────────────────────────────────────
If the report explicitly marks:
  H / High / ↑  → status = "high" (and capture flag)
  L / Low / ↓   → status = "low" (and capture flag)
  Normal / N (explicit printed) → status = "normal" (and capture flag)

Otherwise:
  → calculate status ONLY if BOTH reference limits exist (hasReferenceRange=true)
  → NEVER calculate High/Low/Normal without a printed reference range
  → NEVER invent status from medical knowledge

────────────────────────────────────────
INTEGRITY
────────────────────────────────────────
- Never create biomarkers that do not exist on the report.
- Preserve biomarker order EXACTLY as shown (top→bottom, then left→right in tables).
- Extract every table row with a numeric result — do not summarize away individual lines.
- If a value is unreadable → write Not clearly visible / omit that row rather than guessing.
- Empty biomarkers array ONLY when the report truly has no measurable numbers.
- Return clean structured JSON matching the schema.
`.trim();

/** Compact reminder for retry / injection */
export const BIOMARKER_EXTRACTION_REMINDER = `
Biomarker reminder: Extract EVERY visible measurable value in exact report order.
Preserve name, value, decimals, unit, flag, and reference range exactly — never modify numbers/units.
If no reference range is printed: hasReferenceRange=false AND normalRange=null (never invent limits).
Flag H/High/↑ → high; L/Low/↓ → low; else calculate status ONLY when BOTH limits exist.
Never invent biomarkers. Never skip table rows.
`.trim();

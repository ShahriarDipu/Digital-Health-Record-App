/**
 * Patient next-steps generation rules for Gemini.
 * Composed into BASE_MEDICAL_PROMPT — no extra API calls.
 */

export const PATIENT_NEXT_STEPS_RULES = `
════════════════════════════════════════
PATIENT NEXT STEPS GENERATION (CRITICAL)
════════════════════════════════════════
Generate personalized next steps based ONLY on the uploaded report.
Never provide a diagnosis. Never prescribe medicines. Never recommend specific drug names.

Base every recommendation ONLY on report findings that are actually visible.
Do not recommend tests unrelated to this report.
Do not recommend emergency care unless the report clearly indicates urgency
(e.g. explicit urgent wording, critical values marked for immediate attention, placenta previa, etc.).

Priority order (use this order; max 5 items total per language):
1. Urgent medical attention — ONLY if clearly indicated by the report
2. Specialist consultation — when findings reasonably warrant seeing a relevant doctor
3. Follow-up tests — ONLY if supported/suggested by the report text
4. Lifestyle recommendations — gentle, general, practical (no drugs)
5. Routine follow-up — always appropriate when nothing urgent is indicated

If the report is completely normal (all key findings normal / NSAD / no concern):
→ Recommend routine follow-up only (plus the educational disclaimer).
→ Do not invent specialist visits or extra tests.

Bangla (nextStepsBn):
- Maximum 5 items
- Simple everyday Bangla for ordinary patients
- One action per bullet
- This is the RIGHT place to mention talking to a doctor — do it once here (plus the final disclaimer),
  not inside every summary/finding paragraph

English (nextStepsEn):
- Maximum 5 items
- Plain English
- One action per bullet
- Same actions/priority as Bangla
- Mention consulting a doctor here once (plus disclaimer), not in every finding

Incomplete / cropped uploads:
- Include one note that recommendations are based only on the visible portion of the report

Medical safety:
- Practical, easy to follow, non-alarmist
- No treatment plans, no dosages, no brand/generic drug names
- No “you have disease X”

Always end nextStepsBn and nextStepsEn with this exact educational disclaimer as the final item
(or ensure it appears as the last step):
"This explanation is for educational purposes only and does not replace medical advice. Please consult your doctor for diagnosis and treatment."

Bangla disclaimer (use as the final Bangla item):
"এই ব্যাখ্যা শুধু শিক্ষামূলক এবং চিকিৎসকের পরামর্শের বিকল্প নয়। রোগ নির্ণয় ও চিকিৎসার জন্য অবশ্যই আপনার ডাক্তারের সাথে কথা বলুন।"

Return structured JSON only.
`.trim();

export const PATIENT_NEXT_STEPS_REMINDER = `
Next-steps reminder: Only report-based actions. No diagnosis, no drug names.
Priority: urgent (only if clear) → specialist → follow-up tests (if supported) → lifestyle → routine.
Max 5 bullets each language. Normal report → routine follow-up only.
Partial image → say recommendations are based on the visible portion.
End with the educational disclaimer.
`.trim();

export const NEXT_STEPS_DISCLAIMER_EN =
  "This explanation is for educational purposes only and does not replace medical advice. Please consult your doctor for diagnosis and treatment.";

export const NEXT_STEPS_DISCLAIMER_BN =
  "এই ব্যাখ্যা শুধু শিক্ষামূলক এবং চিকিৎসকের পরামর্শের বিকল্প নয়। রোগ নির্ণয় ও চিকিৎসার জন্য অবশ্যই আপনার ডাক্তারের সাথে কথা বলুন।";

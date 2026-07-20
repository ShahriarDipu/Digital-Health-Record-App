import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const THYROID_PROFILE_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Thyroid Profile
════════════════════════════════════════
This is a thyroid function / thyroid profile report common in Bangladesh labs.

Focus on printed values such as:
- TSH
- Free T4 (FT4) / Total T4
- Free T3 (FT3) / Total T3
- Other printed thyroid antibodies (Anti-TPO, etc.) ONLY if present

Thyroid-specific rules:
- Extract each clearly printed thyroid hormone as a biomarker.
- Use ONLY printed reference ranges (lab ranges vary widely).
- Do NOT diagnose hypothyroidism, hyperthyroidism, or Graves’ disease unless explicitly written.
- Do NOT infer pregnancy-adjusted ranges unless the report prints them.
- If the report marks High/Low beside TSH/T3/T4, reflect that in status — do not escalate further.
`.trim();

export const thyroidProfilePromptModule: MedicalPromptModule = {
  id: "thyroid_profile",
  label: "Thyroid Profile",
  prompt: THYROID_PROFILE_PROMPT,
  keywords: ["thyroid", "tsh", "ft3", "ft4", "t3", "t4"],
};

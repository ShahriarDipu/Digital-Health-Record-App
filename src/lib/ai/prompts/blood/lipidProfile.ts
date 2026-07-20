import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const LIPID_PROFILE_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Lipid Profile
════════════════════════════════════════
This is a lipid / cholesterol panel common in Bangladesh labs.

Focus on printed values such as:
- Total Cholesterol
- HDL Cholesterol
- LDL Cholesterol
- Triglycerides (TG)
- VLDL (if printed)
- Non-HDL / Cholesterol ratios ONLY if printed

Lipid-specific rules:
- Extract each clearly printed lipid value as a biomarker.
- Use ONLY printed reference ranges — never use textbook cutoffs.
- Do NOT diagnose dyslipidemia, heart disease, or metabolic syndrome unless explicitly written.
- Do NOT calculate missing LDL/VLDL from Friedewald or other formulas.
- If fasting status is printed, mention it as info; if not printed, do not assume fasting.
`.trim();

export const lipidProfilePromptModule: MedicalPromptModule = {
  id: "lipid_profile",
  label: "Lipid Profile",
  prompt: LIPID_PROFILE_PROMPT,
  keywords: ["lipid", "cholesterol", "hdl", "ldl", "triglyceride"],
};

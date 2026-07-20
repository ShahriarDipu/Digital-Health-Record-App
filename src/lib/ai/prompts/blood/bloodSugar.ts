import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const BLOOD_SUGAR_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Blood Sugar / Glucose
════════════════════════════════════════
This covers fasting / random / PP blood sugar and related glucose reports common in Bangladesh.

Focus on printed values such as:
- Fasting Blood Sugar (FBS / FBG)
- Random Blood Sugar (RBS)
- Postprandial / 2-hour PP sugar
- HbA1c (if on the same report)
- Plasma / capillary glucose labels ONLY as printed

Blood-sugar-specific rules:
- Clearly label each value with the exact test name printed (fasting vs random vs PP).
- Never assume fasting if the report does not say fasting / FBS / FBG.
- Do NOT diagnose diabetes, prediabetes, or gestational diabetes unless the report explicitly states it.
- Do NOT apply WHO/ADA diagnostic cutoffs yourself — only use printed ranges/flags.
- If sample time or fasting hours are printed, include as info findings.
`.trim();

export const bloodSugarPromptModule: MedicalPromptModule = {
  id: "blood_sugar",
  label: "Blood Sugar / Glucose",
  prompt: BLOOD_SUGAR_PROMPT,
  keywords: ["blood sugar", "glucose", "fbs", "rbs", "hba1c", "fasting"],
};

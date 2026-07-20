import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const PREGNANCY_ULTRASOUND_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Pregnancy / Obstetric Ultrasound
════════════════════════════════════════
This is an antenatal / obstetric USG report common in Bangladesh.

Focus on printed items such as:
- Gestational sac, yolk sac, fetal pole, cardiac activity
- CRL / BPD / HC / AC / FL and estimated gestational age
- Placenta location, liquor / AFI (if printed)
- Presentation, fetal number, EDD / EGA (ONLY if printed)

Pregnancy-USG-specific rules:
- Extract EVERY organ/measurement section actually written.
- Never invent fetal age, EDD, or cardiac activity if not printed.
- Do NOT declare the pregnancy "normal" or "abnormal" beyond the report wording.
- If "no cardiac activity" or miscarriage-related wording appears, explain calmly
  using ONLY the report text — never soften by inventing hope, never invent diagnosis labels.
- Twin/multiple pregnancy: mention only if the report states it.
`.trim();

export const pregnancyUltrasoundPromptModule: MedicalPromptModule = {
  id: "pregnancy_ultrasound",
  label: "Pregnancy / Obstetric Ultrasound",
  prompt: PREGNANCY_ULTRASOUND_PROMPT,
  keywords: ["pregnancy", "obstetric", "antenatal", "gestational", "fetal", "crl", "iup"],
};

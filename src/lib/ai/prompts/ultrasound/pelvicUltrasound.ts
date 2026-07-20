import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const PELVIC_ULTRASOUND_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Pelvic / Lower Abdomen Ultrasound
════════════════════════════════════════
This is a pelvic USG or ultrasonogram of lower abdomen (L/A), common in Bangladesh.

Focus on printed structures such as:
- Urinary bladder
- Uterus, endometrium
- Right and left ovaries / adnexa
- POD / free fluid
- Prostate / seminal vesicles if male pelvic report and printed

Pelvic-USG-specific rules:
- Create a finding for each organ/section actually described.
- Include all printed measurements (uterus L×W×AP, ET, ovary volumes, cyst sizes).
- Polycystic ovaries ≠ PCOS (base rule).
- Do NOT diagnose fibroids, PID, or malignancy unless the report explicitly states them.
- Never skip Impression / Conclusion even if organs are labeled "normal".
`.trim();

export const pelvicUltrasoundPromptModule: MedicalPromptModule = {
  id: "pelvic_ultrasound",
  label: "Pelvic / Lower Abdomen Ultrasound",
  prompt: PELVIC_ULTRASOUND_PROMPT,
  keywords: ["pelvic", "lower abdomen", "l/a", "usg pelvis"],
};

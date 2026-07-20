import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const BREAST_ULTRASOUND_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Breast Ultrasound
════════════════════════════════════════
This is a breast ultrasonogram (unilateral or bilateral).

Focus on printed items such as:
- Side (right/left), quadrant/clock position if printed
- Lesion size, shape, margins, echotexture
- Axillary nodes if mentioned
- BIRADS category ONLY if printed

Breast-USG-specific rules:
- Extract each described lesion separately; never merge unrelated findings.
- Do NOT invent BIRADS — only include if the report prints it.
- Do NOT diagnose cancer or declare benign/malignant beyond the report wording.
- If "fibroadenoma / cyst / abscess" is written, report as the radiologist stated.
- Never skip recommendation for follow-up if printed.
`.trim();

export const breastUltrasoundPromptModule: MedicalPromptModule = {
  id: "breast_ultrasound",
  label: "Breast Ultrasound",
  prompt: BREAST_ULTRASOUND_PROMPT,
  keywords: ["breast", "birads", "mammary", "axilla"],
};

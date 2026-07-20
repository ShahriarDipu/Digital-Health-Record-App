import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const THYROID_ULTRASOUND_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Thyroid Ultrasound
════════════════════════════════════════
This is a thyroid gland ultrasonogram (with or without neck nodes).

Focus on printed items such as:
- Thyroid lobe sizes / isthmus
- Nodule size, number, echotexture, calcification if printed
- Vascularity notes
- Cervical lymph nodes if mentioned
- TIRADS / ACR TIRADS ONLY if printed

Thyroid-USG-specific rules:
- Extract gland measurements and each nodule description as written.
- Do NOT invent TIRADS scores.
- Do NOT diagnose thyroid cancer, Hashimoto, or Graves from ultrasound wording alone
  unless the Impression explicitly states a diagnosis.
- If "colloid cyst" or "nodule" is printed, explain simply without escalating risk language.
`.trim();

export const thyroidUltrasoundPromptModule: MedicalPromptModule = {
  id: "thyroid_ultrasound",
  label: "Thyroid Ultrasound",
  prompt: THYROID_ULTRASOUND_PROMPT,
  keywords: ["thyroid usg", "thyroid ultrasound", "tirads", "thyroid nodule"],
};

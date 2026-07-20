import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const BIOPSY_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Biopsy / FNAC
════════════════════════════════════════
This covers biopsy and FNAC cytology reports.

Focus on printed items such as:
- Site / procedure (FNAC, core biopsy, etc.)
- Adequacy of sample if mentioned
- Cytology / histology description
- Impression / diagnosis

Biopsy-specific rules:
- Distinguish FNAC vs tissue biopsy using the report title/text only.
- Do NOT invent cancer subtype or metastatic status.
- If sample is "inadequate / unsatisfactory", state that clearly — do not invent results.
- Keep Bethesda / categorical systems ONLY if printed.
- Never recommend surgery/chemo unless the report itself recommends clinical action.
`.trim();

export const biopsyPromptModule: MedicalPromptModule = {
  id: "biopsy",
  label: "Biopsy / FNAC",
  prompt: BIOPSY_PROMPT,
  keywords: ["biopsy", "fnac", "cytology", "core needle"],
};

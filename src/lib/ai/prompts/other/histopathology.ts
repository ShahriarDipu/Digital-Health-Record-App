import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const HISTOPATHOLOGY_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Histopathology
════════════════════════════════════════
This is a histopathology / HPE report.

Focus on printed items such as:
- Specimen / site
- Gross description (if present)
- Microscopic description
- Diagnosis / Impression

Histopathology-specific rules:
- Never skip Microscopic findings or final Diagnosis sections.
- Use the pathologist's diagnosis wording; do not rename to a different disease.
- Do NOT invent malignancy grade, margins, or staging if not printed.
- If "consistent with" / "suggestive of" appears, keep that uncertainty in the explanation.
- Biomarkers: only numeric counts clearly printed; usually biomarkers = [].
`.trim();

export const histopathologyPromptModule: MedicalPromptModule = {
  id: "histopathology",
  label: "Histopathology",
  prompt: HISTOPATHOLOGY_PROMPT,
  keywords: ["histopathology", "hpe", "microscopic", "pathology report"],
};

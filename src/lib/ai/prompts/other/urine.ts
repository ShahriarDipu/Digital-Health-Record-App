import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const URINE_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Urine R/E / Urinalysis
════════════════════════════════════════
This is a routine urine examination (Urine R/E) common in Bangladesh labs.

Focus on printed items such as:
- Physical: color, appearance, specific gravity (if printed)
- Chemical: pH, protein, glucose, ketone, blood, nitrite, leukocyte esterase
- Microscopy: pus cells, epithelial cells, RBC, casts, crystals, bacteria

Urine-specific rules:
- Extract each clearly printed chemical/microscopy line.
- Do NOT diagnose UTI, kidney stone, or diabetes from urine alone unless explicitly written.
- "Pus cells plenty" / "traces" — use the report wording; do not invent CFU counts.
- If culture is on a separate section, include only what is printed on this image.
`.trim();

export const urinePromptModule: MedicalPromptModule = {
  id: "urine",
  label: "Urine R/E / Urinalysis",
  prompt: URINE_PROMPT,
  keywords: ["urine", "urinalysis", "urine r/e", "pus cells"],
};

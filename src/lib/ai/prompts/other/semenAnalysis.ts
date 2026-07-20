import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const SEMEN_ANALYSIS_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Semen Analysis
════════════════════════════════════════
This is a semen analysis / seminal fluid report.

Focus on printed items such as:
- Volume, color, liquefaction, viscosity (if printed)
- Sperm concentration / count
- Motility percentages
- Morphology percentage
- pH, WBC if printed

Semen-analysis-specific rules:
- Extract each clearly printed parameter as a biomarker when numeric.
- Use ONLY printed reference ranges (WHO edition varies by lab — never invent).
- Do NOT diagnose infertility or azoospermia unless explicitly written.
- Explain results calmly and factually; avoid blame or alarming language.
- If abstinence period is printed, include as info; never invent it.
`.trim();

export const semenAnalysisPromptModule: MedicalPromptModule = {
  id: "semen_analysis",
  label: "Semen Analysis",
  prompt: SEMEN_ANALYSIS_PROMPT,
  keywords: ["semen", "seminal", "sperm", "motility", "morphology"],
};

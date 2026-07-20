import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const STOOL_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Stool Examination
════════════════════════════════════════
This is a stool routine / microscopy report.

Focus on printed items such as:
- Consistency, color, mucus, blood (if printed)
- Occult blood
- Ova / parasite / cyst findings
- Reducing substance, pH, fat globules if printed

Stool-specific rules:
- Extract every microscopy line that is visible.
- Do NOT diagnose IBS, IBD, or worm infestation beyond what is written.
- If "no ova or parasite seen" is printed, state that clearly.
- Never invent pathogen names from vague "bacteria present" wording.
`.trim();

export const stoolPromptModule: MedicalPromptModule = {
  id: "stool",
  label: "Stool Examination",
  prompt: STOOL_PROMPT,
  keywords: ["stool", "ova", "parasite", "occult blood", "feces"],
};

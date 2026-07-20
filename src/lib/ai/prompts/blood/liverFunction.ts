import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const LIVER_FUNCTION_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Liver Function Test (LFT)
════════════════════════════════════════
This is a Liver Function Test / Hepatic panel common in Bangladesh labs.

Focus on printed values such as:
- Bilirubin (Total / Direct / Indirect) if printed
- SGPT / ALT, SGOT / AST
- Alkaline Phosphatase (ALP)
- GGT (if printed)
- Total Protein, Albumin, Globulin, A/G ratio (if printed)

LFT-specific rules:
- Extract every clearly printed LFT analyte as a biomarker.
- Keep SGPT/ALT and SGOT/AST labels exactly as printed (Bangladesh labs often use SGPT/SGOT).
- Do NOT diagnose hepatitis, fatty liver, cirrhosis, or jaundice unless explicitly written.
- Do NOT invent which fraction of bilirubin is raised if only total is printed.
- If clinical notes mention yellow eyes / jaundice, treat as printed comment only — not a new diagnosis.
`.trim();

export const liverFunctionPromptModule: MedicalPromptModule = {
  id: "liver_function",
  label: "Liver Function Test (LFT)",
  prompt: LIVER_FUNCTION_PROMPT,
  keywords: ["lft", "liver function", "sgpt", "sgot", "alt", "ast", "bilirubin"],
};

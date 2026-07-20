import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const KIDNEY_FUNCTION_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Kidney Function Test (KFT / RFT)
════════════════════════════════════════
This is a Kidney / Renal Function Test common in Bangladesh labs.

Focus on printed values such as:
- Serum Creatinine
- Blood Urea / BUN
- eGFR (ONLY if printed)
- Uric acid (if on the same report)
- Electrolytes (Na, K, Cl) ONLY if printed on this report

KFT-specific rules:
- Extract every clearly printed renal analyte as a biomarker.
- Do NOT calculate eGFR yourself if it is not printed.
- Do NOT diagnose CKD, AKI, kidney failure, or stones unless explicitly written.
- If urine findings appear on a combined report, extract them separately — do not mix into serum values.
- Preserve printed units (mg/dL, µmol/L, mL/min) exactly; if unclear → Not clearly visible.
`.trim();

export const kidneyFunctionPromptModule: MedicalPromptModule = {
  id: "kidney_function",
  label: "Kidney Function Test (KFT / RFT)",
  prompt: KIDNEY_FUNCTION_PROMPT,
  keywords: ["kft", "rft", "kidney function", "renal", "creatinine", "urea", "egfr"],
};

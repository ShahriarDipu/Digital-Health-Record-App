import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const CT_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: CT Scan
════════════════════════════════════════
This is a Computed Tomography report (plain / contrast / HRCT, etc.).

Focus on printed items such as:
- Protocol / region scanned / contrast use if printed
- Organ-wise or series-wise findings
- Measurements of lesions if printed
- Impression / conclusion

CT-specific rules:
- Cover every listed finding; CT reports are often long — do not summarize away organs.
- Do NOT invent contrast reactions, staging, or tumor type beyond printed text.
- If "needs clinical correlation" appears, include that limitation in meaning.
- Never upgrade "suspicious" or "cannot exclude" into a definite diagnosis.
- Biomarkers array: use for clearly printed numeric measurements only; else [].
`.trim();

export const ctPromptModule: MedicalPromptModule = {
  id: "ct",
  label: "CT Scan",
  prompt: CT_PROMPT,
  keywords: ["ct scan", "computed tomography", "hrct", "ct abdomen", "ct chest"],
};

import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const CBC_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: CBC (Complete Blood Count)
════════════════════════════════════════
This is a Complete Blood Count / Full Blood Count report common in Bangladesh labs.

Focus extraction on values actually printed, such as:
- Hemoglobin (Hb), RBC, WBC / Total Count
- Platelet count
- Hematocrit (Hct), MCV, MCH, MCHC, RDW
- Differential count: Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils
- Any printed flags (H/L/*) next to results

CBC-specific rules:
- Extract EVERY printed blood-count line as a biomarker when the number is clear.
- Do NOT invent differential percentages if only total WBC is shown.
- Do NOT infer anemia, infection, dengue, or leukemia unless the report explicitly states it.
- If "Peripheral Blood Film" / PBF comments exist, include them as findings — never invent film comments.
- Units must match the printed unit (g/dL, ×10^9/L, %, etc.). If unit unclear → Not clearly visible.
`.trim();

export const cbcPromptModule: MedicalPromptModule = {
  id: "cbc",
  label: "CBC / Complete Blood Count",
  prompt: CBC_PROMPT,
  keywords: ["cbc", "complete blood count", "full blood count", "hemoglobin", "platelet"],
};

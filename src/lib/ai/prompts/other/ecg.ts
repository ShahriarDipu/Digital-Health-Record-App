import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const ECG_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: ECG / EKG
════════════════════════════════════════
This is an electrocardiogram report or printed ECG interpretation.

Focus on printed items such as:
- Rate, rhythm, axis (if printed numerically or in text)
- PR / QRS / QT intervals if printed
- Written impression (e.g. sinus rhythm, ST-T changes)

ECG-specific rules:
- Prefer the written interpretation/Impression over attempting to "read" waveform images.
- Do NOT invent MI, ischemia, or arrhythmia unless the report text states it.
- If only a waveform image is present with little text, mark unclear parts as Not clearly visible.
- Never invent numeric intervals that are not printed.
`.trim();

export const ecgPromptModule: MedicalPromptModule = {
  id: "ecg",
  label: "ECG / EKG",
  prompt: ECG_PROMPT,
  keywords: ["ecg", "ekg", "electrocardiogram", "sinus rhythm"],
};

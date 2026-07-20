import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const ANOMALY_SCAN_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Anomaly Scan (TIFFA / Level-II)
════════════════════════════════════════
This is a mid-trimester anomaly / TIFFA / Level-II obstetric ultrasound.

Focus on printed fetal anatomy checklist items such as:
- Head, brain, spine, face, heart, abdomen, kidneys, limbs
- Placenta, cord, liquor
- Any marked "normal / seen / not seen / anomaly" lines

Anomaly-scan-specific rules:
- Cover EVERY anatomy section printed — never skip unchecked or "not visualized" lines.
- If a structure is "not clearly visualized", write Not clearly visible / as printed — do not assume normal.
- Do NOT invent congenital anomalies. Only report anomalies explicitly written.
- Soft markers: explain only as the report states; do not expand into genetic diagnoses.
- Keep Impression/Conclusion verbatim in spirit — never upgrade uncertainty to diagnosis.
`.trim();

export const anomalyScanPromptModule: MedicalPromptModule = {
  id: "anomaly_scan",
  label: "Anomaly Scan / TIFFA / Level-II",
  prompt: ANOMALY_SCAN_PROMPT,
  keywords: ["anomaly", "tiffa", "level ii", "level-ii", "malformation"],
};

import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const GROWTH_SCAN_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Growth Scan / Fetal Biometry
════════════════════════════════════════
This is a fetal growth / biometry / third-trimester growth USG.

Focus on printed items such as:
- BPD, HC, AC, FL and estimated fetal weight (EFW) if printed
- Gestational age by dates vs by scan (ONLY as printed)
- AFI / liquor, placenta grade/location
- Doppler values ONLY if printed (UA PI/RI, etc.)

Growth-scan-specific rules:
- Extract all printed biometry numbers as biomarkers/measurements.
- Do NOT calculate percentiles or EFW if not printed.
- Do NOT diagnose IUGR / FGR / macrosomia unless the report explicitly states it.
- If growth is "corresponding to dates" or "lagging", use the report's wording only.
- Never invent Doppler interpretation beyond printed conclusions.
`.trim();

export const growthScanPromptModule: MedicalPromptModule = {
  id: "growth_scan",
  label: "Growth Scan / Fetal Biometry",
  prompt: GROWTH_SCAN_PROMPT,
  keywords: ["growth scan", "biometry", "efw", "afi", "doppler", "iugr"],
};

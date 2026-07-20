import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const ECHO_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Echocardiography (Echo)
════════════════════════════════════════
This is a 2D echo / Doppler echocardiography report.

Focus on printed items such as:
- Chamber dimensions, wall thickness if printed
- Ejection fraction (EF / LVEF) if printed
- Valves (mitral, aortic, tricuspid, pulmonary) descriptions
- RWMA, pericardial effusion, PASP if printed
- Impression / conclusion

Echo-specific rules:
- Extract each chamber/valve section present.
- Include EF and other numbers only when clearly printed.
- Do NOT diagnose heart failure or valve disease grade beyond the report wording.
- Do not invent EF if missing.
- Keep Doppler comments exactly as hedged in the report.
`.trim();

export const echoPromptModule: MedicalPromptModule = {
  id: "echo",
  label: "Echocardiography",
  prompt: ECHO_PROMPT,
  keywords: ["echo", "echocardiography", "lvef", "ejection fraction"],
};

import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const FOLLICULOMETRY_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Folliculometry
════════════════════════════════════════
This is a follicular monitoring / folliculometry USG (often serial TVS).

Focus on printed items such as:
- Follicle sizes on right/left ovary
- Endometrial thickness
- Dominant follicle measurement
- Day of cycle ONLY if printed

Folliculometry-specific rules:
- List each ovary's follicle measurements exactly as printed.
- Do NOT invent ovulation, rupture, or "ready for trigger" advice unless written.
- Do NOT infer fertility treatment plans (IUI/IVF timing) unless the report states them.
- If prior-day comparison is printed, include it; never invent previous sizes.
- Keep status factual — measurement presence is not a diagnosis.
`.trim();

export const folliculometryPromptModule: MedicalPromptModule = {
  id: "folliculometry",
  label: "Folliculometry",
  prompt: FOLLICULOMETRY_PROMPT,
  keywords: ["folliculometry", "follicle monitoring", "dominant follicle"],
};

import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const TVS_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: TVS (Transvaginal Ultrasound)
════════════════════════════════════════
This is a Transvaginal Sonography (TVS) report common in Bangladesh gynecology practice.

Focus on printed structures such as:
- Uterus size/position, endometrium thickness
- Right and left ovaries (size, follicles, volume)
- POD / free fluid
- Any adnexal mass, cyst, or lesion descriptions

TVS-specific rules:
- Extract uterus, endometrium, each ovary, and POD separately when present.
- Include ALL measurements (mm/cc) that are clearly printed.
- Polycystic ovaries ≠ PCOS (follow base rule strictly).
- Do NOT diagnose PCOS, endometriosis, PID, or cancer unless explicitly written.
- If "dominant follicle" or folliculometry notes appear, report as written — do not invent ovulation status.
`.trim();

export const tvsPromptModule: MedicalPromptModule = {
  id: "tvs",
  label: "TVS / Transvaginal Ultrasound",
  prompt: TVS_PROMPT,
  keywords: ["tvs", "transvaginal", "tv usg", "tv sono"],
};

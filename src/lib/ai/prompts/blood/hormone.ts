import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const HORMONE_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Hormone Panel
════════════════════════════════════════
This covers reproductive / endocrine hormone reports common in Bangladesh
(FSH, LH, Prolactin, AMH, Estradiol, Testosterone, Beta-hCG, Progesterone, etc.).

Hormone-specific rules:
- Extract ONLY hormones whose values are clearly printed.
- Preserve exact hormone names and units as printed.
- Cycle day / LMP / day of sample: include ONLY if printed; never invent cycle day.
- Do NOT diagnose PCOS, menopause, infertility, pregnancy, or hypogonadism unless
  the report explicitly states that diagnosis.
- Beta-hCG: report the printed value/interpretation only — do not declare pregnancy
  unless the report explicitly says pregnant / consistent with pregnancy.
- For AMH/FSH/LH: explain the printed result simply; do not invent fertility prognosis.
`.trim();

export const hormonePromptModule: MedicalPromptModule = {
  id: "hormone",
  label: "Hormone Panel",
  prompt: HORMONE_PROMPT,
  keywords: ["hormone", "fsh", "lh", "prolactin", "amh", "estradiol", "testosterone", "hcg"],
};

import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const WHOLE_ABDOMEN_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: Whole Abdomen Ultrasound
════════════════════════════════════════
This is a Whole Abdomen (W/A) ultrasonogram covering upper and lower abdomen.

Focus on printed organs such as:
- Liver, gallbladder, CBD, pancreas, spleen
- Kidneys, urinary bladder
- Prostate / uterus / ovaries when included
- Ascites / free fluid, any mass or lesion notes

Whole-abdomen-specific rules:
- Extract EVERY organ paragraph present — do not stop after liver/kidneys.
- Include sizes (liver span, kidney lengths, prostate volume, etc.) when printed.
- Do NOT diagnose fatty liver grade, stones, or hydronephrosis unless explicitly written.
- If an organ is "not visualized" (e.g. pancreas obscured), say so — do not invent normal.
- Keep Impression/Conclusion complete; they often summarize multiple organs.
`.trim();

export const wholeAbdomenPromptModule: MedicalPromptModule = {
  id: "whole_abdomen",
  label: "Whole Abdomen Ultrasound",
  prompt: WHOLE_ABDOMEN_PROMPT,
  keywords: ["whole abdomen", "w/a", "upper abdomen", "abdomen usg"],
};

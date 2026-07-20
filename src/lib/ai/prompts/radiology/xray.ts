import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const XRAY_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: X-Ray
════════════════════════════════════════
This is a plain radiograph report (chest, limb, spine, KUB, etc.).

Focus on printed items such as:
- Study name / view (PA, AP, lateral) if printed
- Described bones, joints, lung fields, soft tissues as applicable
- Impression / conclusion lines

X-ray-specific rules:
- Explain only findings written by the radiologist — never "see" extra shadows.
- Do NOT diagnose pneumonia, TB, fracture, or cardiomegaly unless explicitly stated.
- If "no significant abnormality detected" (NSAD) is written, reflect that calmly.
- Measurements (angles, cardiothoracic ratio) only if printed.
- Handwritten overlays/marks: include only if readable; else Not clearly visible.
`.trim();

export const xrayPromptModule: MedicalPromptModule = {
  id: "xray",
  label: "X-Ray",
  prompt: XRAY_PROMPT,
  keywords: ["x-ray", "xray", "radiograph", "cxr", "chest x"],
};

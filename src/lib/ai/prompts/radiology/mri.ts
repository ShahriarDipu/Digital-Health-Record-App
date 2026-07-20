import { BASE_MEDICAL_PROMPT, type MedicalPromptModule } from "../base";

export const MRI_PROMPT = `
${BASE_MEDICAL_PROMPT}

════════════════════════════════════════
REPORT-SPECIFIC RULES: MRI
════════════════════════════════════════
This is a Magnetic Resonance Imaging report.

Focus on printed items such as:
- Region / sequences mentioned if printed
- Signal descriptions only as written (T1/T2/FLAIR etc. if present)
- Lesion size/location
- Impression / conclusion

MRI-specific rules:
- Extract section-by-section findings; do not skip "unremarkable" organs if listed.
- Do NOT invent enhancement patterns or diagnoses not written.
- Technical MRI jargon should be translated to simple Bangla/English WITHOUT adding meaning.
- Phrases like "suggestive of" / "likely" must stay hedged — never harden into certainty.
- Never diagnose cancer or demyelination unless Impression explicitly states it.
`.trim();

export const mriPromptModule: MedicalPromptModule = {
  id: "mri",
  label: "MRI",
  prompt: MRI_PROMPT,
  keywords: ["mri", "magnetic resonance"],
};

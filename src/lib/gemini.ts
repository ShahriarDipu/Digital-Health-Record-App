import { GoogleGenAI } from "@google/genai";
import type { LabBiomarker, LabReport, LabReportFinding, Prescription, Medicine, HealthReport, LifestyleDirections, ProgressReport, Visit } from "@/store/useAppStore";
import type { Language } from "@/lib/translations";

const LAB_BIOMARKER_SCHEMA = {
  type: "object",
  properties: {
    nameBn: {
      type: "string",
      description: "Simple Bangla test name patients understand e.g. সাদা রক্ত কোষ, লাল রক্ত কোষ, হিমোগ্লোবিন",
    },
    nameEn: {
      type: "string",
      description: "English medical name e.g. White Blood Cells, Red Blood Cells, Hemoglobin",
    },
    value: { type: "number" },
    unit: { type: "string" },
    normalMin: { type: "number" },
    normalMax: { type: "number" },
  },
  required: ["nameBn", "nameEn", "value", "unit", "normalMin", "normalMax"],
};

const LAB_FINDING_SCHEMA = {
  type: "object",
  properties: {
    titleBn: {
      type: "string",
      description: "Organ or test name in simple Bangla e.g. জরায়ু, মূত্রথলি, ডান ডিম্বাশয়",
    },
    titleEn: { type: "string", description: "English title e.g. Uterus, Urinary Bladder" },
    detailBn: {
      type: "string",
      description: "2-4 sentences in VERY SIMPLE Bangla explaining what was found and what it means for a non-medical patient",
    },
    detailEn: { type: "string", description: "Same explanation in simple English" },
    status: {
      type: "string",
      enum: ["normal", "concern", "info"],
      description: "normal = OK finding, concern = needs doctor attention, info = neutral/context",
    },
  },
  required: ["titleBn", "titleEn", "detailBn", "detailEn", "status"],
};

const LAB_REPORT_SCHEMA = {
  type: "object",
  properties: {
    typeBn: {
      type: "string",
      description: "Report type in simple Bangla e.g. সম্পূর্ণ রক্ত গণনা, নিম্ন পেটের আল্ট্রাসনোগ্রাম",
    },
    typeEn: {
      type: "string",
      description: "Report type in English e.g. CBC, Ultrasonogram of Lower Abdomen",
    },
    date: { type: "string", description: "Report date in YYYY-MM-DD format" },
    summaryBn: {
      type: "string",
      description: "2-3 sentence overall summary in VERY SIMPLE Bangla for uneducated patients",
    },
    summaryEn: { type: "string", description: "Same summary in simple English" },
    meaningBn: {
      type: "string",
      description: "Paragraph in simple Bangla: what this report means overall, limitations (e.g. ultrasound alone does not confirm PCOS), avoid scary language",
    },
    meaningEn: { type: "string", description: "Same meaning paragraph in simple English" },
    nextStepsBn: {
      type: "array",
      items: { type: "string" },
      description: "3-5 actionable next steps in simple Bangla e.g. গাইনি বিশেষজ্ঞের পরামর্শ নিন",
    },
    nextStepsEn: {
      type: "array",
      items: { type: "string" },
      description: "3-5 actionable next steps in simple English",
    },
    findings: {
      type: "array",
      items: LAB_FINDING_SCHEMA,
      description: "Each organ/test/finding explained separately for the patient",
    },
    biomarkers: {
      type: "array",
      items: LAB_BIOMARKER_SCHEMA,
      description: "Numeric test results only — empty array if report has no numbers (e.g. some imaging)",
    },
  },
  required: [
    "typeBn",
    "typeEn",
    "date",
    "summaryBn",
    "summaryEn",
    "meaningBn",
    "meaningEn",
    "nextStepsBn",
    "nextStepsEn",
    "findings",
    "biomarkers",
  ],
};

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

// Prescription scanning uses dedicated vision model for accuracy
const PRESCRIPTION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.1-flash-lite";
// All other tasks use the standard 


const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function computeStatus(value: number, normalMin: number, normalMax: number): LabBiomarker["status"] {
  if (value < normalMin) return "low";
  if (value > normalMax) return "high";
  return "normal";
}

function parseGeminiJson(text: string): {
  typeBn?: string;
  typeEn?: string;
  type?: string;
  date: string;
  summaryBn?: string;
  summaryEn?: string;
  meaningBn?: string;
  meaningEn?: string;
  nextStepsBn?: string[];
  nextStepsEn?: string[];
  findings?: Record<string, unknown>[];
  biomarkers: Record<string, unknown>[];
} {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    typeBn?: string;
    typeEn?: string;
    type?: string;
    date: string;
    summaryBn?: string;
    summaryEn?: string;
    meaningBn?: string;
    meaningEn?: string;
    nextStepsBn?: string[];
    nextStepsEn?: string[];
    findings?: Record<string, unknown>[];
    biomarkers: Record<string, unknown>[];
  };

  if ((!parsed.typeBn && !parsed.typeEn && !parsed.type) || !parsed.date) {
    throw new Error("Invalid response structure from Gemini");
  }

  if (!Array.isArray(parsed.biomarkers)) parsed.biomarkers = [];
  if (!Array.isArray(parsed.findings)) parsed.findings = [];

  return parsed;
}

function parseFindings(raw: Record<string, unknown>[]) {
  return raw
    .map((f) => {
      const status = f.status;
      const validStatus =
        status === "normal" || status === "concern" || status === "info"
          ? status
          : "info";
      return {
        titleBn: String(f.titleBn || f.title || "ফলাফল"),
        titleEn: String(f.titleEn || f.title || "Finding"),
        detailBn: String(f.detailBn || f.detail || ""),
        detailEn: String(f.detailEn || f.detail || ""),
        status: validStatus as "normal" | "concern" | "info",
      };
    })
    .filter((f) => f.detailBn || f.detailEn);
}

export async function analyzeLabReportImage(
  base64Data: string,
  mimeType: string,
  _language: Language
): Promise<LabReport> {
  void _language;
  const ai = getClient();
  const model = DEFAULT_MODEL;

  const langInstruction = `BILINGUAL OUTPUT — STRICTLY FOLLOW:
Return BOTH Bangla and English for all patient-facing text.
- Use VERY SIMPLE Bangla that an uneducated village patient can understand
- Put medical terms in parentheses once e.g. "জরায়ু (Uterus)"
- Never use scary language; be calm and helpful
- nameBn / typeBn / summaryBn / meaningBn / detailBn / nextStepsBn = simple Bangla
- nameEn / typeEn / summaryEn / meaningEn / detailEn / nextStepsEn = simple English`;

  const interaction = await ai.interactions.create({
    model,
    input: [
      {
        type: "text",
        text: `You are a compassionate health educator for Bangladeshi patients who often cannot read medical English.

Analyze this lab/imaging report image and explain it the way a good doctor would to a worried family member — in PLAIN LANGUAGE.

Report types include: blood tests (CBC, lipid, sugar), ultrasound/sonography, X-ray, urine, thyroid, hormone, pathology, etc.

${langInstruction}

STEP 1 — Extract findings (REQUIRED, at least 3 items):
For EACH organ, test, or section in the report, add a finding with:
- titleBn/En: what was examined
- detailBn/En: what the report says + simple meaning (2-4 sentences)
- status: "normal" if OK, "concern" if abnormal or needs follow-up, "info" for context

STEP 2 — Numeric biomarkers (when numbers exist):
For blood tests or measurable values (e.g. hemoglobin, ovary volume 10.2cc, endometrium 6.3mm):
- nameBn/En, value, unit, normalMin, normalMax
If no numeric values exist, return biomarkers as empty array [].

STEP 3 — Patient summary (REQUIRED):
- summaryBn/En: 2-3 sentence overall summary
- meaningBn/En: what this means for the patient; note if diagnosis cannot be confirmed from report alone
- nextStepsBn/En: 3-5 practical next steps (see specialist, which tests, lifestyle)

Also extract typeBn/En and date (YYYY-MM-DD).

Return only JSON matching the schema.`,
      },
      {
        type: "image",
        data: base64Data,
        mime_type: mimeType,
      },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: LAB_REPORT_SCHEMA,
    },
  });

  const outputText = interaction.output_text;
  if (!outputText) {
    throw new Error("No response from Gemini");
  }

  const parsed = parseGeminiJson(outputText);

  const biomarkers: LabBiomarker[] = parsed.biomarkers
    .filter((b) => typeof b.value === "number" && !Number.isNaN(b.value))
    .map((b) => {
      const nameBn = String(b.nameBn || b.name || "অজানা পরীক্ষা");
      const nameEn = String(b.nameEn || b.name || "Unknown Test");
      return {
        name: nameBn,
        nameBn,
        nameEn,
        value: Number(b.value),
        unit: String(b.unit || ""),
        normalMin: Number(b.normalMin ?? 0),
        normalMax: Number(b.normalMax ?? 0),
        status: computeStatus(Number(b.value), Number(b.normalMin ?? 0), Number(b.normalMax ?? 0)),
      };
    });

  const findings: LabReportFinding[] = parseFindings(parsed.findings ?? []);

  if (biomarkers.length === 0 && findings.length === 0) {
    throw new Error("No biomarkers could be extracted from the report");
  }

  const typeBn = String(parsed.typeBn || parsed.type || "ল্যাব রিপোর্ট");
  const typeEn = String(parsed.typeEn || parsed.type || "Lab Report");

  return {
    id: `lab-${Date.now()}`,
    type: typeBn,
    typeBn,
    typeEn,
    date: parsed.date,
    biomarkers,
    findings,
    summaryBn: String(parsed.summaryBn || ""),
    summaryEn: String(parsed.summaryEn || ""),
    meaningBn: String(parsed.meaningBn || ""),
    meaningEn: String(parsed.meaningEn || ""),
    nextStepsBn: Array.isArray(parsed.nextStepsBn) ? parsed.nextStepsBn.map(String) : [],
    nextStepsEn: Array.isArray(parsed.nextStepsEn) ? parsed.nextStepsEn.map(String) : [],
    analyzed: true,
  };
}

// ─── Prescription Schema ──────────────────────────────────────────────────────

const PRESCRIPTION_SCHEMA = {
  type: "object",
  properties: {
    doctorName: { type: "string", description: "Doctor's full name, e.g. Dr. Mohammed Rafiqul Islam" },
    patientName: { type: "string", description: "Patient's name if visible" },
    date: { type: "string", description: "Prescription date as YYYY-MM-DD" },
    medicines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full medicine brand/generic name with strength e.g. Metformin 500mg" },
          dose: { type: "string", description: "Dose per intake e.g. 1 tablet, 5ml" },
          schedule: { type: "string", description: "Dosing pattern as Bengali numerals X+Y+Z (morning+noon+night)" },
          purposeBn: { type: "string", description: "Medical purpose in Bangla e.g. ডায়াবেটিস নিয়ন্ত্রণ, রক্তচাপ কমানো" },
          purposeEn: { type: "string", description: "Medical purpose in English e.g. Diabetes control, Blood pressure reduction" },
          instructionsBn: { type: "string", description: "How/when to take in Bangla e.g. খাবারের পরে খাবেন, রাতে ঘুমানোর আগে" },
          instructionsEn: { type: "string", description: "How/when to take in English e.g. Take after meals, Before sleep at night" },
          durationBn: { type: "string", description: "Duration in Bangla e.g. ৩ মাস, ১ সপ্তাহ, ডাক্তারের নির্দেশ অনুযায়ী" },
          durationEn: { type: "string", description: "Duration in English e.g. 3 months, 1 week, As directed by doctor" },
        },
        required: ["name", "dose", "schedule", "purposeBn", "purposeEn", "instructionsBn", "instructionsEn", "durationBn", "durationEn"],
      },
    },
  },
  required: ["doctorName", "patientName", "date", "medicines"],
};

function parsePrescriptionJson(text: string): {
  doctorName: string;
  patientName: string;
  date: string;
  medicines: Record<string, unknown>[];
} {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    doctorName: string;
    patientName: string;
    date: string;
    medicines: Record<string, unknown>[];
  };

  if (!parsed.doctorName || !Array.isArray(parsed.medicines)) {
    throw new Error("Invalid prescription structure from Gemini");
  }

  return parsed;
}

export async function analyzePrescriptionImage(
  base64Data: string,
  mimeType: string,
  language: Language
): Promise<Prescription> {
  const ai = getClient();
  const model = PRESCRIPTION_MODEL;

  const langInstruction = `BILINGUAL OUTPUT RULE — STRICTLY FOLLOW:
Always provide BOTH Bangla and English versions for purpose, instructions, and duration fields.
- "purposeBn": medical purpose in Bangla e.g. "ডায়াবেটিস নিয়ন্ত্রণ", "হরমোনাল ব্রণ চিকিৎসা"
- "purposeEn": same purpose in English e.g. "Diabetes control", "Hormonal acne treatment"
- "instructionsBn": how to take in Bangla e.g. "খাবারের পরে খাবেন", "রাতে ঘুমানোর আগে খাবেন"
- "instructionsEn": same in English e.g. "Take after meals", "Take before sleep at night"
- "durationBn": duration in Bangla e.g. "৩ মাস", "১ সপ্তাহ", "ডাক্তারের নির্দেশ অনুযায়ী"
- "durationEn": same in English e.g. "3 months", "1 week", "As directed by doctor"
- "doctorName" and "patientName": keep exactly as written on prescription
- Medicine "name": keep brand/generic name as written on prescription`;

  const interaction = await ai.interactions.create({
    model,
    input: [
      {
        type: "text",
        text: `You are an expert medical prescription reader specializing in South Asian (Bangladeshi/Indian) doctor handwriting.

Your task: carefully read this handwritten prescription image and extract all information accurately.

HANDWRITING READING TIPS:
- Doctor handwriting is often abbreviated or cursive — use medical knowledge to infer full medicine names
- Common abbreviations: "Tab" = Tablet, "Cap" = Capsule, "Syr" = Syrup, "OD" = once daily, "BD" = twice daily, "TDS/TID" = 3 times, "QID" = 4 times, "HS" = at bedtime, "AC" = before meals, "PC" = after meals, "SOS" = when needed
- If unsure of spelling, use the most likely medicine name based on context
- Dose strength formats: "500mg", "20mg", "5mg", "1+0+1" etc.

SCHEDULE FORMAT — convert to Bengali numeral X+Y+Z (morning+noon+night):
- Once daily morning → "১+০+০"
- Once daily night / HS / OD night → "০+০+১"
- Twice daily / BD / morning+night → "১+০+১"
- Three times / TDS / TID → "১+১+১"
- Four times / QID → "১+১+১+১"
- If only "OD" without timing, default → "১+০+০"

MEDICINE PURPOSE — always infer from medicine name even if not written:
- Metformin/Glucophage → diabetes/blood sugar control
- Amlodipine/Amlodine/Norvasc → blood pressure control
- Esomeprazole/Nexium/Omeprazole → acidity/gastric control
- Paracetamol/Napa/Panadol → fever/pain relief
- Atorvastatin/Lipitor → cholesterol control
- Losartan/Amlodipine → hypertension
- Azithromycin/Amoxicillin → antibiotic/infection
- Cetirizine/Fexofenadine → allergy/cold
- Diclofenac/Ibuprofen → pain/inflammation
- Insulin → diabetes blood sugar control
- If unknown medicine, write purposeBn: "ডাক্তারের নির্দেশ অনুযায়ী", purposeEn: "As prescribed by doctor"

${langInstruction}

IMPORTANT RULES:
- If doctor name is unclear, write "Unknown Doctor"
- If patient name is not visible, write "${language === "bn" ? "অজানা রোগী" : "Unknown Patient"}"
- If date is not visible, use today's date ${new Date().toISOString().split("T")[0]}
- Extract EVERY medicine listed on the prescription
- durationBn: if not specified, write "ডাক্তারের নির্দেশ অনুযায়ী" | durationEn: write "As directed by doctor"
- instructionsBn/instructionsEn: always specify meal timing (before/after food) and time of day in respective languages

Return only valid JSON matching the schema. Do NOT include any explanation outside JSON.`,
      },
      {
        type: "image",
        data: base64Data,
        mime_type: mimeType,
      },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: PRESCRIPTION_SCHEMA,
    },
  });

  const outputText = interaction.output_text;
  if (!outputText) {
    throw new Error("No response from Gemini");
  }

  const parsed = parsePrescriptionJson(outputText);

  const medicines: Medicine[] = parsed.medicines.map((m) => {
    const purposeBn = String(m.purposeBn || "ডাক্তারের নির্দেশ অনুযায়ী");
    const purposeEn = String(m.purposeEn || "As prescribed by doctor");
    const instructionsBn = String(m.instructionsBn || "ডাক্তারের নির্দেশ মতো খাবেন");
    const instructionsEn = String(m.instructionsEn || "As directed");
    const durationBn = String(m.durationBn || "ডাক্তারের নির্দেশ অনুযায়ী");
    const durationEn = String(m.durationEn || "As directed by doctor");

    return {
      name: String(m.name || "Unknown Medicine"),
      dose: String(m.dose || "1 tablet"),
      schedule: String(m.schedule || "১+০+১"),
      // Default fields: use bn as primary
      purpose: purposeBn,
      instructions: instructionsBn,
      duration: durationBn,
      // Bilingual fields
      purposeBn,
      purposeEn,
      instructionsBn,
      instructionsEn,
      durationBn,
      durationEn,
    };
  });

  if (medicines.length === 0) {
    throw new Error("No medicines could be extracted from this prescription");
  }

  return {
    id: `rx-${Date.now()}`,
    doctorName: String(parsed.doctorName || "Unknown Doctor"),
    patientName: String(parsed.patientName || "Unknown Patient"),
    date: String(parsed.date || new Date().toISOString().split("T")[0]),
    medicines,
    decoded: true,
  };
}

// ─── Health Report Generator ──────────────────────────────────────────────────

const BILINGUAL_LIFESTYLE_SCHEMA = {
  type: "object",
  properties: {
    diet: { type: "array", items: { type: "string" }, description: "Specific diet recommendations" },
    exercise: { type: "array", items: { type: "string" }, description: "Exercise recommendations" },
    medication: { type: "array", items: { type: "string" }, description: "Medicine-taking tips" },
    sleep: { type: "string", description: "Sleep recommendation" },
    warnings: { type: "array", items: { type: "string" }, description: "Warning signs to watch for" },
  },
  required: ["diet", "exercise", "medication", "sleep", "warnings"],
};

const BILINGUAL_HEALTH_CONTENT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2-3 sentence overall health summary" },
    conditions: { type: "array", items: { type: "string" }, description: "List of identified medical conditions" },
    prescriptionExplanation: { type: "string", description: "Explain why each medicine was prescribed based on lab results" },
    followUpNote: { type: "string", description: "When to follow up with doctor" },
    lifestyle: BILINGUAL_LIFESTYLE_SCHEMA,
  },
  required: ["summary", "conditions", "prescriptionExplanation", "followUpNote", "lifestyle"],
};

const HEALTH_REPORT_SCHEMA = {
  type: "object",
  properties: {
    healthScore: { type: "number", description: "Overall health score 0-100 based on lab results and conditions" },
    riskLevel: { type: "string", description: "low | medium | high" },
    bn: { ...BILINGUAL_HEALTH_CONTENT_SCHEMA, description: "All text fields in Bangla" },
    en: { ...BILINGUAL_HEALTH_CONTENT_SCHEMA, description: "All text fields in English" },
  },
  required: ["healthScore", "riskLevel", "bn", "en"],
};

export async function generateHealthReport(
  prescription: Prescription,
  labReports: LabReport[],
  _language: Language
): Promise<{ healthReport: HealthReport; lifestyleDirections: LifestyleDirections }> {
  void _language;
  const ai = getClient();
  const model = DEFAULT_MODEL;

  const langInstr = `BILINGUAL OUTPUT RULE: Return a "bn" object with ALL text fields in Bangla and an "en" object with ALL text fields in English. healthScore and riskLevel sit outside these objects.`;

  const prescriptionText = `
Doctor: ${prescription.doctorName}
Patient: ${prescription.patientName}
Date: ${prescription.date}
Medicines:
${prescription.medicines.map(m => `- ${m.name} (${m.dose}, ${m.schedule}): ${m.purpose}`).join("\n")}
`.trim();

  const labText = labReports.map(report => `
Lab Report: ${report.type} (${report.date})
${report.biomarkers.map(b => `- ${b.name}: ${b.value} ${b.unit} [Normal: ${b.normalMin}-${b.normalMax}] STATUS: ${b.status.toUpperCase()}`).join("\n")}
`).join("\n---\n");

  const interaction = await ai.interactions.create({
    model,
    input: [
      {
        type: "text",
        text: `You are an expert medical AI assistant analyzing a patient's complete doctor visit records.

PRESCRIPTION:
${prescriptionText}

LAB REPORTS:
${labText}

Based on this data, provide a comprehensive health analysis:

1. HEALTH SCORE (0-100): Calculate based on how many biomarkers are abnormal and severity
   - 80-100: Good health, minor issues
   - 60-79: Moderate issues needing attention
   - 40-59: Multiple concerning issues
   - Below 40: Serious issues requiring urgent care

2. RISK LEVEL: low/medium/high based on overall assessment

3. SUMMARY: Clear explanation of the patient's health status

4. CONDITIONS: List of identified medical conditions (e.g., Type 2 Diabetes, Hypertension, Hypercholesterolemia)

5. PRESCRIPTION EXPLANATION: Explain specifically how each prescribed medicine addresses the lab results
   (e.g., "Metformin was prescribed because HbA1c was 8.2% indicating uncontrolled diabetes")

6. FOLLOW UP: Specific recommendation for next doctor visit

7. LIFESTYLE DIRECTIONS (personalized to THIS patient's specific lab results):
   - Diet: Specific foods to avoid/eat based on their high/low biomarkers
   - Exercise: Appropriate exercise given their conditions
   - Medication: Tips for taking their specific medicines correctly
   - Sleep: Sleep recommendation
   - Warnings: Specific symptoms to watch for given their conditions

${langInstr}

Return only valid JSON.`,
      },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: HEALTH_REPORT_SCHEMA,
    },
  });

  const outputText = interaction.output_text;
  if (!outputText) throw new Error("No response from Gemini");

  const cleaned = outputText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);

  const now = new Date().toISOString();

  const bn = parsed.bn || parsed; // fallback to root for old API responses
  const en = parsed.en || parsed;
  const lsBn = bn.lifestyle || {};
  const lsEn = en.lifestyle || {};

  const healthReport: HealthReport = {
    // Primary (bn) for backward compat
    summary: String(bn.summary || ""),
    conditions: Array.isArray(bn.conditions) ? bn.conditions.map(String) : [],
    prescriptionExplanation: String(bn.prescriptionExplanation || ""),
    riskLevel: (["low", "medium", "high"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium") as HealthReport["riskLevel"],
    healthScore: Math.max(0, Math.min(100, Number(parsed.healthScore) || 50)),
    followUpNote: bn.followUpNote ? String(bn.followUpNote) : undefined,
    generatedAt: now,
    // Bilingual
    summaryBn: String(bn.summary || ""),
    summaryEn: String(en.summary || ""),
    conditionsBn: Array.isArray(bn.conditions) ? bn.conditions.map(String) : [],
    conditionsEn: Array.isArray(en.conditions) ? en.conditions.map(String) : [],
    prescriptionExplanationBn: String(bn.prescriptionExplanation || ""),
    prescriptionExplanationEn: String(en.prescriptionExplanation || ""),
    followUpNoteBn: bn.followUpNote ? String(bn.followUpNote) : undefined,
    followUpNoteEn: en.followUpNote ? String(en.followUpNote) : undefined,
  };

  const lifestyleDirections: LifestyleDirections = {
    // Primary (bn) for backward compat
    diet: Array.isArray(lsBn.diet) ? lsBn.diet.map(String) : [],
    exercise: Array.isArray(lsBn.exercise) ? lsBn.exercise.map(String) : [],
    medication: Array.isArray(lsBn.medication) ? lsBn.medication.map(String) : [],
    sleep: String(lsBn.sleep || ""),
    warnings: Array.isArray(lsBn.warnings) ? lsBn.warnings.map(String) : [],
    generatedAt: now,
    // Bilingual
    dietBn: Array.isArray(lsBn.diet) ? lsBn.diet.map(String) : [],
    dietEn: Array.isArray(lsEn.diet) ? lsEn.diet.map(String) : [],
    exerciseBn: Array.isArray(lsBn.exercise) ? lsBn.exercise.map(String) : [],
    exerciseEn: Array.isArray(lsEn.exercise) ? lsEn.exercise.map(String) : [],
    medicationBn: Array.isArray(lsBn.medication) ? lsBn.medication.map(String) : [],
    medicationEn: Array.isArray(lsEn.medication) ? lsEn.medication.map(String) : [],
    sleepBn: String(lsBn.sleep || ""),
    sleepEn: String(lsEn.sleep || ""),
    warningsBn: Array.isArray(lsBn.warnings) ? lsBn.warnings.map(String) : [],
    warningsEn: Array.isArray(lsEn.warnings) ? lsEn.warnings.map(String) : [],
  };

  return { healthReport, lifestyleDirections };
}

// ─── Progress Comparison Generator ───────────────────────────────────────────

const PROGRESS_CONTENT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2-3 sentence summary of overall health change" },
    improved: { type: "array", items: { type: "string" }, description: "Things that got better" },
    worsened: { type: "array", items: { type: "string" }, description: "Things that got worse" },
    unchanged: { type: "array", items: { type: "string" }, description: "Things unchanged" },
    prescriptionChanges: { type: "array", items: { type: "string" }, description: "Notable changes in medicine" },
    doctorAdvice: { type: "string", description: "Key advice based on progress" },
  },
  required: ["summary", "improved", "worsened", "unchanged", "prescriptionChanges", "doctorAdvice"],
};

const PROGRESS_SCHEMA = {
  type: "object",
  properties: {
    overallTrend: { type: "string", description: "improving | stable | worsening" },
    scoreChange: { type: "number", description: "Change in health score: positive = better, negative = worse" },
    bn: { ...PROGRESS_CONTENT_SCHEMA, description: "All text fields in Bangla" },
    en: { ...PROGRESS_CONTENT_SCHEMA, description: "All text fields in English" },
  },
  required: ["overallTrend", "scoreChange", "bn", "en"],
};

export async function generateProgressReport(
  previousVisit: Visit,
  currentVisit: Visit,
  _language: Language
): Promise<ProgressReport> {
  void _language;
  const ai = getClient();
  const model = DEFAULT_MODEL;
  const langInstr = `BILINGUAL OUTPUT RULE: Return a "bn" object with ALL text in Bangla and an "en" object with ALL text in English. overallTrend and scoreChange sit outside these objects.`;

  const formatVisit = (v: Visit, label: string) => {
    const lines: string[] = [`=== ${label} (${v.visitDate}) ===`];
    if (v.prescriptions.length > 0) {
      v.prescriptions.forEach((rx, i) => {
        lines.push(`Prescription page ${i + 1} by ${rx.doctorName}:`);
        rx.medicines.forEach((m) => lines.push(`  - ${m.name} (${m.schedule}): ${m.purpose}`));
      });
    }
    if (v.labReports.length > 0) {
      v.labReports.forEach(r => {
        lines.push(`Lab: ${r.type} (${r.date})`);
        r.biomarkers.forEach(b => lines.push(`  - ${b.name}: ${b.value} ${b.unit} [${b.normalMin}-${b.normalMax}] ${b.status.toUpperCase()}`));
      });
    }
    if (v.healthReport) {
      lines.push(`Health Score: ${v.healthReport.healthScore}/100, Risk: ${v.healthReport.riskLevel}`);
    }
    return lines.join("\n");
  };

  const interaction = await ai.interactions.create({
    model,
    input: [
      {
        type: "text",
        text: `You are a medical AI comparing two consecutive doctor visits for the same patient.

${formatVisit(previousVisit, "PREVIOUS VISIT")}

${formatVisit(currentVisit, "CURRENT VISIT (Follow-up)")}

Compare these visits and analyze the patient's health progress:

1. OVERALL TREND: Has the patient's health improved, stayed stable, or worsened?
2. SCORE CHANGE: Estimate health score change (positive = improved, negative = worsened). Range: -50 to +50.
3. SUMMARY: Clear 2-3 sentence summary of the patient's progress.
4. IMPROVED: Specific things that got better (lab values, symptoms, etc.)
5. WORSENED: Specific things that got worse
6. UNCHANGED: Things that remained the same
7. PRESCRIPTION CHANGES: Notable changes in medicines (new medicines added, removed, or dose changed)
8. DOCTOR ADVICE: Key takeaways and advice for the patient going forward

${langInstr}
Return only valid JSON.`,
      },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: PROGRESS_SCHEMA,
    },
  });

  const outputText = interaction.output_text;
  if (!outputText) throw new Error("No response from Gemini");

  const cleaned = outputText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);

  const pBn = parsed.bn || parsed;
  const pEn = parsed.en || parsed;

  return {
    overallTrend: (["improving", "stable", "worsening"].includes(parsed.overallTrend) ? parsed.overallTrend : "stable") as ProgressReport["overallTrend"],
    scoreChange: Number(parsed.scoreChange) || 0,
    // Primary (bn) for backward compat
    summary: String(pBn.summary || ""),
    improved: Array.isArray(pBn.improved) ? pBn.improved.map(String) : [],
    worsened: Array.isArray(pBn.worsened) ? pBn.worsened.map(String) : [],
    unchanged: Array.isArray(pBn.unchanged) ? pBn.unchanged.map(String) : [],
    prescriptionChanges: Array.isArray(pBn.prescriptionChanges) ? pBn.prescriptionChanges.map(String) : [],
    doctorAdvice: String(pBn.doctorAdvice || ""),
    generatedAt: new Date().toISOString(),
    // Bilingual
    summaryBn: String(pBn.summary || ""),
    summaryEn: String(pEn.summary || ""),
    improvedBn: Array.isArray(pBn.improved) ? pBn.improved.map(String) : [],
    improvedEn: Array.isArray(pEn.improved) ? pEn.improved.map(String) : [],
    worsenedBn: Array.isArray(pBn.worsened) ? pBn.worsened.map(String) : [],
    worsenedEn: Array.isArray(pEn.worsened) ? pEn.worsened.map(String) : [],
    unchangedBn: Array.isArray(pBn.unchanged) ? pBn.unchanged.map(String) : [],
    unchangedEn: Array.isArray(pEn.unchanged) ? pEn.unchanged.map(String) : [],
    prescriptionChangesBn: Array.isArray(pBn.prescriptionChanges) ? pBn.prescriptionChanges.map(String) : [],
    prescriptionChangesEn: Array.isArray(pEn.prescriptionChanges) ? pEn.prescriptionChanges.map(String) : [],
    doctorAdviceBn: String(pBn.doctorAdvice || ""),
    doctorAdviceEn: String(pEn.doctorAdvice || ""),
  };
}

const BLOG_ARTICLE_SCHEMA = {
  type: "object",
  properties: {
    slug: { type: "string", description: "URL slug in English lowercase with hyphens e.g. pcos-ultrasound-guide" },
    titleBn: { type: "string", description: "Catchy Bangla title for Bangladeshi patients" },
    titleEn: { type: "string", description: "English title" },
    excerptBn: { type: "string", description: "2-3 sentence Bangla summary for blog listing" },
    excerptEn: { type: "string", description: "2-3 sentence English summary" },
    contentBn: {
      type: "string",
      description: "Full article in simple Bangla, 800-1200 words, use \\n\\n between paragraphs, include headings with ## prefix",
    },
    contentEn: {
      type: "string",
      description: "Full article in simple English, same structure",
    },
  },
  required: ["slug", "titleBn", "titleEn", "excerptBn", "excerptEn", "contentBn", "contentEn"],
};

export interface GeneratedBlogArticle {
  slug: string;
  titleBn: string;
  titleEn: string;
  excerptBn: string;
  excerptEn: string;
  contentBn: string;
  contentEn: string;
}

export async function generateBlogArticle(topic: string): Promise<GeneratedBlogArticle> {
  const ai = getClient();
  const model = DEFAULT_MODEL;

  const interaction = await ai.interactions.create({
    model,
    input: [
      {
        type: "text",
        text: `You are a health content writer for "স্বাস্থ্য সাথী" — a Bangladesh digital health app.

Write an SEO-friendly, educational blog article about: "${topic}"

AUDIENCE: Bangladeshi patients with limited medical knowledge. Write in VERY SIMPLE Bangla (contentBn) and clear English (contentEn).

RULES:
- Educational only — not a substitute for a doctor
- Calm, helpful tone — no fear-mongering
- Explain medical terms in parentheses once
- contentBn/contentEn: 800-1200 words, paragraphs separated by blank lines
- Use ## for section headings within content (e.g. ## এর মানে কী?)
- Include practical tips and when to see a doctor
- slug: short English URL slug, lowercase, hyphens only

Return JSON matching the schema.`,
      },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: BLOG_ARTICLE_SCHEMA,
    },
  });

  const outputText = interaction.output_text;
  if (!outputText) throw new Error("No response from Gemini");

  const cleaned = outputText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as GeneratedBlogArticle;

  return {
    slug: String(parsed.slug || "article").slice(0, 80),
    titleBn: String(parsed.titleBn || topic),
    titleEn: String(parsed.titleEn || topic),
    excerptBn: String(parsed.excerptBn || ""),
    excerptEn: String(parsed.excerptEn || ""),
    contentBn: String(parsed.contentBn || ""),
    contentEn: String(parsed.contentEn || ""),
  };
}

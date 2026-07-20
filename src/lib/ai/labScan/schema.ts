/**
 * Lab report JSON schema + parsers shared by the production scan pipeline.
 */

export const LAB_BIOMARKER_SCHEMA = {
  type: "object",
  properties: {
    nameBn: {
      type: "string",
      description:
        "Simple Bangla test/measurement name as on the report e.g. সাদা রক্ত কোষ, হিমোগ্লোবিন, জরায়ুর দৈর্ঘ্য",
    },
    nameEn: {
      type: "string",
      description:
        "English name as on the report e.g. White Blood Cells, Hemoglobin, Uterus Length",
    },
    value: {
      type: "number",
      description:
        "Numeric value EXACTLY as printed. Never invent, round, estimate, or convert.",
    },
    unit: {
      type: "string",
      description:
        "Unit EXACTLY as printed (mg/dL, mm, cm, ml, etc.). Never convert. If unclear: Not clearly visible",
    },
    hasReferenceRange: {
      type: "boolean",
      description:
        "true ONLY when the report prints usable numeric reference limits for THIS value. false when absent — never invent a range to make this true.",
    },
    normalRange: {
      type: "object",
      description:
        "Printed reference {min,max} ONLY when hasReferenceRange=true. When no printed reference: OMIT this field entirely (do not invent). Post-process treats missing as null.",
      properties: {
        min: {
          type: "number",
          description: "Lower limit exactly as printed",
        },
        max: {
          type: "number",
          description: "Upper limit exactly as printed",
        },
        text: {
          type: "string",
          description: "Exact printed range string when available",
        },
      },
      required: ["min", "max"],
    },
    normalMin: {
      type: "number",
      description:
        "Lower reference bound ONLY if printed. Same as normalRange.min. Omit when no printed reference.",
    },
    normalMax: {
      type: "number",
      description:
        "Upper reference bound ONLY if printed. Same as normalRange.max. Omit when no printed reference.",
    },
    flag: {
      type: "string",
      description:
        "Explicit printed flag only: H, L, High, Low, ↑, ↓, Normal, N — or empty string if none. Never invent.",
    },
  },
  required: ["nameBn", "nameEn", "value", "unit", "hasReferenceRange"],
} as const;

export const LAB_FINDING_SCHEMA = {
  type: "object",
  properties: {
    titleBn: {
      type: "string",
      description: "Organ/section name in simple Bangla",
    },
    titleEn: {
      type: "string",
      description: "English title e.g. Uterus, Impression, Conclusion",
    },
    detailBn: {
      type: "string",
      description:
        "Calm doctor-style Bangla (~60–120 words if abnormal): what it is, why it matters, what this result means, whether to worry. Everyday words from visible text only. If unclear: Not clearly visible",
    },
    detailEn: {
      type: "string",
      description:
        "Same calm doctor-style English (~60–120 words if abnormal). No robotic AI openers. From visible text only. If unclear: Not clearly visible",
    },
    status: {
      type: "string",
      enum: ["normal", "concern", "info"],
      description:
        "normal if report says OK; concern if abnormal/follow-up; else info. Never escalate beyond the report.",
    },
  },
  required: ["titleBn", "titleEn", "detailBn", "detailEn", "status"],
} as const;

const bilingualSection = {
  type: "object",
  properties: {
    bn: { type: "string" },
    en: { type: "string" },
  },
  required: ["bn", "en"],
} as const;

export const LAB_REPORT_SCHEMA = {
  type: "object",
  properties: {
    typeBn: {
      type: "string",
      description: "Report type in simple Bangla. If unclear: Not clearly visible",
    },
    typeEn: {
      type: "string",
      description: "Report type in English. If unclear: Not clearly visible",
    },
    date: {
      type: "string",
      description: "YYYY-MM-DD or Not clearly visible",
    },
    summaryBn: { type: "string" },
    summaryEn: { type: "string" },
    meaningBn: { type: "string" },
    meaningEn: { type: "string" },
    nextStepsBn: { type: "array", items: { type: "string" } },
    nextStepsEn: { type: "array", items: { type: "string" } },
    findings: {
      type: "array",
      items: LAB_FINDING_SCHEMA,
      description: "Every visible finding — never invent, never skip",
    },
    biomarkers: {
      type: "array",
      items: LAB_BIOMARKER_SCHEMA,
      description:
        "EVERY measurable value in exact report order. Never skip rows. Empty only if no numbers. normalRange=null when no printed reference.",
    },
    confidence: {
      type: "number",
      description: "OCR/extraction confidence 0–100",
    },
    imageQuality: {
      type: "string",
      enum: ["excellent", "good", "fair", "poor", "unreadable"],
    },
    impression: bilingualSection,
    conclusion: bilingualSection,
    recommendation: bilingualSection,
    ocrWarnings: { type: "array", items: { type: "string" } },
    uncertainFindings: { type: "array", items: { type: "string" } },
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
    "confidence",
    "imageQuality",
    "impression",
    "conclusion",
    "recommendation",
    "ocrWarnings",
    "uncertainFindings",
  ],
} as const;

export const IMAGE_QUALITY_VALUES = [
  "excellent",
  "good",
  "fair",
  "poor",
  "unreadable",
] as const;

export type GeminiImageQuality = (typeof IMAGE_QUALITY_VALUES)[number];

export interface ParsedLabGeminiJson {
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
  confidence?: number;
  imageQuality?: unknown;
  impression?: unknown;
  conclusion?: unknown;
  recommendation?: unknown;
  ocrWarnings?: unknown;
  uncertainFindings?: unknown;
}

export function parseBilingualSection(raw: unknown): { bn: string; en: string } {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return {
      bn: String(obj.bn ?? obj.textBn ?? ""),
      en: String(obj.en ?? obj.textEn ?? ""),
    };
  }
  if (typeof raw === "string") return { bn: raw, en: raw };
  return { bn: "", en: "" };
}

export function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter((s) => s.trim().length > 0);
}

export function parseImageQuality(raw: unknown): GeminiImageQuality | undefined {
  if (typeof raw !== "string") return undefined;
  return (IMAGE_QUALITY_VALUES as readonly string[]).includes(raw)
    ? (raw as GeminiImageQuality)
    : undefined;
}

export function parseGeminiLabJson(text: string): ParsedLabGeminiJson {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  let parsed: ParsedLabGeminiJson;
  try {
    parsed = JSON.parse(cleaned) as ParsedLabGeminiJson;
  } catch {
    throw new Error("Malformed JSON from Gemini");
  }

  if ((!parsed.typeBn && !parsed.typeEn && !parsed.type) || !parsed.date) {
    throw new Error("Invalid response structure from Gemini");
  }

  if (!Array.isArray(parsed.biomarkers)) parsed.biomarkers = [];
  if (!Array.isArray(parsed.findings)) parsed.findings = [];

  return parsed;
}

export function parseFindings(
  raw: Record<string, unknown>[]
): Array<{
  titleBn: string;
  titleEn: string;
  detailBn: string;
  detailEn: string;
  status: "normal" | "concern" | "info";
}> {
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

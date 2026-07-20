/**
 * Rule-based report type detector.
 * Classifies from extracted report text only — no AI call, no medical guessing.
 */

export const DETECTED_REPORT_TYPES = [
  "CBC",
  "Urine",
  "Pregnancy_USG",
  "TVS",
  "Whole_Abdomen",
  "Pelvic_USG",
  "Xray",
  "CT",
  "MRI",
  "Histopathology",
  "Lipid",
  "LFT",
  "KFT",
  "Hormone",
  "Thyroid",
  "Prescription",
  "Other",
] as const;

export type DetectedReportType = (typeof DETECTED_REPORT_TYPES)[number];

export interface ReportTypeDetectorInput {
  typeBn?: string;
  typeEn?: string;
  summaryBn?: string;
  summaryEn?: string;
  meaningBn?: string;
  meaningEn?: string;
  impression?: { bn?: string; en?: string } | string;
  conclusion?: { bn?: string; en?: string } | string;
  recommendation?: { bn?: string; en?: string } | string;
  findings?: Array<{
    titleBn?: string;
    titleEn?: string;
    detailBn?: string;
    detailEn?: string;
  }>;
  biomarkers?: Array<{
    name?: string;
    nameBn?: string;
    nameEn?: string;
    unit?: string;
  }>;
  /** Optional extra OCR / raw text if available */
  rawText?: string;
}

type Rule = {
  type: DetectedReportType;
  /** Higher = more specific; wins ties against broader categories */
  priority: number;
  patterns: RegExp[];
  /** Minimum distinct pattern hits required (default 1) */
  minHits?: number;
};

function sectionText(section: { bn?: string; en?: string } | string | undefined): string {
  if (!section) return "";
  if (typeof section === "string") return section;
  return `${section.bn ?? ""} ${section.en ?? ""}`;
}

/** Normalize extracted fields into one searchable corpus. */
export function buildReportTextCorpus(input: ReportTypeDetectorInput): string {
  const parts: string[] = [
    input.typeBn ?? "",
    input.typeEn ?? "",
    input.summaryBn ?? "",
    input.summaryEn ?? "",
    input.meaningBn ?? "",
    input.meaningEn ?? "",
    sectionText(input.impression),
    sectionText(input.conclusion),
    sectionText(input.recommendation),
    input.rawText ?? "",
  ];

  for (const f of input.findings ?? []) {
    parts.push(f.titleBn ?? "", f.titleEn ?? "", f.detailBn ?? "", f.detailEn ?? "");
  }

  for (const b of input.biomarkers ?? []) {
    parts.push(b.name ?? "", b.nameBn ?? "", b.nameEn ?? "", b.unit ?? "");
  }

  return parts.join("\n").toLowerCase();
}

/**
 * Ordered from most specific to broadest within related families.
 * Matching uses report text only — if nothing matches, returns Other.
 */
const RULES: Rule[] = [
  {
    type: "TVS",
    priority: 100,
    patterns: [
      /\btvs\b/,
      /\btrans\-?\s*vaginal\b/,
      /\btransvaginal\b/,
      /\btv\s*usg\b/,
      /\btv\s*sono/,
      /ট্রান্স\s*ভ্যাজাইনাল/,
    ],
  },
  {
    type: "Pregnancy_USG",
    priority: 95,
    patterns: [
      /\bobstetric\b/,
      /\bantenatal\b/,
      /\bpregnancy\s*(usg|ultrasound|sono)/,
      /\bgestational\s*sac\b/,
      /\bfetal\s*(heart|pole|biometry|age)\b/,
      /\bcrl\b/,
      /\bg\.?\s*a\.?\b.*\bweeks?\b/,
      /\biup\b/,
      /গর্ভকালীন/,
      /প্রেগনেন্সি/,
    ],
  },
  {
    type: "Pelvic_USG",
    priority: 90,
    patterns: [
      /\bpelvic\s*(usg|ultrasound|sono|scan)\b/,
      /\bultra\s*sono(?:gram|graphy)?\s*(of\s*)?(the\s*)?pelvis\b/,
      /\blower\s*abdomen\s*(usg|ultrasound|sono)/,
      /\busg\s*(of\s*)?(l\/a|lower\s*abdomen)\b/,
      /পেলভিক/,
      /নিম্ন\s*পেট/,
    ],
  },
  {
    type: "Whole_Abdomen",
    priority: 88,
    patterns: [
      /\bwhole\s*abdomen\b/,
      /\bw\/?a\s*(usg|ultrasound|sono)/,
      /\bultra\s*sono(?:gram|graphy)?\s*(of\s*)?(the\s*)?whole\s*abdomen\b/,
      /\bupper\s*(and\s*)?lower\s*abdomen\s*(usg|ultrasound)/,
      /\babdomen\s*(usg|ultrasound|sono)/,
      /সম্পূর্ণ\s*পেট/,
      /হোল\s*অ্যাবডোমেন/,
    ],
  },
  {
    type: "MRI",
    priority: 85,
    patterns: [/\bmri\b/, /\bmagnetic\s*resonance\b/, /এমআরআই/],
  },
  {
    type: "CT",
    priority: 84,
    patterns: [
      /\bct\s*scan\b/,
      /\bct\s*abdomen\b/,
      /\bct\s*chest\b/,
      /\bcomputed\s*tomograph/,
      /\bhrct\b/,
      /সিটি\s*স্ক্যান/,
    ],
  },
  {
    type: "Xray",
    priority: 80,
    patterns: [
      /\bx[\-\s]?ray\b/,
      /\bradiograph\b/,
      /\bchest\s*x[\-\s]?ray\b/,
      /\bcxr\b/,
      /এক্স[\-\s]?রে/,
    ],
  },
  {
    type: "Histopathology",
    priority: 78,
    patterns: [
      /\bhistopatholog/,
      /\bhpe\b/,
      /\bbiopsy\b/,
      /\bfnac\b/,
      /\bcytolog/,
      /\bpathology\s*report\b/,
      /হিস্টোপ্যাথ/,
      /বায়োপসি/,
    ],
  },
  {
    type: "Lipid",
    priority: 70,
    minHits: 1,
    patterns: [
      /\blipid\s*profile\b/,
      /\blipid\s*panel\b/,
      /\btotal\s*cholesterol\b/,
      /\bhdl\b/,
      /\bldl\b/,
      /\btriglyceride/,
      /\bvldl\b/,
      /লিপিড/,
    ],
  },
  {
    type: "LFT",
    priority: 70,
    minHits: 1,
    patterns: [
      /\blft\b/,
      /\bliver\s*function\b/,
      /\bsgpt\b/,
      /\bsgot\b/,
      /\balt\b/,
      /\bast\b/,
      /\bbilirubin\b/,
      /\balkaline\s*phosphatase\b/,
      /\balp\b/,
      /লিভার\s*ফাংশন/,
    ],
  },
  {
    type: "KFT",
    priority: 70,
    minHits: 1,
    patterns: [
      /\bkft\b/,
      /\brft\b/,
      /\bkidney\s*function\b/,
      /\brenal\s*function\b/,
      /\bcreatinine\b/,
      /\bblood\s*urea\b/,
      /\bbun\b/,
      /\begfr\b/,
      /কিডনি\s*ফাংশন/,
    ],
  },
  {
    type: "Thyroid",
    priority: 68,
    minHits: 1,
    patterns: [
      /\bthyroid\s*(profile|function|panel)\b/,
      /\btsh\b/,
      /\bfree\s*t[34]\b/,
      /\bt3\b/,
      /\bt4\b/,
      /\bft3\b/,
      /\bft4\b/,
      /থাইরয়েড/,
    ],
  },
  {
    type: "Hormone",
    priority: 65,
    minHits: 1,
    patterns: [
      /\bhormone\s*(profile|panel|assay)\b/,
      /\bfsh\b/,
      /\blh\b/,
      /\bprolactin\b/,
      /\bamh\b/,
      /\btestosterone\b/,
      /\bestradiol\b/,
      /\be2\b/,
      /\bprogesterone\b/,
      /\bbeta\s*hcg\b/,
      /হরমোন/,
    ],
  },
  {
    type: "CBC",
    priority: 60,
    minHits: 2,
    patterns: [
      /\bcbc\b/,
      /\bcomplete\s*blood\s*count\b/,
      /\bfull\s*blood\s*count\b/,
      /\bhemoglobin\b/,
      /\bhb\b/,
      /\bwbc\b/,
      /\brbc\b/,
      /\bplatelet/,
      /\bhaematocrit\b/,
      /\bhematocrit\b/,
      /\bmcv\b/,
      /\bmchc\b/,
      /\bneutrophil/,
      /\blymphocyte/,
      /সম্পূর্ণ\s*রক্ত/,
      /হিমোগ্লোবিন/,
    ],
  },
  {
    type: "Urine",
    priority: 58,
    minHits: 1,
    patterns: [
      /\burine\s*(r\/?e|routine|analysis|exam)/,
      /\burinalysis\b/,
      /\bue\b/,
      /\burine\s*for\s*r\/?e\b/,
      /\bpus\s*cells\b/,
      /\bepithelial\s*cells\b/,
      /প্রস্রাব/,
      /ইউরিন/,
    ],
  },
  {
    type: "Prescription",
    priority: 50,
    minHits: 2,
    patterns: [
      /\brx\b/,
      /\bprescription\b/,
      /\btab\.?\b/,
      /\bcaps?\.?\b/,
      /\bsyp\.?\b/,
      /\bsig:?\s*/,
      /\b1\+0\+1\b/,
      /\b1\+1\+1\b/,
      /\bafter\s*meal/,
      /প্রেসক্রিপশন/,
      /খাবারের\s*(আগে|পরে)/,
    ],
  },
];

function countHits(text: string, patterns: RegExp[]): number {
  let hits = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) hits += 1;
  }
  return hits;
}

/**
 * Detect report type from extracted report text.
 * Returns Other when evidence is insufficient — never guesses from medical assumptions.
 */
export function detectReportType(input: ReportTypeDetectorInput): DetectedReportType {
  const text = buildReportTextCorpus(input);
  if (!text.trim()) return "Other";

  let best: { type: DetectedReportType; score: number; priority: number } | null = null;

  for (const rule of RULES) {
    const hits = countHits(text, rule.patterns);
    const minHits = rule.minHits ?? 1;
    if (hits < minHits) continue;

    // Score = hits weighted by priority so specific labels win over broad panels
    const score = hits * 10 + rule.priority;
    if (
      !best ||
      score > best.score ||
      (score === best.score && rule.priority > best.priority)
    ) {
      best = { type: rule.type, score, priority: rule.priority };
    }
  }

  return best?.type ?? "Other";
}

export function isDetectedReportType(value: unknown): value is DetectedReportType {
  return typeof value === "string" && (DETECTED_REPORT_TYPES as readonly string[]).includes(value);
}

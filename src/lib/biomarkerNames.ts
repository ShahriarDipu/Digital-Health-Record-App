import type { LabBiomarker, LabReport } from "@/store/useAppStore";
import type { Language } from "@/lib/translations";

/** Simple Bangla names patients can understand — keyed by normalized English */
const BIOMARKER_BN: Record<string, string> = {
  "white blood cells": "সাদা রক্ত কোষ",
  wbc: "সাদা রক্ত কোষ",
  neutrophils: "নিউট্রোফিল",
  neutrophil: "নিউট্রোফিল",
  "neutrophil%": "নিউট্রোফিল (%)",
  lymphocyte: "লিম্ফোসাইট",
  lymphocytes: "লিম্ফোসাইট",
  "lymphocyte%": "লিম্ফোসাইট (%)",
  monocyte: "মনোসাইট",
  monocytes: "মনোসাইট",
  "monocyte%": "মনোসাইট (%)",
  eosinophil: "ইওসিনোফিল",
  eosinophils: "ইওসিনোফিল",
  "eosinophil%": "ইওসিনোফিল (%)",
  basophil: "বেসোফিল",
  basophils: "বেসোফিল",
  "basophil%": "বেসোফিল (%)",
  "red blood cells": "লাল রক্ত কোষ",
  rbc: "লাল রক্ত কোষ",
  hemoglobin: "হিমোগ্লোবিন",
  hb: "হিমোগ্লোবিন",
  hematocrit: "হিমাটোক্রিট",
  hct: "হিমাটোক্রিট",
  platelets: "প্লেটলেট",
  plt: "প্লেটলেট",
  mcv: "গড় লাল কোষের আকার",
  mch: "গড় হিমোগ্লোবিন",
  mchc: "হিমোগ্লোবিন ঘনত্ব",
  rdw: "লাল কোষের আকারের পার্থক্য",
  esr: "অবসাদ হার",
  "erythrocyte sedimentation rate": "অবসাদ হার",
  glucose: "রক্তে শর্করা",
  "fasting glucose": "খালি পেটে শর্করা",
  "random glucose": "রক্তে শর্করা",
  "blood sugar": "রক্তে শর্করা",
  hba1c: "গ্লাইকেটেড হিমোগ্লোবিন",
  "glycated hemoglobin": "গ্লাইকেটেড হিমোগ্লোবিন",
  cholesterol: "কোলেস্টেরল",
  "total cholesterol": "মোট কোলেস্টেরল",
  ldl: "খারাপ কোলেস্টেরল (LDL)",
  hdl: "ভালো কোলেস্টেরল (HDL)",
  triglycerides: "ট্রাইগ্লিসারাইড",
  tg: "ট্রাইগ্লিসারাইড",
  creatinine: "ক্রিয়েটিনিন",
  urea: "ইউরিয়া",
  bun: "রক্তে ইউরিয়া",
  "uric acid": "ইউরিক অ্যাসিড",
  alt: "লিভার এনজাইম (ALT)",
  ast: "লিভার এনজাইম (AST)",
  sgpt: "লিভার এনজাইম (SGPT)",
  sgot: "লিভার এনজাইম (SGOT)",
  bilirubin: "বিলিরুবিন",
  "total bilirubin": "মোট বিলিরুবিন",
  albumin: "অ্যালবুমিন",
  protein: "মোট প্রোটিন",
  "total protein": "মোট প্রোটিন",
  tsh: "থাইরয়েড হরমোন (TSH)",
  t3: "থাইরয়েড T3",
  t4: "থাইরয়েড T4",
  "vitamin d": "ভিটামিন ডি",
  "vitamin b12": "ভিটামিন বি১২",
  iron: "লৌহ (আয়রন)",
  ferritin: "ফেরিটিন",
  sodium: "সোডিয়াম",
  potassium: "পটাশিয়াম",
  chloride: "ক্লোরাইড",
  calcium: "ক্যালসিয়াম",
  phosphorus: "ফসফরাস",
  magnesium: "ম্যাগনেসিয়াম",
  crp: "সংক্রমণ মার্কার (CRP)",
  "c-reactive protein": "সংক্রমণ মার্কার (CRP)",
  psa: "প্রোস্টেট মার্কার (PSA)",
  "prostate specific antigen": "প্রোস্টেট মার্কার (PSA)",
};

const REPORT_TYPE_BN: Record<string, string> = {
  cbc: "সম্পূর্ণ রক্ত গণনা (CBC)",
  "complete blood count": "সম্পূর্ণ রক্ত গণনা",
  "cbc, esr": "সম্পূর্ণ রক্ত গণনা ও অবসাদ",
  esr: "অবসাদ হার পরীক্ষা",
  "lipid profile": "কোলেস্টেরল পরীক্ষা",
  "lipid panel": "কোলেস্টেরল পরীক্ষা",
  "diabetes profile": "ডায়াবেটিস পরীক্ষা",
  "liver function test": "লিভার পরীক্ষা",
  lft: "লিভার পরীক্ষা",
  "kidney function test": "কিডনি পরীক্ষা",
  kft: "কিডনি পরীক্ষা",
  "renal function test": "কিডনি পরীক্ষা",
  "thyroid profile": "থাইরয়েড পরীক্ষা",
  "urine routine": "প্রস্রাব পরীক্ষা",
  "urine analysis": "প্রস্রাব পরীক্ষা",
};

function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function lookupBiomarkerBn(englishName: string): string | undefined {
  const key = normalizeKey(englishName);
  if (BIOMARKER_BN[key]) return BIOMARKER_BN[key];

  // Partial match: "White Blood Cells (WBC)" -> white blood cells
  for (const [pattern, bn] of Object.entries(BIOMARKER_BN)) {
    if (key.includes(pattern) || pattern.includes(key)) return bn;
  }
  return undefined;
}

function lookupReportTypeBn(type: string): string | undefined {
  const key = normalizeKey(type);
  if (REPORT_TYPE_BN[key]) return REPORT_TYPE_BN[key];
  for (const [pattern, bn] of Object.entries(REPORT_TYPE_BN)) {
    if (key.includes(pattern)) return bn;
  }
  return undefined;
}

export function getBiomarkerDisplayName(b: LabBiomarker, lang: Language): string {
  if (lang === "bn") {
    return b.nameBn || lookupBiomarkerBn(b.nameEn || b.name) || b.name;
  }
  return b.nameEn || b.name;
}

function coerceOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/,/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Usable printed numeric limits for comparison charts. */
export function hasValidNumericRange(
  min?: number,
  max?: number
): boolean {
  const lo = coerceOptionalNumber(min);
  const hi = coerceOptionalNumber(max);
  if (lo == null || hi == null) return false;
  if (lo === 0 && hi === 0) return false;
  return lo <= hi;
}

/**
 * Ultrasound / imaging size measurements — reports rarely print a normal range.
 * Never show comparison charts for these even if the model invents limits.
 */
export function isImagingSizeMeasurement(name: string): boolean {
  return /fibroid|myoma|gall\s*stone|kidney\s*stone|renal\s*stone|stone\s*size|polyp|ovary|ovarian|uterus|uterine|placenta|cervix|endometri|follicle|nodule|cyst|mass|lesion|fibroi|\bCRL\b|\bBPD\b|\bAFI\b|\bNT\b|uterus\s*length|ovary\s*volume|organ\s*dimension|dimension[s]?\b|\blength\b|\bwidth\b|\bdiameter\b|\bthickness\b|measurement\s*of|size\s*of|ultrasound|sonograph|\busg\b|ফাইব্র|পাথর|জরায়ু|ডিম্ব|ডিম্বাশয়|সিস্ট|এন্ডোমেট্র|প্লাসেন্টা|সার্ভিক্স|গর্ভাশয়|পরিমাপ|দৈর্ঘ্য|প্রস্থ|ব্যাস|পুরুত্ব|আকার/i.test(
    name
  );
}

function biomarkerNameBlob(b: LabBiomarker): string {
  return `${b.nameEn ?? ""} ${b.nameBn ?? ""} ${b.name}`;
}

const IMAGING_REPORT_TYPES = new Set([
  "Pregnancy_USG",
  "TVS",
  "Whole_Abdomen",
  "Pelvic_USG",
  "Xray",
  "CT",
  "MRI",
  "ultrasound",
  "xray",
]);

/** USG / radiology reports — size measurements should not use comparison charts. */
export function isImagingLabReport(report?: Pick<LabReport, "reportType" | "type" | "typeBn" | "typeEn">): boolean {
  if (!report) return false;
  const rt = report.reportType ?? "";
  if (IMAGING_REPORT_TYPES.has(rt)) return true;
  const blob = `${report.typeBn ?? ""} ${report.typeEn ?? ""} ${report.type ?? ""}`;
  return /ultrasound|usg|sonograph|sonography|x-?ray|mri|\bct\b|tvs|pelvic|pregnancy|একো|সনোগ্রাফ|আল্ট্রাসাউন্ড|এক্স-?রে/i.test(
    blob
  );
}

/**
 * Show comparison chart ONLY when the report printed real numeric limits.
 * Default is false — never chart on missing/invalid range or imaging values.
 */
export function canShowBiomarkerChart(
  b: LabBiomarker,
  report?: Pick<LabReport, "reportType" | "type" | "typeBn" | "typeEn">
): boolean {
  if (report && isImagingLabReport(report)) return false;
  if (isImagingSizeMeasurement(biomarkerNameBlob(b))) return false;
  if (b.hasReferenceRange !== true) return false;
  const min = coerceOptionalNumber(b.normalMin);
  const max = coerceOptionalNumber(b.normalMax);
  return hasValidNumericRange(min, max);
}

/** @deprecated Use canShowBiomarkerChart */
export function biomarkerHasReferenceRange(
  b: LabBiomarker,
  report?: Pick<LabReport, "reportType" | "type" | "typeBn" | "typeEn">
): boolean {
  return canShowBiomarkerChart(b, report);
}

/** Status badges only when a real comparison range exists. */
export function biomarkerShowsStatusBadge(b: LabBiomarker): boolean {
  return biomarkerHasReferenceRange(b);
}

/**
 * Strip invented / invalid reference data before display or persistence.
 * No-range values → name + value + unit only (no chart, no fake normal badge).
 */
export function sanitizeLabBiomarker(
  b: LabBiomarker,
  report?: Pick<LabReport, "reportType" | "type" | "typeBn" | "typeEn">
): LabBiomarker {
  const min = coerceOptionalNumber(b.normalMin);
  const max = coerceOptionalNumber(b.normalMax);
  const allowChart = canShowBiomarkerChart(
    {
      ...b,
      normalMin: min,
      normalMax: max,
    },
    report
  );

  if (!allowChart) {
    const rest = { ...b };
    delete rest.normalMin;
    delete rest.normalMax;
    const flag = (b.flag ?? "").trim();
    const hasPrintedFlag = /^(h|l|high|low|n|normal|↑|↓)$/i.test(flag);
    return {
      ...rest,
      hasReferenceRange: false,
      status: hasPrintedFlag ? b.status : "normal",
    };
  }

  return {
    ...b,
    hasReferenceRange: true,
    normalMin: min,
    normalMax: max,
  };
}

export function sanitizeLabReport(report: LabReport): LabReport {
  return {
    ...report,
    biomarkers: report.biomarkers.map((b) => sanitizeLabBiomarker(b, report)),
  };
}

/** Biomarkers that may appear in overview bar charts. */
export function getChartableBiomarkers(report: LabReport): LabBiomarker[] {
  return report.biomarkers
    .map((b) => sanitizeLabBiomarker(b, report))
    .filter((b) => canShowBiomarkerChart(b, report));
}

/** Short label for charts */
export function getBiomarkerShortName(b: LabBiomarker, lang: Language): string {
  const full = getBiomarkerDisplayName(b, lang);
  if (lang === "bn") return full.split("(")[0].trim();
  return full.split(" ")[0];
}

export function getLabReportTypeName(report: LabReport, lang: Language): string {
  if (lang === "bn") {
    return report.typeBn || lookupReportTypeBn(report.typeEn || report.type) || report.type;
  }
  return report.typeEn || report.type;
}

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

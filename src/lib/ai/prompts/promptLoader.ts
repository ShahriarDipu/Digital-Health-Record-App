/**
 * Prompt Loader — maps reportType → specialized prompt template.
 *
 * Extending later (only two steps):
 * 1. Create one new prompt file under src/lib/ai/prompts/
 * 2. Add one mapping entry in REPORT_TYPE_PROMPT_MAP below
 *
 * Unknown / unsupported types → fallback.ts (never throws).
 */

import { FALLBACK_PROMPT, fallbackPromptModule } from "./fallback";
import type { MedicalPromptModule } from "./base";

// Blood
import { CBC_PROMPT, cbcPromptModule } from "./blood/cbc";
import { LIPID_PROFILE_PROMPT, lipidProfilePromptModule } from "./blood/lipidProfile";
import { BLOOD_SUGAR_PROMPT, bloodSugarPromptModule } from "./blood/bloodSugar";
import { LIVER_FUNCTION_PROMPT, liverFunctionPromptModule } from "./blood/liverFunction";
import { KIDNEY_FUNCTION_PROMPT, kidneyFunctionPromptModule } from "./blood/kidneyFunction";
import { THYROID_PROFILE_PROMPT, thyroidProfilePromptModule } from "./blood/thyroidProfile";
import { HORMONE_PROMPT, hormonePromptModule } from "./blood/hormone";

// Ultrasound
import {
  PREGNANCY_ULTRASOUND_PROMPT,
  pregnancyUltrasoundPromptModule,
} from "./ultrasound/pregnancyUltrasound";
import { ANOMALY_SCAN_PROMPT, anomalyScanPromptModule } from "./ultrasound/anomalyScan";
import { GROWTH_SCAN_PROMPT, growthScanPromptModule } from "./ultrasound/growthScan";
import { TVS_PROMPT, tvsPromptModule } from "./ultrasound/tvs";
import { FOLLICULOMETRY_PROMPT, folliculometryPromptModule } from "./ultrasound/folliculometry";
import {
  PELVIC_ULTRASOUND_PROMPT,
  pelvicUltrasoundPromptModule,
} from "./ultrasound/pelvicUltrasound";
import { WHOLE_ABDOMEN_PROMPT, wholeAbdomenPromptModule } from "./ultrasound/wholeAbdomen";
import {
  BREAST_ULTRASOUND_PROMPT,
  breastUltrasoundPromptModule,
} from "./ultrasound/breastUltrasound";
import {
  THYROID_ULTRASOUND_PROMPT,
  thyroidUltrasoundPromptModule,
} from "./ultrasound/thyroidUltrasound";

// Radiology
import { XRAY_PROMPT, xrayPromptModule } from "./radiology/xray";
import { CT_PROMPT, ctPromptModule } from "./radiology/ct";
import { MRI_PROMPT, mriPromptModule } from "./radiology/mri";

// Other
import { URINE_PROMPT, urinePromptModule } from "./other/urine";
import { STOOL_PROMPT, stoolPromptModule } from "./other/stool";
import { ECG_PROMPT, ecgPromptModule } from "./other/ecg";
import { ECHO_PROMPT, echoPromptModule } from "./other/echo";
import { HISTOPATHOLOGY_PROMPT, histopathologyPromptModule } from "./other/histopathology";
import { BIOPSY_PROMPT, biopsyPromptModule } from "./other/biopsy";
import { SEMEN_ANALYSIS_PROMPT, semenAnalysisPromptModule } from "./other/semenAnalysis";

export interface LoadedPrompt {
  /** Input report type string */
  reportType: string;
  /** Prompt module id that was loaded */
  promptId: string;
  /** Full prompt template text */
  prompt: string;
  /** True when fallback.ts was used */
  usedFallback: boolean;
  /** Module metadata */
  module: MedicalPromptModule;
}

type PromptEntry = {
  prompt: string;
  module: MedicalPromptModule;
};

/**
 * Single extendable map: reportType → prompt file contents.
 * Add one entry here when introducing a new report type.
 */
export const REPORT_TYPE_PROMPT_MAP: Record<string, PromptEntry> = {
  // ── Canonical loader keys (examples from product spec) ──
  CBC: { prompt: CBC_PROMPT, module: cbcPromptModule },
  Urine: { prompt: URINE_PROMPT, module: urinePromptModule },
  PregnancyUltrasound: {
    prompt: PREGNANCY_ULTRASOUND_PROMPT,
    module: pregnancyUltrasoundPromptModule,
  },
  AnomalyScan: { prompt: ANOMALY_SCAN_PROMPT, module: anomalyScanPromptModule },
  GrowthScan: { prompt: GROWTH_SCAN_PROMPT, module: growthScanPromptModule },
  TVS: { prompt: TVS_PROMPT, module: tvsPromptModule },
  Folliculometry: {
    prompt: FOLLICULOMETRY_PROMPT,
    module: folliculometryPromptModule,
  },
  PelvicUltrasound: {
    prompt: PELVIC_ULTRASOUND_PROMPT,
    module: pelvicUltrasoundPromptModule,
  },
  WholeAbdomen: {
    prompt: WHOLE_ABDOMEN_PROMPT,
    module: wholeAbdomenPromptModule,
  },
  BreastUltrasound: {
    prompt: BREAST_ULTRASOUND_PROMPT,
    module: breastUltrasoundPromptModule,
  },
  ThyroidUltrasound: {
    prompt: THYROID_ULTRASOUND_PROMPT,
    module: thyroidUltrasoundPromptModule,
  },
  LipidProfile: {
    prompt: LIPID_PROFILE_PROMPT,
    module: lipidProfilePromptModule,
  },
  BloodSugar: { prompt: BLOOD_SUGAR_PROMPT, module: bloodSugarPromptModule },
  LiverFunction: {
    prompt: LIVER_FUNCTION_PROMPT,
    module: liverFunctionPromptModule,
  },
  KidneyFunction: {
    prompt: KIDNEY_FUNCTION_PROMPT,
    module: kidneyFunctionPromptModule,
  },
  ThyroidProfile: {
    prompt: THYROID_PROFILE_PROMPT,
    module: thyroidProfilePromptModule,
  },
  Hormone: { prompt: HORMONE_PROMPT, module: hormonePromptModule },
  Xray: { prompt: XRAY_PROMPT, module: xrayPromptModule },
  CT: { prompt: CT_PROMPT, module: ctPromptModule },
  MRI: { prompt: MRI_PROMPT, module: mriPromptModule },
  ECG: { prompt: ECG_PROMPT, module: ecgPromptModule },
  Echo: { prompt: ECHO_PROMPT, module: echoPromptModule },
  Histopathology: {
    prompt: HISTOPATHOLOGY_PROMPT,
    module: histopathologyPromptModule,
  },
  Biopsy: { prompt: BIOPSY_PROMPT, module: biopsyPromptModule },
  SemenAnalysis: {
    prompt: SEMEN_ANALYSIS_PROMPT,
    module: semenAnalysisPromptModule,
  },
  Stool: { prompt: STOOL_PROMPT, module: stoolPromptModule },
  Other: { prompt: FALLBACK_PROMPT, module: fallbackPromptModule },

  // ── Aliases (reportTypeDetector + common variants) ──
  Pregnancy_USG: {
    prompt: PREGNANCY_ULTRASOUND_PROMPT,
    module: pregnancyUltrasoundPromptModule,
  },
  Pelvic_USG: {
    prompt: PELVIC_ULTRASOUND_PROMPT,
    module: pelvicUltrasoundPromptModule,
  },
  Whole_Abdomen: {
    prompt: WHOLE_ABDOMEN_PROMPT,
    module: wholeAbdomenPromptModule,
  },
  Lipid: { prompt: LIPID_PROFILE_PROMPT, module: lipidProfilePromptModule },
  LFT: { prompt: LIVER_FUNCTION_PROMPT, module: liverFunctionPromptModule },
  KFT: { prompt: KIDNEY_FUNCTION_PROMPT, module: kidneyFunctionPromptModule },
  Thyroid: {
    prompt: THYROID_PROFILE_PROMPT,
    module: thyroidProfilePromptModule,
  },
  Prescription: { prompt: FALLBACK_PROMPT, module: fallbackPromptModule },
};

export type PromptLoaderReportType = keyof typeof REPORT_TYPE_PROMPT_MAP;

function lookupEntry(reportType: string): PromptEntry | undefined {
  const key = reportType.trim();
  if (!key) return undefined;

  const exact = REPORT_TYPE_PROMPT_MAP[key];
  if (exact) return exact;

  const lower = key.toLowerCase();
  for (const [mappedKey, entry] of Object.entries(REPORT_TYPE_PROMPT_MAP)) {
    if (mappedKey.toLowerCase() === lower) return entry;
  }

  return undefined;
}

/**
 * Load the correct prompt template for a reportType.
 *
 * CBC → cbc.ts
 * Urine → urine.ts
 * PregnancyUltrasound → pregnancyUltrasound.ts
 * Other / unknown → fallback.ts
 *
 * Never throws.
 */
export function loadPrompt(reportType: string | null | undefined): string {
  return loadPromptWithMeta(reportType).prompt;
}

/**
 * Load prompt template plus metadata. Never throws.
 */
export function loadPromptWithMeta(
  reportType: string | null | undefined
): LoadedPrompt {
  const raw = reportType == null ? "" : String(reportType);
  const entry = lookupEntry(raw);

  if (entry) {
    return {
      reportType: raw || "Other",
      promptId: entry.module.id,
      prompt: entry.prompt,
      usedFallback: entry.module.id === "fallback",
      module: entry.module,
    };
  }

  return {
    reportType: raw || "Other",
    promptId: "fallback",
    prompt: FALLBACK_PROMPT,
    usedFallback: true,
    module: fallbackPromptModule,
  };
}

/**
 * Whether this reportType has a specialized (non-fallback) mapping.
 */
export function hasSpecializedPrompt(
  reportType: string | null | undefined
): boolean {
  if (reportType == null) return false;
  const entry = lookupEntry(String(reportType));
  return Boolean(entry && entry.module.id !== "fallback");
}

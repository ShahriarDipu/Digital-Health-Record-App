/**
 * Medical report prompt library.
 *
 * Architecture:
 * - Every specialized prompt extends BASE_MEDICAL_PROMPT.
 * - Register new prompts by adding a module file + one entry in PROMPT_MODULES.
 * - Existing prompt files do not need edits when adding new ones.
 * - getPromptById / resolvePrompt fall back to FALLBACK_PROMPT when unknown.
 *
 * NOTE: Not wired to the scanner yet (by design for this step).
 */

import type { MedicalPromptModule } from "./base";
import { FALLBACK_PROMPT, fallbackPromptModule } from "./fallback";

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

export { BASE_MEDICAL_PROMPT, type MedicalPromptModule, type MedicalPromptId } from "./base";
export { FALLBACK_PROMPT, fallbackPromptModule } from "./fallback";
export {
  OCR_EXTRACTION_RULES,
  OCR_EXTRACTION_REMINDER,
} from "./ocrExtraction";
export {
  BIOMARKER_EXTRACTION_RULES,
  BIOMARKER_EXTRACTION_REMINDER,
} from "./biomarkerExtraction";
export {
  PATIENT_SUMMARY_RULES,
  PATIENT_SUMMARY_REMINDER,
} from "./patientSummary";
export {
  PATIENT_EXPLANATION_STYLE_RULES,
  PATIENT_EXPLANATION_STYLE_REMINDER,
} from "./patientExplanationStyle";
export {
  PATIENT_NEXT_STEPS_RULES,
  PATIENT_NEXT_STEPS_REMINDER,
  NEXT_STEPS_DISCLAIMER_EN,
  NEXT_STEPS_DISCLAIMER_BN,
} from "./patientNextSteps";

export {
  CBC_PROMPT,
  LIPID_PROFILE_PROMPT,
  BLOOD_SUGAR_PROMPT,
  LIVER_FUNCTION_PROMPT,
  KIDNEY_FUNCTION_PROMPT,
  THYROID_PROFILE_PROMPT,
  HORMONE_PROMPT,
  PREGNANCY_ULTRASOUND_PROMPT,
  ANOMALY_SCAN_PROMPT,
  GROWTH_SCAN_PROMPT,
  TVS_PROMPT,
  FOLLICULOMETRY_PROMPT,
  PELVIC_ULTRASOUND_PROMPT,
  WHOLE_ABDOMEN_PROMPT,
  BREAST_ULTRASOUND_PROMPT,
  THYROID_ULTRASOUND_PROMPT,
  XRAY_PROMPT,
  CT_PROMPT,
  MRI_PROMPT,
  URINE_PROMPT,
  STOOL_PROMPT,
  ECG_PROMPT,
  ECHO_PROMPT,
  HISTOPATHOLOGY_PROMPT,
  BIOPSY_PROMPT,
  SEMEN_ANALYSIS_PROMPT,
};

/**
 * Ordered registry of specialized prompts.
 * Add new modules here only — do not edit existing prompt files to register them.
 */
export const PROMPT_MODULES: readonly MedicalPromptModule[] = [
  cbcPromptModule,
  lipidProfilePromptModule,
  bloodSugarPromptModule,
  liverFunctionPromptModule,
  kidneyFunctionPromptModule,
  thyroidProfilePromptModule,
  hormonePromptModule,
  pregnancyUltrasoundPromptModule,
  anomalyScanPromptModule,
  growthScanPromptModule,
  tvsPromptModule,
  folliculometryPromptModule,
  pelvicUltrasoundPromptModule,
  wholeAbdomenPromptModule,
  breastUltrasoundPromptModule,
  thyroidUltrasoundPromptModule,
  xrayPromptModule,
  ctPromptModule,
  mriPromptModule,
  urinePromptModule,
  stoolPromptModule,
  ecgPromptModule,
  echoPromptModule,
  histopathologyPromptModule,
  biopsyPromptModule,
  semenAnalysisPromptModule,
  // fallback is last / separate — used when no id matches
] as const;

const PROMPT_BY_ID: ReadonlyMap<string, MedicalPromptModule> = new Map(
  [...PROMPT_MODULES, fallbackPromptModule].map((m) => [m.id, m])
);

/** Look up a prompt by id. Returns undefined if unknown (caller may use fallback). */
export function getPromptModule(id: string): MedicalPromptModule | undefined {
  return PROMPT_BY_ID.get(id);
}

/** Resolve prompt text by id; unknown ids automatically use fallback.ts */
export function resolvePrompt(id: string | null | undefined): string {
  if (!id) return FALLBACK_PROMPT;
  return PROMPT_BY_ID.get(id)?.prompt ?? FALLBACK_PROMPT;
}

/** Convenience: always-safe prompt text for unmatched reports */
export function getFallbackPrompt(): string {
  return FALLBACK_PROMPT;
}

/** List all registered specialized prompt ids (excludes fallback). */
export function listPromptIds(): string[] {
  return PROMPT_MODULES.map((m) => m.id);
}

// Prompt Loader (reportType → template). Safe to re-export; loader does not import this file.
export {
  loadPrompt,
  loadPromptWithMeta,
  hasSpecializedPrompt,
  REPORT_TYPE_PROMPT_MAP,
  type LoadedPrompt,
  type PromptLoaderReportType,
} from "./promptLoader";

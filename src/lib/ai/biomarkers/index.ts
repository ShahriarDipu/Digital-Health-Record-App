/**
 * Biomarker extraction accuracy module.
 *
 * Prompt rules (for Gemini) + TypeScript normalizer (post-response).
 * Does not modify scanner logic or API routes by itself.
 *
 * Example:
 *   const { biomarkers } = normalizeBiomarkers(geminiJson.biomarkers);
 *   // normalRange: null when not printed; status from flag or full range only
 */

export type {
  AccurateBiomarker,
  BiomarkerFlag,
  BiomarkerStatus,
  NormalRange,
  NormalizeBiomarkersResult,
} from "./types";

export {
  parseReferenceRangeText,
  normalRangeFromLimits,
} from "./parseReferenceRange";

export {
  parseBiomarkerFlag,
  statusFromFlag,
  statusFromRange,
  resolveBiomarkerStatus,
} from "./parseFlag";

export {
  normalizeBiomarkers,
  parseExactNumber,
  toNullableLegacyBiomarkers,
} from "./normalizeBiomarkers";

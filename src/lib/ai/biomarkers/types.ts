/**
 * Accurate biomarker types for post-Gemini normalization.
 * normalRange is null when the report does not print a reference range.
 */

export type BiomarkerFlag =
  | "H"
  | "L"
  | "High"
  | "Low"
  | "↑"
  | "↓"
  | "Normal"
  | "N"
  | null;

export type BiomarkerStatus = "high" | "low" | "normal" | "unknown";

export interface NormalRange {
  min: number;
  max: number;
  /** Exact printed range text when available */
  text?: string;
}

/**
 * Clean structured biomarker — never invents missing ranges.
 */
export interface AccurateBiomarker {
  nameBn: string;
  nameEn: string;
  /** Exact numeric value; decimals preserved as parsed from text when possible */
  value: number;
  /** Exact unit string as on the report */
  unit: string;
  /** null when the report did not provide a reference range */
  normalRange: NormalRange | null;
  /** Explicit flag from the report, if any */
  flag: BiomarkerFlag;
  /**
   * high/low from explicit flag, or calculated only when BOTH limits exist.
   * unknown when neither flag nor full range is available.
   */
  status: BiomarkerStatus;
  /** 0-based order as on the report */
  order: number;
}

export interface NormalizeBiomarkersResult {
  biomarkers: AccurateBiomarker[];
  /** Rows skipped because value/name was invalid — never invent replacements */
  skipped: string[];
  warnings: string[];
}

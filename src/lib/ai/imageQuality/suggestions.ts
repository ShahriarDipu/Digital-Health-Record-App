/**
 * Map detected issue codes to helpful capture suggestions.
 */

import { QUALITY_SUGGESTIONS, type ImageQualityIssueCode } from "./types";

const ORDER: ImageQualityIssueCode[] = [
  "blur",
  "too_dark",
  "too_bright",
  "glare",
  "cropped",
  "missing_edges",
  "rotated",
  "low_resolution",
  "small_text",
  "multiple_reports",
];

export function buildSuggestions(
  issueCodes: ImageQualityIssueCode[]
): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  const add = (text: string) => {
    if (!seen.has(text)) {
      seen.add(text);
      suggestions.push(text);
    }
  };

  for (const code of ORDER) {
    if (!issueCodes.includes(code)) continue;
    switch (code) {
      case "blur":
        add(QUALITY_SUGGESTIONS.blur);
        break;
      case "too_dark":
        add(QUALITY_SUGGESTIONS.too_dark);
        break;
      case "too_bright":
        add(QUALITY_SUGGESTIONS.too_bright);
        break;
      case "glare":
        add(QUALITY_SUGGESTIONS.glare);
        break;
      case "cropped":
      case "missing_edges":
        add(QUALITY_SUGGESTIONS.cropped);
        break;
      case "rotated":
        add(QUALITY_SUGGESTIONS.rotated);
        break;
      case "low_resolution":
        add(QUALITY_SUGGESTIONS.low_resolution);
        break;
      case "small_text":
        add(QUALITY_SUGGESTIONS.small_text);
        break;
      case "multiple_reports":
        add(QUALITY_SUGGESTIONS.multiple_reports);
        break;
      default:
        break;
    }
  }

  if (issueCodes.length > 0) {
    add(QUALITY_SUGGESTIONS.general);
  }

  return suggestions;
}

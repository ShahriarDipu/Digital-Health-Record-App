/**
 * PII anonymization for learning records.
 * Never store patient name, phone, address, hospital/report IDs, or other PII.
 */

const PII_PATTERNS: RegExp[] = [
  // Phone (BD + international-ish)
  /(?:\+?88)?[\s\-]?01[3-9]\d{8}/g,
  /\+?\d{10,15}/g,
  // Email
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // NID-like long digit runs
  /\b\d{10,17}\b/g,
  // Common ID labels
  /\b(patient\s*(id|no\.?|number)|hospital\s*(id|no\.?)|report\s*(id|no\.?)|mrn|reg\.?\s*no\.?)\s*[:#]?\s*[A-Za-z0-9\-\/]+/gi,
  /\b(নাম|রোগীর\s*নাম|মোবাইল|ঠিকানা)\s*[:：]?\s*[^\n,|;]+/gi,
  // Address-ish
  /\b(address|village|road|house|থানা|জেলা|উপজেলা)\s*[:#]?\s*[^\n]+/gi,
];

const NAME_LINE =
  /\b(patient\s*name|name\s*of\s*patient|pt\.?\s*name)\s*[:#]?\s*[^\n,|;]+/gi;

export function stripPii(text: string): string {
  if (!text) return "";
  let out = text;
  out = out.replace(NAME_LINE, "Patient name: [REDACTED]");
  for (const pattern of PII_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  // Age/sex alone are generally OK; redact DOB-like dates with names nearby already covered
  return out.replace(/\s{2,}/g, " ").trim();
}

export function fingerprintText(text: string, maxLen = 80): string {
  const cleaned = stripPii(text)
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLen);
}

export function anonymizeLabBrand(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = stripPii(raw)
    .replace(/\b(ltd|limited|diagnostic|lab|laboratory|hospital|clinic)\b/gi, "")
    .replace(/[^a-zA-Z\u0980-\u09FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (cleaned.length < 3) return undefined;
  // Keep only a short brand token — no registration numbers
  return cleaned.split(" ").slice(0, 3).join("_").slice(0, 40);
}

/** Keys that must never be persisted from a report object */
export const FORBIDDEN_PII_KEYS = new Set([
  "patientName",
  "patient",
  "phone",
  "mobile",
  "address",
  "hospitalId",
  "reportId",
  "patientId",
  "mrn",
  "nid",
  "email",
  "imageUrl",
  "base64",
  "rawImage",
]);

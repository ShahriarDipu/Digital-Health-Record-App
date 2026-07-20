export const SAVE_INTENT_REASONS = [
  "compare",
  "show_doctor",
  "never_search",
  "other",
] as const;

export type SaveIntentReason = (typeof SAVE_INTENT_REASONS)[number];

export type SaveIntentSource = "lab_report" | "prescription";

/** Prescription modal hides "compare" (lab-only reason). */
export function saveIntentReasonsForSource(
  source: SaveIntentSource
): readonly SaveIntentReason[] {
  if (source === "prescription") {
    return SAVE_INTENT_REASONS.filter((r) => r !== "compare");
  }
  return SAVE_INTENT_REASONS;
}

export type SaveIntentFeedbackEntry = {
  id: string;
  reasons: SaveIntentReason[];
  choseHealthRecord: boolean;
  source: SaveIntentSource;
  createdAt: string;
};

export const SAVE_INTENT_REASON_LABELS_EN: Record<SaveIntentReason, string> = {
  compare: "Compare today's report with future reports",
  show_doctor: "Show all reports and conditions to a new doctor in one click",
  never_search: "Keep all reports and prescriptions in one place",
  other: "I need reports ready for emergencies",
};

export const SAVE_INTENT_REASON_LABELS_BN: Record<SaveIntentReason, string> = {
  compare: "ভবিষ্যতের রিপোর্টের সাথে আজকের রিপোর্ট তুলনা করতে চাই",
  show_doctor: "নতুন ডাক্তারকে সব report, condition এক ক্লিকে দেখাতে চাই",
  never_search: "সব রিপোর্ট ও প্রেসক্রিপশন এক জায়গায় রাখতে চাই",
  other: "Emergency সময় রিপোর্ট দরকার তাই",
};

export function isSaveIntentReason(value: string): value is SaveIntentReason {
  return (SAVE_INTENT_REASONS as readonly string[]).includes(value);
}

export function formatSaveIntentReasons(
  reasons: string[],
  language: "bn" | "en" = "en"
): string {
  const labels =
    language === "bn" ? SAVE_INTENT_REASON_LABELS_BN : SAVE_INTENT_REASON_LABELS_EN;
  const mapped = reasons
    .filter(isSaveIntentReason)
    .map((r) => labels[r]);
  return mapped.length > 0 ? mapped.join(" · ") : "—";
}

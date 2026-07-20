const BN_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

export function normalizeDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
}

export function parseReminderTime(timeStr: string): { hours: number; minutes: number } | null {
  const normalized = normalizeDigits(timeStr.trim());

  const englishMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (englishMatch) {
    let hours = parseInt(englishMatch[1], 10);
    const minutes = parseInt(englishMatch[2], 10);
    const period = englishMatch[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return { hours, minutes };
  }

  const bengaliMatch = normalized.match(/(সকাল|দুপুর|বিকাল|রাত)\s*(\d{1,2}):(\d{2})/);
  if (bengaliMatch) {
    const period = bengaliMatch[1];
    let hours = parseInt(bengaliMatch[2], 10);
    const minutes = parseInt(bengaliMatch[3], 10);

    if (period === "সকাল") {
      if (hours === 12) hours = 0;
    } else if (period === "দুপুর" || period === "বিকাল") {
      if (hours !== 12) hours += 12;
    } else if (period === "রাত") {
      if (hours >= 1 && hours <= 11) hours += 12;
      if (hours === 12) hours = 0;
    }

    return { hours, minutes };
  }

  return null;
}

export function getMinutesFromMidnight(timeStr: string): number | null {
  const parsed = parseReminderTime(timeStr);
  if (!parsed) return null;
  return parsed.hours * 60 + parsed.minutes;
}

export function sortReminderTimes(times: string[]): string[] {
  return [...times].sort((a, b) => {
    const aMinutes = getMinutesFromMidnight(a) ?? 0;
    const bMinutes = getMinutesFromMidnight(b) ?? 0;
    return aMinutes - bMinutes;
  });
}

export type TimePeriod = "AM" | "PM";

export function timePartsFromString(
  timeStr: string
): { hour: number; minute: number; period: TimePeriod } | null {
  const parsed = parseReminderTime(timeStr);
  if (!parsed) return null;

  let hour12 = parsed.hours % 12;
  if (hour12 === 0) hour12 = 12;
  const period: TimePeriod = parsed.hours >= 12 ? "PM" : "AM";
  return { hour: hour12, minute: parsed.minutes, period };
}

function toBengaliDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
}

function bengaliPeriodLabel(hours24: number): string {
  if (hours24 >= 5 && hours24 < 12) return "সকাল";
  if (hours24 >= 12 && hours24 < 16) return "দুপুর";
  if (hours24 >= 16 && hours24 < 19) return "বিকাল";
  return "রাত";
}

export function formatReminderTime(
  hour: number,
  minute: number,
  period: TimePeriod,
  isBn: boolean
): string {
  let hours24 = hour % 12;
  if (period === "PM" && hour !== 12) hours24 += 12;
  if (period === "AM" && hour === 12) hours24 = 0;
  if (period === "PM" && hour === 12) hours24 = 12;

  if (isBn) {
    const label = bengaliPeriodLabel(hours24);
    return `${label} ${toBengaliDigits(hour)}:${toBengaliDigits(
      minute.toString().padStart(2, "0")
    )}`;
  }

  return `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
}

export function defaultTimeParts(): { hour: number; minute: number; period: TimePeriod } {
  const now = new Date();
  let hour = now.getHours() % 12;
  if (hour === 0) hour = 12;
  const minute = now.getMinutes();
  const period: TimePeriod = now.getHours() >= 12 ? "PM" : "AM";
  return { hour, minute, period };
}

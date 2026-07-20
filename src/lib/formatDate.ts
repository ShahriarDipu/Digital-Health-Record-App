import type { Language } from "@/lib/translations";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

const MONTHS_BN = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toBnNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** SSR-safe date label — same output on server and client */
export function formatBlogDate(iso: string, language: Language): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  if (language === "bn") {
    return `${toBnNumber(day)} ${MONTHS_BN[month]}, ${toBnNumber(year)}`;
  }

  return `${MONTHS_EN[month]} ${day}, ${year}`;
}

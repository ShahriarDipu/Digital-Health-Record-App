export interface PhoneCountry {
  iso: string;
  dial: string;
  flag: string;
  nameBn: string;
  nameEn: string;
  placeholder: string;
}

/** Common countries for diaspora users + Bangladesh */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "BD", dial: "880", flag: "🇧🇩", nameBn: "বাংলাদেশ", nameEn: "Bangladesh", placeholder: "1712345678" },
  { iso: "SA", dial: "966", flag: "🇸🇦", nameBn: "সৌদি আরব", nameEn: "Saudi Arabia", placeholder: "512345678" },
  { iso: "CA", dial: "1", flag: "🇨🇦", nameBn: "কানাডা", nameEn: "Canada", placeholder: "4165551234" },
  { iso: "US", dial: "1", flag: "🇺🇸", nameBn: "যুক্তরাষ্ট্র", nameEn: "United States", placeholder: "2025551234" },
  { iso: "AE", dial: "971", flag: "🇦🇪", nameBn: "সংযুক্ত আরব আমিরাত", nameEn: "UAE", placeholder: "501234567" },
  { iso: "GB", dial: "44", flag: "🇬🇧", nameBn: "যুক্তরাজ্য", nameEn: "United Kingdom", placeholder: "7911123456" },
  { iso: "MY", dial: "60", flag: "🇲🇾", nameBn: "মালয়েশিয়া", nameEn: "Malaysia", placeholder: "123456789" },
  { iso: "SG", dial: "65", flag: "🇸🇬", nameBn: "সিঙ্গাপুর", nameEn: "Singapore", placeholder: "81234567" },
  { iso: "IN", dial: "91", flag: "🇮🇳", nameBn: "ভারত", nameEn: "India", placeholder: "9876543210" },
  { iso: "QA", dial: "974", flag: "🇶🇦", nameBn: "কাতার", nameEn: "Qatar", placeholder: "33123456" },
  { iso: "KW", dial: "965", flag: "🇰🇼", nameBn: "কুয়েত", nameEn: "Kuwait", placeholder: "50123456" },
  { iso: "OM", dial: "968", flag: "🇴🇲", nameBn: "ওমান", nameEn: "Oman", placeholder: "92123456" },
  { iso: "BH", dial: "973", flag: "🇧🇭", nameBn: "বাহরাইন", nameEn: "Bahrain", placeholder: "36123456" },
  { iso: "AU", dial: "61", flag: "🇦🇺", nameBn: "অস্ট্রেলিয়া", nameEn: "Australia", placeholder: "412345678" },
  { iso: "IT", dial: "39", flag: "🇮🇹", nameBn: "ইতালি", nameEn: "Italy", placeholder: "3123456789" },
  { iso: "JP", dial: "81", flag: "🇯🇵", nameBn: "জাপান", nameEn: "Japan", placeholder: "9012345678" },
  { iso: "DE", dial: "49", flag: "🇩🇪", nameBn: "জার্মানি", nameEn: "Germany", placeholder: "15123456789" },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

export function getPhoneCountry(dial: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.dial === dial) ?? DEFAULT_PHONE_COUNTRY;
}

/** Build E.164-style digits only (no +) e.g. 8801712345678 */
export function normalizeWhatsAppNumber(
  countryDial: string,
  localNumber: string
): { ok: true; value: string } | { ok: false; errorBn: string; errorEn: string } {
  const dial = countryDial.replace(/\D/g, "");
  let local = localNumber.replace(/\D/g, "");

  if (!local) {
    return { ok: false, errorBn: "WhatsApp নম্বর দিন", errorEn: "Please enter a WhatsApp number" };
  }

  if (local.startsWith("0")) {
    local = local.replace(/^0+/, "");
  }

  const full = dial + local;

  if (full.length < 10 || full.length > 15) {
    return {
      ok: false,
      errorBn: "সঠিক WhatsApp নম্বর দিন (দেশ কোড ছাড়া)",
      errorEn: "Enter a valid WhatsApp number (without country code)",
    };
  }

  return { ok: true, value: full };
}

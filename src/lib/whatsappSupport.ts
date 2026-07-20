const DEFAULT_WHATSAPP_NUMBER = "8801760901550";

function normalizeWhatsAppNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function getWhatsAppSupportUrl(language: "bn" | "en"): string {
  const number = normalizeWhatsAppNumber(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
  );
  const message =
    language === "bn"
      ? "হ্যালো, স্বাস্থ্য সাথী অ্যাপ থেকে সাপোর্ট/ফিডব্যাক পাঠাচ্ছি।"
      : "Hi, I'm reaching out for support/feedback from Shastha Sathi app.";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppSupport(language: "bn" | "en"): void {
  window.open(getWhatsAppSupportUrl(language), "_blank", "noopener,noreferrer");
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PHONE_COUNTRIES,
  DEFAULT_PHONE_COUNTRY,
  getPhoneCountry,
  normalizeWhatsAppNumber,
} from "@/lib/phoneCountries";
import {
  Activity,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Languages,
  Phone,
  HelpCircle,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
import InfoModal from "@/components/InfoModal";
// SOCIAL LOGIN UI (disabled) — backend Google provider still active in auth.config.ts
// import GoogleIcon from "@/components/auth/GoogleIcon";

export interface AuthRegisterFormProps {
  variant?: "page" | "modal";
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function AuthRegisterForm({
  variant = "page",
  onSuccess,
  onSwitchToLogin,
}: AuthRegisterFormProps) {
  const router = useRouter();
  const { language, setLanguage } = useAppStore();
  const t = getT(language);
  const ta = t.auth;
  const isModal = variant === "modal";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsappCountryDial: DEFAULT_PHONE_COUNTRY.dial,
    whatsappLocalNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showWhatsappHelp, setShowWhatsappHelp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // const [googleLoading, setGoogleLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError(language === "bn" ? "পুরো নাম দিন" : "Please enter your full name");
      return;
    }
    if (!formData.email.trim()) {
      setError(language === "bn" ? "ইমেইল দিন" : "Please enter your email");
      return;
    }
    if (formData.password.length < 6) {
      setError(
        language === "bn" ? "পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে" : "Password must be at least 6 characters"
      );
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(language === "bn" ? "দুটো পাসওয়ার্ড মিলছে না" : "Passwords do not match");
      return;
    }

    let normalizedWhatsapp: string | undefined;
    if (formData.whatsappLocalNumber.trim()) {
      const result = normalizeWhatsAppNumber(formData.whatsappCountryDial, formData.whatsappLocalNumber);
      if (!result.ok) {
        setError(language === "bn" ? result.errorBn : result.errorEn);
        return;
      }
      normalizedWhatsapp = result.value;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          whatsappCountryDial: formData.whatsappCountryDial,
          whatsappLocalNumber: formData.whatsappLocalNumber,
          whatsappNumber: normalizedWhatsapp,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || (language === "bn" ? "রেজিস্ট্রেশন ব্যর্থ হয়েছে" : "Registration failed"));
        setLoading(false);
        return;
      }

      if (isModal) {
        const signInResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        if (signInResult?.error) {
          onSwitchToLogin?.();
          setLoading(false);
          return;
        }
        onSuccess?.();
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError(
        language === "bn" ? "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন" : "Something went wrong, please try again"
      );
      setLoading(false);
    }
  };

  // --- Google signup UI (uncomment to re-enable) ---
  // const handleGoogleSignup = async () => {
  //   setGoogleLoading(true);
  //   await signIn("google", { callbackUrl: "/dashboard" });
  // };

  const selectedCountry = getPhoneCountry(formData.whatsappCountryDial);
  const countryLabel = language === "bn" ? selectedCountry.nameBn : selectedCountry.nameEn;
  const fieldPy = isModal ? "py-2.5" : "py-3";
  const formGap = isModal ? "space-y-3" : "space-y-4";
  const labelMb = isModal ? "mb-1" : "mb-1.5";

  const card = (
    <div className={isModal ? "" : "bg-white rounded-3xl shadow-xl p-6 sm:p-8"}>
      {!isModal && (
        <>
          <h2 className="text-xl font-bold text-gray-800 mb-1">{ta.registerTitle}</h2>
          <p className="text-gray-500 text-sm mb-6">
            {language === "bn" ? "আপনার তথ্য দিয়ে অ্যাকাউন্ট খুলুন" : "Create an account with your details"}
          </p>
        </>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={formGap}>
        <div>
          <label className={`text-sm font-medium text-gray-700 ${labelMb} block`}>
            {ta.name} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={language === "bn" ? "যেমন: মোহাম্মদ আনিসুর রহমান" : "e.g. John Smith"}
              className={`w-full border border-gray-300 rounded-xl pl-10 pr-4 ${fieldPy} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
            />
          </div>
        </div>

        <div>
          <label className={`text-sm font-medium text-gray-700 ${labelMb} block`}>
            {ta.email} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="you@example.com"
              className={`w-full border border-gray-300 rounded-xl pl-10 pr-4 ${fieldPy} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
            />
          </div>
        </div>

        <div>
          <label className={`text-sm font-medium text-gray-700 ${labelMb} flex items-center gap-1.5`}>
            {ta.whatsapp}{" "}
            <span className="text-gray-400 font-normal text-xs">{ta.whatsappOptional}</span>
            <button
              type="button"
              onClick={() => setShowWhatsappHelp(true)}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0"
              aria-label={ta.whatsappHelpTitle}
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-shrink-0 w-[38%] sm:w-[42%]">
              <select
                value={formData.whatsappCountryDial}
                onChange={(e) => updateField("whatsappCountryDial", e.target.value)}
                className={`w-full h-full border border-gray-300 rounded-xl pl-2 pr-7 ${fieldPy} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white`}
                aria-label={ta.whatsappCountry}
              >
                {PHONE_COUNTRIES.map((c) => (
                  <option key={`${c.iso}-${c.dial}`} value={c.dial}>
                    {c.flag} +{c.dial}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-0">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={formData.whatsappLocalNumber}
                onChange={(e) => updateField("whatsappLocalNumber", e.target.value)}
                placeholder={selectedCountry.placeholder}
                className={`w-full border border-gray-300 rounded-xl pl-10 pr-4 ${fieldPy} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {countryLabel} · +{selectedCountry.dial} · {ta.whatsappPlaceholder}
          </p>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isModal ? "gap-3" : "gap-4"}`}>
          <div>
            <label className={`text-sm font-medium text-gray-700 ${labelMb} block`}>
              {ta.password} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                className={`w-full border border-gray-300 rounded-xl pl-10 pr-9 ${fieldPy} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium text-gray-700 ${labelMb} block`}>
              {language === "bn" ? "পুনরায় পাসওয়ার্ড" : "Confirm Password"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="••••••••"
                className={`w-full border border-gray-300 rounded-xl pl-10 pr-4 ${fieldPy} text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 transition-all ${
            isModal ? "py-3" : "py-3.5"
          }`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : ta.registerBtn}
        </button>
      </form>

      {/* --- Google signup UI (uncomment to re-enable) ---
      <div className={`flex items-center gap-3 ${isModal ? "my-3" : "my-5"}`}>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs">{language === "bn" ? "অথবা" : "or"}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={googleLoading}
        className={`w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-teal-300 hover:bg-gray-50 rounded-xl font-medium text-gray-700 transition-all disabled:opacity-60 ${
          isModal ? "py-2.5 text-sm" : "py-3"
        }`}
      >
        {googleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <GoogleIcon />
            {ta.googleRegisterBtn}
          </>
        )}
      </button>
      */}

      <p className={`text-center text-gray-500 text-sm ${isModal ? "mt-3" : "mt-6"}`}>
        {ta.hasAccount}{" "}
        {isModal && onSwitchToLogin ? (
          <button type="button" onClick={onSwitchToLogin} className="text-teal-600 font-bold hover:underline">
            {ta.loginLink}
          </button>
        ) : (
          <Link href="/login" className="text-teal-600 font-bold hover:underline">
            {ta.loginLink}
          </Link>
        )}
      </p>
    </div>
  );

  const whatsappModal = (
    <InfoModal
      open={showWhatsappHelp}
      onClose={() => setShowWhatsappHelp(false)}
      title={ta.whatsappHelpTitle}
      description={ta.whatsappHelpDesc}
      buttonLabel={ta.whatsappHelpOk}
    />
  );

  if (isModal) {
    return (
      <>
        {card}
        {whatsappModal}
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
            className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-colors shadow-sm"
          >
            <Languages className="w-4 h-4" />
            {language === "bn" ? "EN" : "বাং"}
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <Activity className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-800">{t.appName}</h1>
          <p className="text-gray-500 text-sm">{ta.registerSubtitle}</p>
        </div>

        {card}
        {whatsappModal}
      </div>
    </div>
  );
}

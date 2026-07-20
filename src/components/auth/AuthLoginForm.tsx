"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Languages } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { getT } from "@/lib/translations";
// SOCIAL LOGIN UI (disabled) — backend Google provider still active in auth.config.ts
// import GoogleIcon from "@/components/auth/GoogleIcon";

export interface AuthLoginFormProps {
  variant?: "page" | "modal";
  registered?: boolean;
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export default function AuthLoginForm({
  variant = "page",
  registered = false,
  onSuccess,
  onSwitchToRegister,
}: AuthLoginFormProps) {
  const router = useRouter();
  const { language, setLanguage } = useAppStore();
  const t = getT(language);
  const ta = t.auth;
  const isModal = variant === "modal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError(language === "bn" ? "ইমেইল ও পাসওয়ার্ড দিন" : "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(language === "bn" ? "ইমেইল বা পাসওয়ার্ড ভুল আছে" : "Incorrect email or password");
        setLoading(false);
        return;
      }

      onSuccess?.();
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(
        language === "bn" ? "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন" : "Something went wrong, please try again"
      );
      setLoading(false);
    }
  };

  // --- Google login UI (uncomment to re-enable) ---
  // const handleGoogleLogin = async () => {
  //   setGoogleLoading(true);
  //   await signIn("google", { callbackUrl: "/dashboard" });
  // };

  const card = (
    <div className={isModal ? "" : "bg-white rounded-3xl shadow-xl p-6 sm:p-8"}>
      {!isModal && (
        <>
          <h2 className="text-xl font-bold text-gray-800 mb-1">{ta.loginTitle}</h2>
          <p className="text-gray-500 text-sm mb-6">{ta.loginSubtitle}</p>
        </>
      )}

      {registered && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3 mb-4">
          {language === "bn" ? "✅ অ্যাকাউন্ট তৈরি হয়েছে। এখন লগইন করুন।" : "✅ Account created. Please login now."}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={isModal ? "space-y-3" : "space-y-4"}>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">{ta.email}</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full border border-gray-300 rounded-xl pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                isModal ? "py-2.5" : "py-3"
              }`}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">{ta.password}</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full border border-gray-300 rounded-xl pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                isModal ? "py-2.5" : "py-3"
              }`}
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

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 transition-all ${
            isModal ? "py-3" : "py-3.5"
          }`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : ta.loginBtn}
        </button>
      </form>

      {/* --- Google login UI (uncomment to re-enable) ---
      <div className={`flex items-center gap-3 ${isModal ? "my-3" : "my-5"}`}>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-gray-400 text-xs">{language === "bn" ? "অথবা" : "or"}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
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
            {ta.googleBtn}
          </>
        )}
      </button>
      */}

      <p className={`text-center text-gray-500 text-sm ${isModal ? "mt-3" : "mt-6"}`}>
        {ta.noAccount}{" "}
        {isModal && onSwitchToRegister ? (
          <button type="button" onClick={onSwitchToRegister} className="text-teal-600 font-bold hover:underline">
            {ta.registerLink}
          </button>
        ) : (
          <Link href="/register" className="text-teal-600 font-bold hover:underline">
            {ta.registerLink}
          </Link>
        )}
      </p>
    </div>
  );

  if (isModal) {
    return card;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4">
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
          <p className="text-gray-500 text-sm">{language === "bn" ? "আপনার ডিজিটাল হেলথ রেকর্ড" : t.appSubtitle}</p>
        </div>

        {card}
      </div>
    </div>
  );
}

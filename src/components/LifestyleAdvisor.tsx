"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import {
  Heart,
  CheckCircle,
  AlertCircle,
  Utensils,
  Activity,
  Moon,
  Pill,
  Hospital,
  Info,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { getT } from "@/lib/translations";
import { getLatestPersonalizedVisit } from "@/lib/visitAnalysis";

// ─── General lifestyle data ────────────────────────────────────────────────────

const GENERAL_TIPS_BN = [
  {
    id: "g1", category: "diet", icon: "🥗", priority: "high",
    title: "মিষ্টি ও তেলযুক্ত খাবার কমান",
    description: "প্রতিদিনের খাবারে শাকসবজি, ফল ও আঁশযুক্ত খাবার রাখুন। চিনি ও ভাজাপোড়া যত কম খাবেন ততই ভালো।",
  },
  {
    id: "g2", category: "exercise", icon: "🚶", priority: "high",
    title: "প্রতিদিন ৩০ মিনিট হাঁটুন",
    description: "সকালে বা বিকেলে ৩০ মিনিট হাঁটলে রক্তের সুগার, প্রেশার এবং কোলেস্টেরল নিয়ন্ত্রণে থাকে।",
  },
  {
    id: "g3", category: "sleep", icon: "😴", priority: "medium",
    title: "রাতে ৭-৮ ঘণ্টা ঘুমান",
    description: "নিয়মিত পর্যাপ্ত ঘুম না হলে হার্ট, ডায়াবেটিস ও মানসিক চাপের ঝুঁকি বাড়ে।",
  },
  {
    id: "g4", category: "diet", icon: "💧", priority: "medium",
    title: "দিনে ৮-১০ গ্লাস পানি পান করুন",
    description: "শরীর হাইড্রেটেড রাখা কিডনি সুরক্ষা করে, হজম ভালো রাখে এবং ত্বক সতেজ রাখে।",
  },
  {
    id: "g5", category: "medication", icon: "💊", priority: "high",
    title: "ডাক্তারের পরামর্শ ছাড়া ওষুধ খাবেন না",
    description: "নিজে নিজে antibiotic বা painkiller খাওয়া বিপজ্জনক হতে পারে। সবসময় ডাক্তারের পরামর্শ নিন।",
  },
  {
    id: "g6", category: "checkup", icon: "🏥", priority: "medium",
    title: "বছরে একবার সম্পূর্ণ স্বাস্থ্য পরীক্ষা করান",
    description: "CBC, ব্লাড সুগার, কোলেস্টেরল ও ব্লাড প্রেশার বছরে একবার check করা উচিত।",
  },
];

const GENERAL_TIPS_EN = [
  {
    id: "g1", category: "diet", icon: "🥗", priority: "high",
    title: "Reduce Sweets & Oily Food",
    description: "Include vegetables, fruits, and fiber in your daily diet. The less sugar and fried food you eat, the better.",
  },
  {
    id: "g2", category: "exercise", icon: "🚶", priority: "high",
    title: "Walk 30 Minutes Daily",
    description: "Walking 30 minutes in the morning or evening keeps blood sugar, pressure, and cholesterol under control.",
  },
  {
    id: "g3", category: "sleep", icon: "😴", priority: "medium",
    title: "Sleep 7-8 Hours at Night",
    description: "Regular adequate sleep reduces risks of heart disease, diabetes, and mental stress.",
  },
  {
    id: "g4", category: "diet", icon: "💧", priority: "medium",
    title: "Drink 8-10 Glasses of Water Daily",
    description: "Staying hydrated protects kidneys, aids digestion, and keeps skin refreshed.",
  },
  {
    id: "g5", category: "medication", icon: "💊", priority: "high",
    title: "Don't Take Medicine Without Doctor's Advice",
    description: "Self-medicating with antibiotics or painkillers can be dangerous. Always consult a doctor.",
  },
  {
    id: "g6", category: "checkup", icon: "🏥", priority: "medium",
    title: "Get a Full Health Checkup Annually",
    description: "CBC, blood sugar, cholesterol, and blood pressure should be checked once a year.",
  },
];

const categoryConfig = {
  diet: { icon: Utensils, color: "from-orange-400 to-amber-400", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  exercise: { icon: Activity, color: "from-green-400 to-emerald-400", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  sleep: { icon: Moon, color: "from-violet-400 to-purple-400", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  medication: { icon: Pill, color: "from-teal-400 to-cyan-400", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  checkup: { icon: Hospital, color: "from-blue-400 to-indigo-400", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

export default function LifestyleAdvisor() {
  const { language, visits, completedLifestyleCards, toggleLifestyleCard } = useAppStore();
  const router = useRouter();
  const t = getT(language);
  const tl = t.lifestyle;
  const isBn = language === "bn";
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Use the most recently updated visit with lifestyle directions
  const personalizedVisit = getLatestPersonalizedVisit(visits);
  const isPersonalized = !!personalizedVisit;

  // Build tips from personalized data if available, else use general
  const tips = (() => {
    if (isPersonalized && personalizedVisit?.lifestyleDirections) {
      const ld = personalizedVisit.lifestyleDirections;
      const items: typeof GENERAL_TIPS_BN = [];
      const dietItems = isBn ? (ld.dietBn || ld.diet) : (ld.dietEn || ld.diet);
      const exerciseItems = isBn ? (ld.exerciseBn || ld.exercise) : (ld.exerciseEn || ld.exercise);
      const medicationItems = isBn ? (ld.medicationBn || ld.medication) : (ld.medicationEn || ld.medication);
      const sleepText = isBn ? (ld.sleepBn || ld.sleep) : (ld.sleepEn || ld.sleep);
      const warningItems = isBn ? (ld.warningsBn || ld.warnings) : (ld.warningsEn || ld.warnings);

      dietItems?.forEach((d: string, i: number) => items.push({
        id: `p-diet-${i}`, category: "diet", icon: "🥗", priority: "high", title: d, description: "",
      }));
      exerciseItems?.forEach((e: string, i: number) => items.push({
        id: `p-exe-${i}`, category: "exercise", icon: "🚶", priority: "high", title: e, description: "",
      }));
      medicationItems?.forEach((m: string, i: number) => items.push({
        id: `p-med-${i}`, category: "medication", icon: "💊", priority: "medium", title: m, description: "",
      }));
      if (sleepText) items.push({
        id: "p-sleep-0", category: "sleep", icon: "😴", priority: "medium", title: sleepText, description: "",
      });
      warningItems?.forEach((w: string, i: number) => items.push({
        id: `p-warn-${i}`, category: "checkup", icon: "⚠️", priority: "high", title: w, description: "",
      }));
      return items.length > 0 ? items : (isBn ? GENERAL_TIPS_BN : GENERAL_TIPS_EN);
    }
    return isBn ? GENERAL_TIPS_BN : GENERAL_TIPS_EN;
  })();

  const filteredTips = activeFilter === "all" ? tips : tips.filter((c) => c.category === activeFilter);
  const completedCount = tips.filter((t) => completedLifestyleCards.includes(t.id)).length;
  const progressPct = Math.round((completedCount / tips.length) * 100);

  // Dynamic color based on progress
  const headerConfig = (() => {
    if (progressPct === 100) return {
      gradient: "from-emerald-500 to-green-500",
      shadow: "shadow-emerald-200",
      subText: "text-emerald-100",
      progressText: "text-emerald-100",
      emoji: "🎉",
      label: isBn ? "অসাধারণ! সব সম্পন্ন!" : "Amazing! All done!",
    };
    if (progressPct >= 60) return {
      gradient: "from-teal-500 to-cyan-500",
      shadow: "shadow-teal-200",
      subText: "text-teal-100",
      progressText: "text-teal-100",
      emoji: "💪",
      label: isBn ? "দারুণ চলছে!" : "Great going!",
    };
    if (progressPct >= 30) return {
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-200",
      subText: "text-amber-100",
      progressText: "text-amber-100",
      emoji: "🙌",
      label: isBn ? "ভালো শুরু!" : "Good start!",
    };
    return {
      gradient: "from-rose-500 to-pink-600",
      shadow: "shadow-rose-200",
      subText: "text-rose-200",
      progressText: "text-rose-200",
      emoji: "🌱",
      label: isBn ? "শুরু করুন!" : "Let's begin!",
    };
  })();

  const filterTabs = [
    { id: "all", label: tl.all },
    { id: "diet", label: tl.categories.diet },
    { id: "exercise", label: tl.categories.exercise },
    { id: "medication", label: tl.categories.medication },
    { id: "sleep", label: tl.categories.sleep },
    { id: "checkup", label: tl.categories.checkup },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Header — color changes with progress */}
      <div className={`bg-gradient-to-br ${headerConfig.gradient} rounded-2xl p-6 text-white shadow-lg ${headerConfig.shadow} transition-all duration-700`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{tl.title}</h2>
            <p className={`${headerConfig.subText} text-sm`}>{tl.subtitle}</p>
          </div>
        </div>
        <div className="bg-white/15 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <span>{headerConfig.emoji}</span>
              {isBn ? "আজকের অগ্রগতি" : "Today's Progress"}
            </span>
            <span className="text-xl font-black">{completedCount}/{tips.length}</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-3 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <p className={`${headerConfig.progressText} text-xs`}>{progressPct}% {tl.progress}</p>
            <p className={`${headerConfig.progressText} text-xs font-bold`}>{headerConfig.label}</p>
          </div>
        </div>
      </div>

      {/* Notice banner — personalized or general */}
      {isPersonalized ? (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-teal-700 text-sm mb-1">
                {isBn ? "✅ ব্যক্তিগত AI পরামর্শ" : "✅ Personalized AI Advice"}
              </p>
              <p className="text-teal-600 text-xs leading-relaxed">
                {isBn
                  ? `এই পরামর্শগুলো ${personalizedVisit?.doctorName ?? "আপনার ডাক্তার"}-এর ভিজিটের prescription ও lab report বিশ্লেষণ করে তৈরি।`
                  : `These tips are generated from your visit with ${personalizedVisit?.doctorName ?? "your doctor"}'s prescription & lab report.`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-blue-700 text-sm mb-1">
                {isBn ? "সাধারণ স্বাস্থ্য পরামর্শ" : "General Health Advice"}
              </p>
              <p className="text-blue-600 text-xs leading-relaxed">
                {isBn
                  ? "এখানে সাধারণ মানুষের জন্য সাধারণ স্বাস্থ্য পরামর্শ দেওয়া হচ্ছে। আপনার ব্যক্তিগত AI পরামর্শ পেতে Visit-এ prescription ও lab report scan করুন।"
                  : "These are general health tips for everyone. For personalized AI advice, scan your prescription & lab reports in a Visit."}
              </p>
              <button
                onClick={() => router.push("/visits")}
                className="mt-2 flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isBn ? "Visit-এ যান → AI পরামর্শ পান" : "Go to Visits → Get AI advice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filterTabs.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === filter.id
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-teal-300"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Tips Cards */}
      <div className="space-y-3">
        {filteredTips.map((card) => {
          const catConfig = categoryConfig[card.category as keyof typeof categoryConfig];
          const isCompleted = completedLifestyleCards.includes(card.id);
          const catLabel = tl.categories[card.category as keyof typeof tl.categories];
          const priorityLabel = tl.priority[card.priority as keyof typeof tl.priority];

          return (
            <div
              key={card.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border ${catConfig.border} transition-all ${
                isCompleted ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${catConfig.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}
                >
                  <span className="text-xl">{card.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4
                      className={`font-bold text-gray-800 text-sm ${
                        isCompleted ? "line-through" : ""
                      }`}
                    >
                      {card.title}
                    </h4>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        priorityColors[card.priority as keyof typeof priorityColors]
                      }`}
                    >
                      {priorityLabel}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    {card.description}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${catConfig.bg} ${catConfig.text}`}
                    >
                      {catLabel}
                    </span>
                    <button
                      onClick={() => toggleLifestyleCard(card.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        isCompleted
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600 hover:bg-teal-100 hover:text-teal-700"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {isCompleted ? tl.completed : tl.complete}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Personalized CTA */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-5 text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>
        <p className="font-bold text-gray-800 mb-1">
          {isBn ? "ব্যক্তিগত AI পরামর্শ পেতে চান?" : "Want personalized AI advice?"}
        </p>
        <p className="text-gray-500 text-sm mb-4">
          {isBn
            ? "ডাক্তারের ভিজিটের prescription ও lab report scan করুন। AI আপনার স্বাস্থ্য অনুযায়ী পরামর্শ দেবে।"
            : "Scan your doctor visit's prescription & lab reports. AI will give advice based on your health data."}
        </p>
        <button
          onClick={() => router.push("/visits")}
          className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors mx-auto"
        >
          <Sparkles className="w-4 h-4" />
          {isBn ? "Visit শুরু করুন" : "Start a Visit"}
        </button>
      </div>

      {/* Medical Disclaimer */}
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
        <div className="flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-700 text-sm mb-2">
              {isBn ? "⚕️ গুরুত্বপূর্ণ" : "⚕️ Important"}
            </h4>
            <p className="text-red-600 text-sm leading-relaxed font-medium">
              {isBn
                ? "এটা প্রাথমিক AI পরামর্শ, চিকিৎসকের পরামর্শ অপরিহার্য।"
                : "This is preliminary AI advisory. Doctor's consultation is mandatory."}
            </p>
            <p className="text-red-500 text-xs mt-1 leading-relaxed">
              {isBn
                ? "যেকোনো চিকিৎসা সিদ্ধান্ত নেওয়ার আগে একজন যোগ্য চিকিৎসকের সাথে পরামর্শ করুন।"
                : "Always consult a qualified physician before making any medical decisions."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

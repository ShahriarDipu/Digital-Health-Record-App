"use client";

import {
  CheckCircle,
  Share,
  PlusSquare,
  X,
  MoreVertical,
  Smartphone,
  Download,
  MonitorDown,
  ExternalLink,
} from "lucide-react";
import { getT } from "@/lib/translations";
import { usePwaInstall, type PwaInstallGuide } from "@/hooks/usePwaInstall";

interface PwaInstallBannerProps {
  language: "bn" | "en";
  variant?: "dashboard" | "landing";
}

function InstallGuideModal({
  guide,
  title,
  steps,
  closeLabel,
  onClose,
}: {
  guide: PwaInstallGuide;
  title: string;
  steps: { icon?: React.ReactNode; text: string }[];
  closeLabel: string;
  onClose: () => void;
}) {
  if (!guide) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={closeLabel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                {index + 1}
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-700 pt-1">
                {step.icon}
                <span>{step.text}</span>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}

export default function PwaInstallBanner({ language, variant = "dashboard" }: PwaInstallBannerProps) {
  const t = getT(language);
  const td = t.dashboard;
  const tl = t.landing;
  const { showBanner, activeGuide, install, dismissGuide, dismissBanner } = usePwaInstall();

  if (!showBanner) return null;

  const isLanding = variant === "landing";
  const closeLabel = td.installIosClose;

  const guideConfig =
    activeGuide === "ios"
      ? {
          title: td.installIosTitle,
          steps: [
            { icon: <Share className="w-5 h-5 text-indigo-600 flex-shrink-0" />, text: td.installIosStep1 },
            {
              icon: <PlusSquare className="w-5 h-5 text-indigo-600 flex-shrink-0" />,
              text: td.installIosStep2,
            },
            { text: td.installIosStep3 },
          ],
        }
      : activeGuide === "android"
        ? {
            title: td.installAndroidTitle,
            steps: [
              {
                icon: <MoreVertical className="w-5 h-5 text-indigo-600 flex-shrink-0" />,
                text: td.installAndroidStep1,
              },
              { text: td.installAndroidStep2 },
            ],
          }
        : activeGuide === "desktop"
          ? {
              title: td.installDesktopTitle,
              steps: [
                {
                  icon: <MonitorDown className="w-5 h-5 text-indigo-600 flex-shrink-0" />,
                  text: td.installDesktopStep1,
                },
                { text: td.installDesktopStep2 },
              ],
            }
          : activeGuide === "in-app"
            ? {
                title: td.installInAppTitle,
                steps: [
                  { text: td.installInAppStep1 },
                  {
                    icon: <ExternalLink className="w-5 h-5 text-indigo-600 flex-shrink-0" />,
                    text: td.installInAppStep2,
                  },
                ],
              }
            : null;

  const banner = isLanding ? (
    <section className="max-w-6xl mx-auto px-4 pb-16">
      <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-200/40 relative overflow-hidden">
        <button
          type="button"
          onClick={dismissBanner}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors z-10"
          aria-label={closeLabel}
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-teal-200 text-xs font-semibold uppercase tracking-wider mb-1">
              {tl.installBadge}
            </p>
            <h3 className="font-black text-xl sm:text-2xl mb-2">{tl.installTitle}</h3>
            <p className="text-teal-100 text-sm leading-relaxed">{tl.installDesc}</p>
          </div>
          <button
            type="button"
            onClick={install}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-teal-700 font-bold px-6 py-3.5 rounded-xl hover:bg-teal-50 active:scale-95 transition-all shadow-lg text-sm"
          >
            <Download className="w-5 h-5" />
            {tl.installBtn}
          </button>
        </div>
      </div>
    </section>
  ) : (
    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white flex items-center gap-4 relative">
      <button
        type="button"
        onClick={dismissBanner}
        className="absolute top-2 right-2 p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={closeLabel}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
        <CheckCircle className="w-7 h-7 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm mb-0.5">{td.installApp}</h4>
        <p className="text-indigo-200 text-xs leading-snug">{td.installAppDesc}</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="flex-shrink-0 bg-white text-indigo-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-indigo-50 active:scale-95 transition-all"
      >
        {td.install}
      </button>
    </div>
  );

  return (
    <>
      {banner}

      {guideConfig && (
        <InstallGuideModal
          guide={activeGuide}
          title={guideConfig.title}
          steps={guideConfig.steps}
          closeLabel={closeLabel}
          onClose={dismissGuide}
        />
      )}
    </>
  );
}

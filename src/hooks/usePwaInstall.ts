"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PwaInstallGuide = "ios" | "android" | "desktop" | "in-app" | null;

const BANNER_DISMISS_KEY = "pwa-banner-dismissed";

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|Snapchat/i.test(ua) ||
    (ua.includes("Android") && ua.includes("wv"))
  );
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return isIosDevice() || isAndroidDevice() || /Mobile/i.test(navigator.userAgent);
}

function pickInstallGuide(): PwaInstallGuide {
  if (isInAppBrowser()) return "in-app";
  if (isIosDevice()) return "ios";
  if (isAndroidDevice()) return "android";
  if (isMobileDevice()) return "android";
  return "desktop";
}

function readBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(BANNER_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeGuide, setActiveGuide] = useState<PwaInstallGuide>(null);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = isStandaloneMode();
    setIsStandalone(standalone);
    setBannerDismissed(readBannerDismissed());
    if (standalone) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
    };

    const onInstalled = () => {
      deferredPromptRef.current = null;
      setActiveGuide(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissGuide = useCallback(() => setActiveGuide(null), []);

  const dismissBanner = useCallback(() => {
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setBannerDismissed(true);
  }, []);

  const install = useCallback(() => {
    const prompt = deferredPromptRef.current;
    if (prompt) {
      prompt
        .prompt()
        .then(() => prompt.userChoice)
        .then(({ outcome }) => {
          if (outcome === "accepted") {
            deferredPromptRef.current = null;
            setIsStandalone(true);
          }
        })
        .catch(() => {
          setActiveGuide(pickInstallGuide());
        });
      return;
    }

    setActiveGuide(pickInstallGuide());
  }, []);

  return {
    showBanner: !isStandalone && !bannerDismissed,
    activeGuide,
    install,
    dismissGuide,
    dismissBanner,
  };
}

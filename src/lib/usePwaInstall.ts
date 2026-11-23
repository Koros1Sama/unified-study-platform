// ==============================================================================
// المنصة التعليمية الموحدة — خطاف تثبيت تطبيق الويب التقدمي (PWA Install Hook)
// Handles beforeinstallprompt, standalone detection, iOS Safari instructions.
// Zero Emojis Standard · 100% SVG Vector Line-Art
// ==============================================================================

import { useState, useEffect, useCallback } from "react";

export interface PwaInstallState {
  canInstall: boolean;
  hasNativePrompt: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isDesktop: boolean;
  showFirstOpenBanner: boolean;
  showGuideModal: boolean;
  promptInstall: () => Promise<boolean>;
  openGuideModal: () => void;
  closeGuideModal: () => void;
  dismissBanner: () => void;
}

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showFirstOpenBanner, setShowFirstOpenBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // فحص نوع الجهاز (iOS بما فيها iPadOS 13+ / Desktop / Android)
  const isIpadOs13Plus =
    typeof window !== "undefined" &&
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;

  const isIos =
    typeof window !== "undefined" &&
    ((/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !(window as any).MSStream) ||
      isIpadOs13Plus);

  const isDesktop =
    typeof window !== "undefined" &&
    !isIos &&
    !/iphone|ipad|ipod|android/i.test(window.navigator.userAgent);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("unified_pwa_banner_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => {
        setShowFirstOpenBanner(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowFirstOpenBanner(false);
      setShowGuideModal(false);
      localStorage.setItem("unified_pwa_banner_dismissed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const openGuideModal = useCallback(() => {
    setShowGuideModal(true);
  }, []);

  const closeGuideModal = useCallback(() => {
    setShowGuideModal(false);
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setShowFirstOpenBanner(false);
          setShowGuideModal(false);
          try {
            localStorage.setItem("unified_pwa_banner_dismissed", "true");
          } catch {
            // تجاهل أخطاء التخزين في أوضاع التصفح المقيدة
          }
          return true;
        }
        return false;
      } catch (err) {
        console.warn("PWA install error:", err);
        return false;
      } finally {
        setDeferredPrompt(null);
      }
    }
    setShowGuideModal(true);
    return false;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setShowFirstOpenBanner(false);
    localStorage.setItem("unified_pwa_banner_dismissed", "true");
  }, []);

  return {
    canInstall: !isInstalled,
    hasNativePrompt: Boolean(deferredPrompt),
    isInstalled,
    isIos,
    isDesktop,
    showFirstOpenBanner: showFirstOpenBanner && !isInstalled,
    showGuideModal,
    promptInstall,
    openGuideModal,
    closeGuideModal,
    dismissBanner
  };
}

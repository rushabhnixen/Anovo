"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { Share } from "@capacitor/share";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { ANOVO_WEB_URL, routeFromAnovoUrl } from "@/lib/mobile";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h5v-6h3v6h5V10" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6v5h-5M19 11a7.5 7.5 0 1 0 .2 5.4" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
    </svg>
  );
}

/**
 * Match the Android status bar to the active theme.
 *
 * The previous code pinned the background to white and the style to
 * `Style.Dark`. In Capacitor `Style.Dark` means "light content for a dark
 * background", so this painted white icons onto a white bar — invisible on any
 * device that honours both settings, in either theme.
 */
async function applyStatusBarTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  await Promise.allSettled([
    // slate-950, matching the dark <body> background.
    StatusBar.setBackgroundColor({ color: isDark ? "#020617" : "#ffffff" }),
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }),
  ]);
}

export default function MobileRuntime() {
  const router = useRouter();
  const pathname = usePathname();
  const [isNative, setIsNative] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const listenerHandles: PluginListenerHandle[] = [];
    setIsNative(true);
    document.body.classList.add("native-app");

    const register = async (listener: Promise<PluginListenerHandle>) => {
      const handle = await listener;
      if (active) listenerHandles.push(handle);
      else await handle.remove();
    };

    const initialize = async () => {
      const status = await Network.getStatus().catch(() => null);
      if (active && status) setIsOnline(status.connected);

      await Promise.all([
        register(Network.addListener("networkStatusChange", (nextStatus) => {
          if (active) setIsOnline(nextStatus.connected);
        })),
        register(CapacitorApp.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            void CapacitorApp.minimizeApp();
          }
        })),
        register(CapacitorApp.addListener("appUrlOpen", ({ url }) => {
          const route = routeFromAnovoUrl(url);
          if (route) router.push(route);
        })),
      ]);

      await Promise.allSettled([
        StatusBar.setOverlaysWebView({ overlay: false }),
        applyStatusBarTheme(),
        SplashScreen.hide(),
      ]);
    };

    void initialize().catch(() => {
      void SplashScreen.hide();
    });

    // ThemeToggle flips a class on <html>, so watch that rather than coupling
    // the two components. Without this the bar keeps the theme it booted with.
    const themeObserver = new MutationObserver(() => {
      if (active) void applyStatusBarTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      active = false;
      themeObserver.disconnect();
      document.body.classList.remove("native-app");
      for (const handle of listenerHandles) void handle.remove();
    };
  }, [router]);

  if (!isNative) return null;

  const tap = () => Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);

  const goHome = () => {
    void tap();
    router.push("/");
  };

  const reload = () => {
    void tap();
    window.location.reload();
  };

  const share = async () => {
    void tap();
    const url = `${ANOVO_WEB_URL}${pathname === "/" ? "" : pathname}`;
    await Share.share({
      title: "Anovo AI Writing Tool",
      text: "Write, rewrite, and humanize text with Anovo.",
      url,
      dialogTitle: "Share Anovo",
    }).catch(() => undefined);
  };

  return (
    <>
      {!isOnline && (
        <div className="native-offline-banner" role="status" data-testid="offline-banner">
          <span aria-hidden="true">●</span>
          You&apos;re offline. Reconnect to use Anovo&apos;s AI tools.
        </div>
      )}

      <nav className="native-toolbar" aria-label="App controls" data-testid="native-toolbar">
        <button type="button" onClick={goHome} aria-label="Go to Anovo home">
          <HomeIcon />
          <span>Home</span>
        </button>
        <button type="button" onClick={reload} aria-label="Reload current tool">
          <ReloadIcon />
          <span>Reload</span>
        </button>
        <button type="button" onClick={share} aria-label="Share Anovo">
          <ShareIcon />
          <span>Share</span>
        </button>
      </nav>
    </>
  );
}

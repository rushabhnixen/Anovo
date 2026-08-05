import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.soniqinfotech.anovo",
  appName: "Anovo",
  webDir: "out",
  backgroundColor: "#ffffff",
  loggingBehavior: "none",
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
    webContentsDebuggingEnabled: false,
    zoomEnabled: false,
  },
  ios: {
    allowsLinkPreview: false,
    backgroundColor: "#ffffff",
    preferredContentMode: "mobile",
    scrollEnabled: true,
  },
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: "#059669",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      // Capacitor's "DARK" means light content, which painted white icons onto
      // this white bar — invisible until MobileRuntime corrected it, and
      // permanently invisible if that init failed. "LIGHT" gives dark icons for
      // the light default; MobileRuntime switches both values in dark mode.
      style: "LIGHT",
      backgroundColor: "#ffffff",
      overlaysWebView: false,
    },
  },
};

export default config;

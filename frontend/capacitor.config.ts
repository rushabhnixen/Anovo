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
      style: "DARK",
      backgroundColor: "#ffffff",
      overlaysWebView: false,
    },
  },
};

export default config;

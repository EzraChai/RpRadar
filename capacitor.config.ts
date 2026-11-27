import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ezrachai.app",
  appName: "RpRadar",
  webDir: "dist",

  server: {
    url: "https://rpradar.vercel.app",
    cleartext: false,
  },

  android: {
    allowMixedContent: false,
  },

  plugins: {
    SystemBars: {
      insetsHandling: "css",
      hidden: false,
    },
  },
};

export default config;

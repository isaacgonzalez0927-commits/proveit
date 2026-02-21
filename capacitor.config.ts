import type { CapacitorConfig } from '@capacitor/cli';

const defaultDevServerUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "";
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? defaultDevServerUrl;
const usesInsecureHttp = /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(serverUrl);

const config: CapacitorConfig = {
  appId: 'com.proveit.app',
  appName: 'ProveIt',
  webDir: 'public',
  ...(serverUrl
    ? {
        server: {
          // For release builds, set CAPACITOR_SERVER_URL to your HTTPS production URL.
          // Cleartext traffic is only allowed for explicit local-network HTTP development URLs.
          url: serverUrl,
          cleartext: usesInsecureHttp,
        },
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;

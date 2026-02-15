import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.proveit.app',
  appName: 'ProveIt',
  webDir: 'public',
  server: {
    // Load from your deployed URL. Set this when you deploy (e.g. Vercel).
    // For local dev: use your computer's IP + :3000 (e.g. http://192.168.1.x:3000)
    // when testing on a physical device. Simulator can use http://localhost:3000
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;

# Capacitor / iOS Setup

ProveIt is configured for iOS via Capacitor. The app loads your web app from a URL (server mode).

## Quick start

1. **Run your app locally**
   ```bash
   npm run dev
   ```

2. **Sync and open iOS** (requires Mac with Xcode)
   ```bash
   npm run cap:sync
   npm run cap:open:ios
   ```
   The iOS Simulator will open and load `http://localhost:3000`.

3. **For production** – Deploy to Vercel (or any host), then update `capacitor.config.ts`:
   ```ts
   server: {
     url: 'https://your-app.vercel.app',
     cleartext: false,
   },
   ```

## Requirements

- **Mac with Xcode** – iOS builds only run on macOS
- **Apple Developer account** ($99/year) – for App Store submission

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Deploy (Vercel detects Next.js)
4. Copy your URL (e.g. `proveit.vercel.app`) and put it in `capacitor.config.ts` as `server.url`

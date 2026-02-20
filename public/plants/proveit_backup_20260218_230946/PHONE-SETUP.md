# Sign In on Your Phone

To use the app on your phone, the phone needs to reach your app over your Wi‑Fi (not localhost).

## Option 1: Use Your Computer's IP (same Wi‑Fi)

1. **Find your computer's IP**
   - Windows: open Command Prompt, run `ipconfig`, look for "IPv4 Address" (e.g. `192.168.1.5`)
   - Mac: System Preferences → Network → Wi‑Fi → Details

2. **Start the dev server**
   ```bash
   npm run dev
   ```
   It now listens on all interfaces (required for phone access).

3. **On your phone**
   - Connect to the same Wi‑Fi as your computer
   - Open a browser and go to: `http://YOUR_IP:3000` (e.g. `http://192.168.1.5:3000`)

4. **Supabase redirect URLs**
   - Supabase Dashboard → Authentication → URL Configuration
   - Add to **Redirect URLs**: `http://YOUR_IP:3000/api/auth/callback`
   - Example: `http://192.168.1.5:3000/api/auth/callback`
   - You may need to add this again if your IP changes

5. **Google OAuth**
   - Google often doesn't accept raw IPs for authorized domains
   - For Google Sign-In on your phone, **Option 2 (deploy)** is more reliable

## Option 2: Deploy (recommended)

Deploy to Vercel so you always use the same URL:

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo → Deploy
3. You’ll get a URL like `proveit.vercel.app`
4. **Supabase** → Redirect URLs: add `https://proveit.vercel.app/api/auth/callback`
5. **Supabase** → Site URL: set to `https://proveit.vercel.app`
6. **Google OAuth** → Authorized domains: add `proveit.vercel.app`
7. **Capacitor** → Edit `capacitor.config.ts`, set `server.url` to `https://proveit.vercel.app`

Sign‑in and OAuth will then work on any device.

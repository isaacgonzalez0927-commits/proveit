# Using proveit-goals.com

ProveIt’s production domain is **https://proveit-goals.com**. Do these once so auth and links work.

## 1. Vercel (where the app is hosted)

1. Go to [vercel.com](https://vercel.com) → your ProveIt project → **Settings** → **Domains**.
2. Click **Add** and enter **only**: `proveit-goals.com`  
   - No `http://` or `https://`  
   - No trailing slash  
   - No `www.` (add www separately if you want it)
3. Vercel will show DNS records. At your domain registrar (where you bought proveit-goals.com):
   - **Root domain (`@` or `proveit-goals.com`)**: **A** record → `76.76.21.21`
   - **www**: **CNAME** record → `cname.vercel-dns.com`
4. Wait for DNS to propagate (minutes to a few hours). Vercel will issue HTTPS automatically.

Optional: add `www.proveit-goals.com` in Vercel too and set it to redirect to `proveit-goals.com`.

### If Vercel shows "Invalid Configuration"

- **DNS conflict**: Remove any other **A** or **CNAME** for the root or www (e.g. registrar parking page, old host). Only the Vercel A and CNAME above should point the domain.
- **CAA records**: Delete **CAA** records at the registrar (they can block Vercel’s SSL provider).
- **DNSSEC**: If your registrar has **DNSSEC** on, try turning it off, or use [Vercel nameservers](https://vercel.com/docs/concepts/projects/domains/working-with-nameservers) so Vercel manages DNS.
- **Where to add the domain**: Make sure you’re in **Project** → **Settings** → **Domains** (not Team or Account domains if that’s different for your plan).

## 2. Supabase (auth)

1. **Supabase Dashboard** → your project → **Authentication** → **URL Configuration**.
2. **Site URL**: set to `https://proveit-goals.com`.
3. **Redirect URLs**: add `https://proveit-goals.com/api/auth/callback` (and keep `http://localhost:3000/api/auth/callback` for local dev).

Save. After that, sign-up and sign-in will redirect correctly on the live site.

## 3. iOS app (Capacitor)

For the native iOS build to load the web app from your domain:

- When building for production, set the env var:  
  `CAPACITOR_SERVER_URL=https://proveit-goals.com`  
  then run your build (e.g. `npx cap sync ios` and archive in Xcode),  
  **or**
- In `capacitor.config.ts`, set `server.url` to `https://proveit-goals.com` for release builds.

Then the iOS app will use https://proveit-goals.com instead of the Vercel default URL.

---

**Quick links (already used in the app and APP_STORE.md):**

- Privacy: https://proveit-goals.com/privacy  
- Terms: https://proveit-goals.com/terms  
- Support: https://proveit-goals.com/support  

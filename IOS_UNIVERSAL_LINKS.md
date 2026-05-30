# iOS Universal Links (open proveit-goals.com in the app)

When someone taps a link like `https://proveit-goals.com/join/ABC123`, iOS can open the **Proveit app** instead of Safari — if the app is installed and Universal Links are configured.

## One-time setup

### 1. Vercel environment variable

1. [Apple Developer](https://developer.apple.com/account) → **Membership** → copy your **Team ID** (10 characters).
2. Vercel → Project → **Settings** → **Environment Variables** → add for **Production**:
   - `APPLE_TEAM_ID` = your Team ID (e.g. `AB12CD34EF`)
3. **Redeploy** so the association file is live.

Verify in a browser:

- `https://proveit-goals.com/.well-known/apple-app-site-association`  
  Should return JSON with your `appID` (`TEAMID.com.proveit.app`), not a 503.

### 2. Apple Developer — App ID capability

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → your app id **`com.proveit.app`**
2. Enable **Associated Domains** → Save.

### 3. Xcode — rebuild the iOS app

The repo includes `applinks:proveit-goals.com` in `ios/App/App/App.entitlements`.

```bash
export CAPACITOR_SERVER_URL=https://proveit-goals.com
npm run cap:sync
npm run cap:open:ios
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → confirm **Associated Domains** shows `applinks:proveit-goals.com`.
2. Archive and upload a new build to TestFlight / App Store.

Install the new build on a device. Universal Links do **not** apply to old builds that were signed before this capability was added.

### 4. Test on a real iPhone

1. Create a buddy goal and copy the invite link.
2. Send it to yourself in **Messages** (not Notes — long-press should show “Open in Proveit”).
3. Tap the link → Proveit should open on `/join/...`.

If it still opens Safari:

- Delete the app, reinstall from TestFlight.
- Wait a few minutes after deploy (Apple caches the association file).
- Confirm `APPLE_TEAM_ID` matches the team that signed the app.

## What links open the app

- `/join/*` — buddy invites
- `/friends`, `/dashboard`, `/buddy`, `/goals/*`, `/settings`, `/pricing`
- `/api/auth/callback` — email confirmation / OAuth return

## Notes

- The website must stay live (`proveit-goals.com`); the app loads it in a WebView.
- Friends **without** the app still use the same link in the browser to sign up and join.
- Android “App Links” are not configured yet; links open in Chrome until added separately.

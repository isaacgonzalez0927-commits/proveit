# Publish Proveit to the App Store

Everything in the repo is wired for release. You only need Apple Developer setup, one build upload, and App Store Connect metadata.

**Quick path:** complete [One-time Apple setup](#one-time-apple-setup) → [Build & upload](#build--upload-testflight) → [App Store Connect](#app-store-connect-metadata) → [Submit for review](#submit-for-review).

In-app checklist (privacy, terms, account deletion): [APP_STORE.md](./APP_STORE.md).  
Home screen widgets: [IOS_WIDGETS.md](./IOS_WIDGETS.md).

---

## What’s already in the app

| Feature | Notes |
|--------|--------|
| Native shell | Capacitor loads `https://proveit-goals.com` (same account & Stripe plan as web) |
| Local notifications | Daily goal reminders when the app is closed (iOS/Android) |
| Widgets | Streak, today’s goals, garden (WidgetKit) |
| Universal links | `https://proveit-goals.com/...` opens in app |
| Privacy / Terms / Support | Linked in Settings and signup |
| Account deletion | Settings → Delete account |
| Export compliance | `ITSAppUsesNonExemptEncryption` = false in Info.plist |

---

## One-time Apple setup

Do this once in [Apple Developer](https://developer.apple.com/account):

### 1. App IDs

| Identifier | Capabilities |
|------------|----------------|
| `com.proveit.app` | App Groups, Associated Domains |
| `com.proveit.app.ProveitWidget` | App Groups |

- **App Group:** `group.com.proveit.app` (both IDs)
- **Associated Domains:** `applinks:proveit-goals.com` (main app only; already in `ios/App/App/App.entitlements`)

### 2. App Store Connect app

1. [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → New App  
2. **Platform:** iOS  
3. **Name:** Proveit  
4. **Bundle ID:** `com.proveit.app`  
5. **SKU:** e.g. `proveit-ios-1`

### 3. Signing (choose one)

**A — Codemagic (no Mac):** Connect repo, add App Store Connect API key, enable iOS code signing for `com.proveit.app` (widget extension signs with same team). See [codemagic.yaml](./codemagic.yaml).

**B — Mac + Xcode:** Download **Apple Distribution** cert + **App Store** profiles for both bundle IDs, or use **Automatically manage signing** in Xcode.

---

## Build & upload (TestFlight)

### Option A — Codemagic (recommended if you don’t use Xcode)

1. Sign up at [codemagic.io](https://codemagic.io) and connect this GitHub repo.  
2. **Team settings → Integrations → App Store Connect** — add API key (App Manager).  
3. **Code signing** — upload cert/profile or use automatic signing for `com.proveit.app`.  
4. Run workflow **`ios-release`** (or push to `main` if triggering is enabled).  
5. When the build finishes, open **TestFlight** in App Store Connect and add yourself as an internal tester.

### Option B — Mac + Xcode

```bash
npm run cap:ios:release   # syncs iOS with production URL
npm run cap:open:ios
```

In Xcode:

1. Select **App** scheme, **Any iOS Device (arm64)**.  
2. **Product → Archive**.  
3. **Distribute App → App Store Connect → Upload**.  
4. Wait for processing in **TestFlight** (~5–15 min).

### Test on a real iPhone

Install via TestFlight, then verify:

- [ ] Sign up / log in (same email as web works)  
- [ ] Create a goal, submit proof (camera)  
- [ ] Allow notifications → receive reminder next day (or temporarily set reminder time to 1–2 min ahead)  
- [ ] Pro subscription: pay on web or in-app flow; Settings → **Restore subscription** if needed  
- [ ] Settings → Delete account (sandbox test user only)  
- [ ] Add a home screen widget (see [IOS_WIDGETS.md](./IOS_WIDGETS.md))

---

## App Store Connect metadata

Copy/paste friendly defaults:

### URLs

| Field | Value |
|-------|--------|
| Privacy Policy | `https://proveit-goals.com/privacy` |
| Terms of Use | `https://proveit-goals.com/terms` |
| Support URL | `https://proveit-goals.com/support` |
| Marketing URL (optional) | `https://proveit-goals.com` |

### Description (starter)

> Proveit helps you stick to your goals with photo proof, streaks, and optional AI verification. Set weekly or daily targets, get reminders, track progress on your dashboard, and share accountability with a buddy. Subscriptions unlock Pro features on web and in the app with one account.

Adjust tone to match your marketing site.

### Keywords (example)

`goals,habits,accountability,streak,proof,productivity,fitness,self improvement`

### Category

**Health & Fitness** or **Productivity** (pick one primary).

### Age rating

Complete the questionnaire — likely **4+** (no unrestricted web, user-generated photos).

### App Privacy (nutrition labels)

Declare roughly:

- **Contact info** — email (account)  
- **User content** — goals, proof photos (app functionality, not used for tracking)  
- **Identifiers** — account ID  
- **Tracking** — No  

Match what users actually submit in the app.

### Screenshots

Required sizes (use iPhone screenshots from TestFlight build):

- 6.7" (iPhone 15 Pro Max class)  
- 6.5" or 5.5" if Apple still asks for legacy size in your region  

Use real UI — dashboard, goal submit, settings. No placeholder lorem ipsum.

### Review notes (optional)

> Test account: [provide email/password for a sandbox or demo account]  
> The app loads our production web app inside a native shell; subscriptions are managed via Stripe on proveit-goals.com. Camera is used only for goal proof photos.

---

## Submit for review

1. App Store Connect → your app → **App Store** tab.  
2. **+ Version** (e.g. 1.0.0) — must match `MARKETING_VERSION` in Xcode (`1.0` today).  
3. Select the TestFlight build.  
4. Fill export compliance: **No** custom encryption (already declared in Info.plist).  
5. **Add for Review** → **Submit**.

Apple usually reviews in 24–48 hours.

---

## Version bumps (updates)

1. In Xcode, increase **Version** (`MARKETING_VERSION`) and **Build** (`CURRENT_PROJECT_VERSION`) for **App** and **ProveitWidget** targets.  
2. `npm run cap:ios:release`  
3. Archive / Codemagic build → upload → new TestFlight → submit update.

Web-only changes on `proveit-goals.com` do **not** require a new App Store build unless you change native code, entitlements, or `CAPACITOR_SERVER_URL`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| White screen in app | Confirm `CAPACITOR_SERVER_URL=https://proveit-goals.com` before `cap sync`; site must be up with valid HTTPS |
| Notifications don’t fire | Settings → Proveit → Notifications ON; open app once after allowing; check goal has reminders enabled |
| Widget “Sign in” | Open app logged in once to sync |
| Pro plan missing | Same email as Stripe; Settings → **Restore subscription** with receipt email |
| Codemagic signing fails | Register widget bundle ID; enable App Group on both IDs; refresh profiles |
| Associated links don’t open app | Host `apple-app-site-association` on `proveit-goals.com` (verify in Apple’s CDN tool) |

---

## Files reference

| Path | Purpose |
|------|---------|
| `capacitor.config.ts` | App ID, plugins, optional dev server URL |
| `scripts/cap-ios-release.sh` | Production sync before archive |
| `codemagic.yaml` | CI build + TestFlight upload |
| `ios/` | Xcode project + widgets |
| `src/lib/nativeLocalNotifications.ts` | Daily local reminders |
| `src/components/NativeNotificationSync.tsx` | Sync + tap → submit proof |

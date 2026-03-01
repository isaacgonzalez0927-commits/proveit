# App Store submission checklist (ProveIt)

Use this when submitting ProveIt to the Apple App Store. The app already includes the in-app requirements below; use App Store Connect for metadata and build upload.

## In-app (already done)

- **Privacy Policy** – [/privacy](https://your-domain.com/privacy) — linked in Settings, Header, Footer, and before signup
- **Terms of Use** – [/terms](https://your-domain.com/terms) — linked in Settings, Header, Footer, and before signup
- **Support URL** – [/support](https://your-domain.com/support) — contact email and links; use as **Support URL** in App Store Connect
- **Account deletion** – Settings → Delete account (required when app has accounts)
- **Consent before signup** – “By creating an account you agree to our Privacy Policy and Terms of Use”
- **iOS permission strings** – Camera and Photo Library usage descriptions in `ios/App/App/Info.plist`

## App Store Connect

1. **App information**
   - **Privacy Policy URL**: `https://your-production-domain.com/privacy`
   - **Support URL**: `https://your-production-domain.com/support`
   - **Category**: e.g. Health & Fitness or Productivity
   - **Age rating**: Complete the questionnaire (likely 4+)

2. **App Privacy (nutrition labels)**
   - Declare data collection: account (email), goals, proof submissions, optional photo verification
   - Indicate if data is used for tracking (e.g. no, for app functionality only)

3. **Screenshots**
   - iPhone 6.7" and 5.5" (required)
   - Real app UI only; no placeholder or mockup text

4. **Build**
   - From Xcode/Capacitor: archive and upload, or use CI
   - As of 2025: build with Xcode 16+ / iOS 18 SDK for new submissions

5. **TestFlight**
   - Test the build before submitting for review

## Quick reference URLs (replace with your domain)

| Field             | URL                                      |
|-------------------|------------------------------------------|
| Privacy Policy    | `https://YOUR_DOMAIN/privacy`            |
| Terms of Use      | `https://YOUR_DOMAIN/terms`              |
| Support           | `https://YOUR_DOMAIN/support`            |

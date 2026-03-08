# App Store submission checklist (Proveit)

Use this when submitting Proveit to the Apple App Store. The app already includes the in-app requirements below; use App Store Connect for metadata and build upload.

## In-app (already done)

- **Privacy Policy** – [proveit-goals.com/privacy](https://proveit-goals.com/privacy) — linked in Settings, Header, Footer, and before signup
- **Terms of Use** – [proveit-goals.com/terms](https://proveit-goals.com/terms) — linked in Settings, Header, Footer, and before signup
- **Support URL** – [proveit-goals.com/support](https://proveit-goals.com/support) — contact email and links; use as **Support URL** in App Store Connect
- **Account deletion** – Settings → Delete account (required when app has accounts)
- **Consent before signup** – “By creating an account you agree to our Privacy Policy and Terms of Use”
- **iOS permission strings** – Camera and Photo Library usage descriptions in `ios/App/App/Info.plist`

## App Store Connect

1. **App information**
   - **Privacy Policy URL**: `https://proveit-goals.com/privacy`
   - **Support URL**: `https://proveit-goals.com/support`
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

5. **TestFlight (test before submitting)**
   - In Xcode: Product → Archive. Then Distribute App → App Store Connect → Upload.
   - In App Store Connect: go to your app → TestFlight. Wait for the build to process.
   - Add internal testers (your Apple ID or team) or external testers (up to 10,000).
   - Install the TestFlight app on your iPhone; accept the invite and install Proveit.
   - Test signup, goals, proof photo, and notifications on a real device. Fix any crashes or broken flows.
   - When stable, submit the build from App Store Connect for App Review (same build can be promoted to production).

6. **Before you submit for review**
   - [ ] Privacy Policy and Support URLs work and are linked in the app.
   - [ ] Account deletion works (Settings → Delete account).
   - [ ] TestFlight build tested on at least one real device.
   - [ ] Screenshots and description match the app; no placeholder text.

## Quick reference URLs

| Field             | URL                                      |
|-------------------|------------------------------------------|
| Privacy Policy    | `https://proveit-goals.com/privacy`      |
| Terms of Use      | `https://proveit-goals.com/terms`        |
| Support           | `https://proveit-goals.com/support`      |

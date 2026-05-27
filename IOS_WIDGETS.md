# iOS Home Screen Widgets (Duolingo-style)

Proveit includes three **WidgetKit** widgets for the native iOS app (Capacitor):

| Widget | Size | Shows |
|--------|------|--------|
| **Streak** | Small | Best streak + top goal |
| **Today's goals** | Medium | Proved today (e.g. 2/3) + ring progress |
| **Goal garden** | Large | Watered plants, active goals, top streak |

Widgets update when you use the app (goals, proofs, streaks sync automatically).

---

## One-time Apple Developer setup

1. Open [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Select **com.proveit.app** (main app)
3. Enable **App Groups** → add `group.com.proveit.app`
4. Create a new App ID **com.proveit.app.ProveitWidget** (Widget Extension) with the same App Group
5. In Xcode, ensure both targets use the entitlements files:
   - `ios/App/App/App.entitlements`
   - `ios/ProveitWidget/ProveitWidget.entitlements`

---

## Build on your Mac

```bash
# Production URL for the native shell
export CAPACITOR_SERVER_URL=https://proveit-goals.com

npm run cap:sync
npm run cap:open:ios
```

In Xcode:

1. Select the **App** scheme
2. Build & run on a **physical iPhone** (widgets work best on device)
3. On the home screen: long-press → **Edit Home Screen** → **+** → search **Proveit**
4. Add **Streak**, **Today's goals**, or **Goal garden**

---

## How sync works

1. The web app builds a JSON snapshot (`src/lib/widgetSnapshot.ts`)
2. `WidgetSync` pushes it to native code via the **WidgetBridge** Capacitor plugin
3. Data is stored in the shared App Group (`group.com.proveit.app`)
4. WidgetKit reloads timelines (~every 30 min, or immediately after app use)

Tapping a widget opens the app via `proveit://dashboard` or `proveit://buddy`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Widget shows “Sign in” | Open the app while logged in once to sync |
| Widget missing in gallery | Rebuild App target; confirm extension is embedded |
| App Group error in Xcode | Enable App Groups on both bundle IDs in Developer portal |
| Data stale | Background the app after proving a goal (triggers sync) |

---

## Files

- `ios/Shared/ProveitWidgetData.swift` — shared snapshot model
- `ios/App/App/WidgetBridgePlugin.swift` — Capacitor bridge
- `ios/ProveitWidget/` — WidgetKit extension (SwiftUI)
- `src/components/WidgetSync.tsx` — web → native sync

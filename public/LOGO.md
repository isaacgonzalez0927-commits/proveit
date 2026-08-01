# Brand mark usage

The real logo mark image is **only** for:

1. **Homescreen / PWA / favicon** surfaces (Add to Home Screen, apple-touch, browser tab)
2. **Startup animation** (`IntroSplash`) — shows `/icon.png`

In-app chrome (header, loading, pricing, onboarding slides, settings, etc.) uses the **text name “Proveit” only** — no Lucide sprout mark, no inline SVG brand glyph, no logo PNG.

## Files

| Path | Size | Use |
|------|------|-----|
| `public/icon.png` | 512×512 | Favicon / general app icon + splash |
| `public/apple-icon.png` | 180×180 | iOS home screen / apple-touch-icon |
| `public/favicon-32.png` | 32×32 | Browser tab favicon |
| `public/icons/icon-192.png` | 192×192 | PWA manifest |
| `public/icons/icon-512.png` | 512×512 | PWA maskable |
| `ios/.../AppIcon-512@2x.png` | 1024×1024 | Capacitor / Xcode App Icon |

Brand colors from the mark: navy `#050A18`, lime `#7CFF01`.

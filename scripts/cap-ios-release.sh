#!/usr/bin/env sh
# Sync iOS native project for App Store / TestFlight (loads production web app).
set -e
cd "$(dirname "$0")/.."

export CAPACITOR_SERVER_URL="${CAPACITOR_SERVER_URL:-https://proveit-goals.com}"
echo "→ CAPACITOR_SERVER_URL=$CAPACITOR_SERVER_URL"

npm run cap:sync

echo ""
echo "Next steps (pick one):"
echo "  Mac + Xcode:  npm run cap:open:ios  → Product → Archive → Distribute App"
echo "  Cloud CI:     push to main and run the ios-release workflow in Codemagic"
echo ""
echo "Full checklist: APP_STORE_PUBLISH.md"

#!/usr/bin/env sh
# pf = push and deploy: stage all, commit (if changes), push. Production deploys from Git (Vercel auto-deploy)
# so env vars (e.g. Supabase) are always applied. Running vercel --prod from CLI can create a second deploy
# that sometimes doesn't get the same env vars and breaks sign-in.
set -e
MSG="${1:-pf}"
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit, pushing..."
else
  git commit -m "$MSG"
fi
git push
echo "Done. Vercel will deploy from Git; production uses your project env vars."

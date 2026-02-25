#!/usr/bin/env sh
# pf = push and deploy: stage all, commit (if changes), push, then deploy to Vercel prod.
set -e
MSG="${1:-pf}"
git add -A
if git diff --cached --quiet; then
  echo "No changes to commit, pushing and deploying..."
else
  git commit -m "$MSG"
fi
git push
npx vercel --prod --yes --scope isaacs-projects-94fcf528

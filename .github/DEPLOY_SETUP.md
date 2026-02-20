# Deploy to Vercel

## Option 1: Vercel Git Integration (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repo: `isaacgonzalez0927-commits/proveit`
4. Vercel will auto-deploy on every push to the same production URL

No extra setup needed.

---

## Option 2: GitHub Actions (if Git integration isn't working)

Add these secrets to your GitHub repo: **Settings** → **Secrets and variables** → **Actions**

| Secret | Where to get it |
|--------|-----------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) — Create a new token |
| `VERCEL_ORG_ID` | Vercel project **Settings** → **General** → scroll to "Project ID" section, or run `vercel link` and check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same as above in `.vercel/project.json` |

After adding the secrets, every push will trigger the deploy workflow to **production**.

- Pushes to any branch deploy to the same production URL
- The latest deployment link is shown in:
  - the workflow run summary, and
  - pull request comments/deployment status (when a PR exists)

If secrets are missing, the workflow falls back to Vercel Git Integration and still prints the latest URL for the commit in the run summary.

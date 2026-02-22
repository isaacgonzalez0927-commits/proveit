# ProveIt

**Set a goal. Take a photo. Prove it.**

ProveIt sends you reminders for daily and weekly goals. You take a photo of yourself doing the goal, and AI verifies you actually did it.

## Features

- **Daily & weekly goals** with reminders (browser notifications)
- **Photo proof** via camera or file upload
- **AI verification** (OpenAI GPT-4 Vision when `OPENAI_API_KEY` is set; otherwise demo mode)
- **Streaks** and recent activity
- **Plans**: Free (2 daily + 2 weekly), Pro ($4.99/mo – unlimited goals + Goal Gallery + theme colors)
- **In-app account deletion** (Settings → Delete account)
- **Legal pages**: Privacy Policy and Terms of Use

## Quick start

```bash
cd proveit
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with any email (demo; no password). Add goals, submit a photo, and see AI verification in action.

On macOS Catalina? Use the recovery checklist in [MACOS-10.15-SETUP.md](./MACOS-10.15-SETUP.md).

## AI verification

Priority: Custom AI → OpenAI → Demo mode.

- **Custom AI**: Set `CUSTOM_AI_VERIFY_URL` in `.env.local` to your friend's API. It must accept POST with `{ imageBase64, goalTitle, goalDescription }` and return `{ verified: boolean, feedback: string }`. Optionally set `CUSTOM_AI_API_KEY` for auth headers.
- **OpenAI**: Set `OPENAI_API_KEY` in `.env.local`. Uses GPT-4 Vision.
- **Without either**: Demo mode (random pass/fail for testing).

## Account deletion (Supabase)

To enable in-app account deletion for Supabase users, set:

- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

The app uses this key from `/api/account` to permanently delete the authenticated user account.

## Pricing (demo)

- **Free**: 2 daily goals, 2 weekly goals, AI verification, reminders, streak tracking.
- **Pro** ($4.99/mo or $49/year): Unlimited daily/weekly goals, Goal Gallery access, gallery display controls, custom reminders, flexible grace period, post-creation plant style edits, Goal Break mode (freeze streak/growth), and extra theme colors.

In production, wire paid plans to Stripe (or your payment provider) using the plan IDs in `src/types/index.ts`.

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS, Lucide icons
- Client-side state + `localStorage` (no backend required for demo)
- Optional: OpenAI API for real image verification

## Project structure

- `src/app/` – Pages (home, dashboard, goals, submit proof, pricing)
- `src/app/privacy/page.tsx` – Privacy policy
- `src/app/terms/page.tsx` – Terms of use
- `src/components/` – Header, notification prompt, notification scheduler
- `src/context/AppContext.tsx` – Global state (user, goals, submissions)
- `src/lib/store.ts` – Local storage helpers and plan limits
- `src/app/api/verify/route.ts` – AI verification endpoint

Enjoy proving it.

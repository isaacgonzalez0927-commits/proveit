# ProveIt

**Set a goal. Take a photo. Prove it.**

ProveIt sends you reminders for daily and weekly goals. You take a photo of yourself doing the goal, and AI verifies you actually did it.

## Features

- **Daily & weekly goals** with reminders (browser notifications)
- **Photo proof** via camera or file upload
- **AI verification** (OpenAI GPT-4 Vision when `OPENAI_API_KEY` is set; otherwise demo mode)
- **Streaks** and recent activity
- **Plans**: Free (2 daily + 2 weekly), Pro ($4.99/mo – 5 each + Goal History), Premium ($9.99/mo – unlimited goals + all Pro features)

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

## Pricing (demo)

- **Free**: 2 daily goals, 2 weekly goals, AI verification, reminders, streak tracking.
- **Pro** ($4.99/mo or $49/year): 5 daily, 5 weekly, Goal History access, history display controls, custom reminders, flexible grace period.
- **Premium** ($9.99/mo or $99/year): Unlimited daily + weekly goals and all Pro features.

In production, wire paid plans to Stripe (or your payment provider) using the plan IDs in `src/types/index.ts`.

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript
- Tailwind CSS, Lucide icons
- Client-side state + `localStorage` (no backend required for demo)
- Optional: OpenAI API for real image verification

## Project structure

- `src/app/` – Pages (home, dashboard, goals, submit proof, pricing)
- `src/components/` – Header, notification prompt, notification scheduler
- `src/context/AppContext.tsx` – Global state (user, goals, submissions)
- `src/lib/store.ts` – Local storage helpers and plan limits
- `src/app/api/verify/route.ts` – AI verification endpoint

Enjoy proving it.
